import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { supabase, TABLES } from './supabase.js';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
const app = express();
app.use(cors({ origin: '*'}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[BODY] ${req.url}:`, JSON.stringify(req.body));
  }
  next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*'}
});

const emitAdminUpdate = (payload) => {
  try {
    io.to('admins').emit('admin:update', { ...payload, ts: new Date().toISOString() });
  } catch {}
};

const emitNgoUpdate = ({ ngoId, ...payload } = {}) => {
  try {
    if (ngoId) {
      io.to(`ngo:${ngoId}`).emit('ngo:update', { ngoId, ...payload, ts: new Date().toISOString() });
      return;
    }
    io.to('ngos').emit('ngo:update', { ...payload, ts: new Date().toISOString() });
  } catch {}
};

// In-memory presence and session routing
const onlineVolunteers = new Map(); // volunteerId -> socketId
const sessions = new Map(); // conversationId -> { seniorId, volunteerId }
const userSockets = new Map(); // userId -> socketId
const pushTokens = new Map(); // userId -> expoPushToken
const pendingRequests = new Map(); // seniorId -> { status: 'pending'|'claimed', volunteerId?: string }

// ----- Site mail OTP helpers -----
// In-memory OTP store: email -> { code, expiresAt }
const otpStore = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});
const FROM_ADDRESS = process.env.SMTP_FROM || 'SaathiCircle <no-reply@saathicircle.local>';

const sendOtpEmail = async (to, code, name) => {
  const html = `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111">
    <h2 style="margin:0 0 8px">Welcome to SaathiCircle</h2>
    <p style="margin:0 0 16px">${name ? `Hi ${name},` : 'Hello,'} use the code below to sign in.</p>
    <div style="font-size:32px; letter-spacing:8px; font-weight:700; background:#f5f5f5; padding:12px 16px; border-radius:8px; display:inline-block">${code}</div>
    <p style="margin:16px 0 0; color:#555">This code expires in 10 minutes. If you didn’t request this, you can ignore this email.</p>
  </div>`;
  await transporter.sendMail({ from: FROM_ADDRESS, to, subject: 'Your SaathiCircle Sign-in Code', html });
};

const sendWelcomeEmail = async (to, name) => {
  const html = `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111">
    <h2 style="margin:0 0 8px">Welcome to SaathiCircle</h2>
    <p style="margin:0 0 12px">${name ? `Hi ${name},` : 'Hello,'} we're excited to have you on board.</p>
    <p style="margin:0 0 0; color:#555">Connect, care, and build companionship. We're here for you.</p>
  </div>`;
  await transporter.sendMail({ from: FROM_ADDRESS, to, subject: 'Welcome to SaathiCircle', html });
};

// Helpers
const createConversation = async (seniorId, volunteerId) => {
  const { data, error } = await supabase
    .from(TABLES.CONVERSATIONS)
    .insert({ senior_id: seniorId, companion_id: volunteerId })
    .select()
    .single();
  if (error) throw error;
  return data; // contains id
};

const isVolunteerBusy = (volunteerId) => {
  for (const session of sessions.values()) {
    if (session?.volunteerId === volunteerId) return true;
  }
  return false;
};

const startSession = async ({ seniorId, volunteerId, req }) => {
  const existing = pendingRequests.get(seniorId);
  if (!existing || existing.status !== 'pending') return null;

  pendingRequests.set(seniorId, {
    status: 'claimed',
    volunteerId,
    requestType: existing.requestType,
    note: existing.note,
  });

  try {
    const conversation = await createConversation(seniorId, volunteerId);
    const convRoom = `conv:${conversation.id}`;
    sessions.set(conversation.id, { seniorId, volunteerId });

    const seniorSocketId = userSockets.get(seniorId);
    const volunteerSocketId = userSockets.get(volunteerId) || onlineVolunteers.get(volunteerId);
    if (seniorSocketId) io.sockets.sockets.get(seniorSocketId)?.join(convRoom);
    if (volunteerSocketId) io.sockets.sockets.get(volunteerSocketId)?.join(convRoom);

    const { requestType = 'chat', note = '' } = req || existing || {};
    const startedPayload = { conversationId: conversation.id, seniorId, volunteerId, requestType, note };
    if (seniorSocketId) io.to(seniorSocketId).emit('session:started', startedPayload);
    if (volunteerSocketId) io.to(volunteerSocketId).emit('session:started', startedPayload);

    try {
      await supabase.from(TABLES.HELP_REQUESTS).insert({
        senior_id: seniorId,
        volunteer_id: volunteerId,
        conversation_id: conversation.id,
        type: requestType,
        status: 'accepted',
        notes: note,
        created_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });
      console.log(`[REQUEST] Stored help request in database for ${seniorId} accepted by ${volunteerId}`);
    } catch (dbError) {
      console.warn(`[REQUEST] Failed to store request in DB:`, dbError);
    }

    onlineVolunteers.forEach((volSocketId, volId) => {
      if (volId !== volunteerId) io.to(volSocketId).emit('request:claimed', { seniorId, volunteerId });
    });

    const acceptTitle = requestType === 'voice' ? 'Voice session started' : (requestType === 'emotional' ? 'Support session started' : 'Chat started');
    const acceptBody = note && note.length ? note : 'A volunteer accepted your request';
    sendPushNotification(seniorId, acceptTitle, acceptBody, { conversationId: conversation.id, volunteerId, requestType });
    sendPushNotification(volunteerId, acceptTitle, acceptBody, { conversationId: conversation.id, seniorId, requestType });

    return conversation;
  } catch (e) {
    pendingRequests.set(seniorId, existing);
    throw e;
  }
};

const claimFirstPendingChatForVolunteer = async ({ volunteerId }) => {
  if (!volunteerId) return null;
  if (isVolunteerBusy(volunteerId)) return null;

  for (const [seniorId, req] of pendingRequests.entries()) {
    if (req?.status === 'pending' && (req?.requestType || 'chat') === 'chat') {
      return startSession({ seniorId, volunteerId, req });
    }
  }
  return null;
};

const saveMessage = async ({ conversationId, senderId, content, type = 'text' }) => {
  const { data, error } = await supabase
    .from(TABLES.MESSAGES)
    .insert({ conversation_id: conversationId, sender_id: senderId, content, type })
    .select()
    .single();
  if (error) throw error;
  // update last_message_at
  await supabase.from(TABLES.CONVERSATIONS)
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
  return data;
};

// Helper to send push notifications via Expo
const sendPushNotification = async (userId, title, body, data = {}) => {
  const token = pushTokens.get(userId);
  if (!token) return;

  try {
    console.log(`[PUSH] Sending notification to user ${userId}: ${title}`);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (e) {
    console.error(`[PUSH] Error sending notification:`, e);
  }
};

// Middleware for authentication
const ensureAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    // Support demo tokens in development mode
    if (token.startsWith('demo_')) {
      const role = token.split('_')[1];
      console.log(`[AUTH] Demo login detected for role: ${role}`);
      req.user = { 
        id: token, 
        email: `${role}@saathicircle.com`, 
        role: role,
        name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`
      };
      return next();
    }

    // Try custom JWT first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      req.user = { id: decoded.uid, email: decoded.email };
      
      // Fetch full user to get role
      try {
        const { data: user } = await supabase.from(TABLES.USERS).select('*').eq('id', decoded.uid).single();
        if (user) {
          req.user = { ...req.user, ...user };
        }
      } catch (dbErr) {
        console.warn(`[AUTH] DB user lookup failed for ${decoded.uid}: ${dbErr.message}`);
      }
      
      return next(); // Token is valid, proceed (even if user not in DB yet)
    } catch (err) {
      // If it looks like our JWT but failed verification, don't fall back
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: `Token expired: ${err.message}` });
      }
      // For other JWT errors, we might fall back to Supabase auth
    }

    // Fallback to Supabase token (legacy or third-party auth)
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = { id: data.user.id, email: data.user.email, phone: data.user.phone };
    // Fetch role from users table
    const { data: user } = await supabase.from(TABLES.USERS).select('*').eq('id', data.user.id).single();
    if (user) req.user = { ...req.user, ...user };
    
    next();
  } catch (e) {
    console.error(`[AUTH] Unexpected error:`, e);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// HTTP endpoints
app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/auth/register-push-token', ensureAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  pushTokens.set(req.user.id, token);
  console.log(`[PUSH] Registered token for user ${req.user.id}`);
  res.json({ ok: true });
});

app.post('/conversations/find-or-create', async (req, res) => {
  try {
    const { seniorId, companionId } = req.body || {};
    if (!seniorId || !companionId) {
      return res.status(400).json({ error: 'seniorId and companionId required' });
    }

    let existing = null;
    try {
      const { data, error } = await supabase
        .from(TABLES.CONVERSATIONS)
        .select('*')
        .eq('senior_id', seniorId)
        .eq('companion_id', companionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      existing = data;
    } catch (e) {
      const { data, error } = await supabase
        .from(TABLES.CONVERSATIONS)
        .select('*')
        .eq('senior_id', seniorId)
        .eq('companion_id', companionId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      existing = data;
    }

    if (existing) return res.json({ conversation: existing });

    const conversation = await createConversation(seniorId, companionId);
    res.json({ conversation });
  } catch (e) {
    console.error(`[ERROR] find-or-create conversation failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/help-requests/:id/escalate', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body || {};

    const { data: existing, error: fetchError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('id,status,description,volunteer_id')
      .eq('id', id)
      .eq('volunteer_id', req.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Help request not found' });

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot escalate a ${existing.status} request` });
    }

    const existingDesc = typeof existing.description === 'string' ? existing.description : '';
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    const reasonSuffix = trimmedReason ? `\n\n[Escalation] ${trimmedReason}` : `\n\n[Escalation]`;
    const nextDescription = `${existingDesc}${reasonSuffix}`.trim();

    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        status: 'escalated',
        description: nextDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('volunteer_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    emitAdminUpdate({ type: 'help_request', action: 'escalated', request: data });
    console.log(`[REQUEST] Help request ${id} escalated by ${req.user.id}. reason=${reason}`);
    res.json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to escalate help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id).startsWith('local-')) {
      return res.json({ messages: [] });
    }

    // Validate conversation exists
    const { data: convo, error: convoError } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('id')
      .eq('id', id)
      .single();
    
    if (convoError || !convo) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages for this specific conversation only
    let data = null;
    let error = null;
    const orderCandidates = ['created_at', 'sent_at', 'inserted_at', 'timestamp', 'createdAt', 'id'];
    for (const col of orderCandidates) {
      const resp = await supabase
        .from(TABLES.MESSAGES)
        .select('*')
        .eq('conversation_id', id)
        .order(col, { ascending: true });

      if (!resp.error) {
        data = resp.data;
        error = null;
        break;
      }

      // 42703 = undefined_column
      if (resp.error.code !== '42703') {
        error = resp.error;
        break;
      }
    }

    if (!data && !error) {
      const resp = await supabase
        .from(TABLES.MESSAGES)
        .select('*')
        .eq('conversation_id', id);

      if (resp.error) throw resp.error;
      data = resp.data;
    }

    if (error) throw error;
    
    console.log(`[CHAT] Retrieved ${data?.length || 0} messages for conversation ${id}`);
    res.json({ messages: data || [] });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch messages:`, e);
    res.status(500).json({ error: e.message });
  }
});
// Registration endpoints moved below ensureAuth

app.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { senderId, content, type } = req.body || {};
    if (!senderId || !content) return res.status(400).json({ error: 'senderId and content required' });
    
    // Validate conversation exists
    const { data: convo, error: convoError } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('id')
      .eq('id', id)
      .single();
    
    if (convoError || !convo) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = await saveMessage({ conversationId: id, senderId, content, type });
    
    // Ensure conversation_id is included in the broadcasted message
    const messageToEmit = {
      ...message,
      conversation_id: id,
    };
    
    // CRITICAL: Only broadcast to the specific conversation room
    io.to(`conv:${id}`).emit('message:new', messageToEmit);
    console.log(`[CHAT] Message posted to conversation ${id} from ${senderId}`);
    
    res.json({ message: messageToEmit });
  } catch (e) {
    console.error(`[ERROR] Failed to post message:`, e);
    res.status(500).json({ error: e.message });
  }
});

// End conversation endpoint
app.post('/conversations/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    // Validate conversation exists
    const { data: convo, error: convoError } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('id, status')
      .eq('id', id)
      .single();
    
    if (convoError || !convo) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update conversation status
    const { data: updated, error: updateError } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Notify all participants that chat has ended
    io.to(`conv:${id}`).emit('chat:ended', { conversationId: id, endedBy: userId });
    console.log(`[CHAT] Conversation ${id} ended by ${userId}`);
    
    res.json({ conversation: updated });
  } catch (e) {
    console.error(`[ERROR] Failed to end conversation:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Socket handlers
io.on('connection', (socket) => {
  // Client should emit identify with { userId, role: 'VOLUNTEER'|'SENIOR' }
  socket.on('identify', ({ userId, role }) => {
    socket.data.userId = userId;
    socket.data.role = role;
    if (userId) {
      userSockets.set(userId, socket.id);
      console.log(`[SOCKET] ${role} ${userId} identified with socket ${socket.id}`);
    }
    if (role === 'ADMIN' || role === 'admin') {
      socket.join('admins');
      console.log(`[SOCKET] Admin ${userId} joined admins room`);
    }
    if (role === 'NGO' || role === 'ngo') {
      socket.join('ngos');
      if (userId) socket.join(`ngo:${userId}`);
      console.log(`[SOCKET] NGO ${userId} joined ngos room`);
    }
    if (role === 'VOLUNTEER') {
      onlineVolunteers.set(userId, socket.id);
      setVolunteerAvailability({ volunteerId: userId, isOnline: true }).catch(() => {});
      io.emit('volunteer:online', { volunteerId: userId });
      console.log(`[SOCKET] Volunteer ${userId} now online`);

      // Send any pending seeker requests to this newly online volunteer
      pendingRequests.forEach((req, seniorId) => {
        if (req?.status === 'pending') {
          const { requestType = 'chat', note = '' } = req;
          io.to(socket.id).emit('seeker:incoming', { seniorId, requestType, note });
        }
      });

      claimFirstPendingChatForVolunteer({ volunteerId: userId }).catch((e) => {
        console.error(`[REQUEST] Auto-match failed for volunteer ${userId}:`, e);
      });
    }
  });

  socket.on('volunteer:availability', async ({ volunteerId, isOnline }) => {
    try {
      const vid = volunteerId || socket.data?.userId;
      if (!vid) return;
      const nextOnline = !!isOnline;

      // Only volunteers can toggle their own status
      if (socket.data?.role !== 'VOLUNTEER') return;

      await setVolunteerAvailability({ volunteerId: vid, isOnline: nextOnline });

      if (nextOnline) {
        onlineVolunteers.set(vid, socket.id);
        io.emit('volunteer:online', { volunteerId: vid });
        claimFirstPendingChatForVolunteer({ volunteerId: vid }).catch(() => {});
      } else {
        onlineVolunteers.delete(vid);
        io.emit('volunteer:offline', { volunteerId: vid });
      }
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // Senior requests a companion: notify all online volunteers to accept
  socket.on('seeker:request', async ({ seniorId, requestType = 'chat', note = '' }) => {
    try {
      if (!seniorId) return;
      
      console.log(`[REQUEST] New seeker request from ${seniorId}: type=${requestType}`);
      
      // Store in memory for quick lookup
      pendingRequests.set(seniorId, { status: 'pending', requestType, note });

      // Also store in database immediately so caregivers can see it
      // Try to create the help request, but don't fail if DB isn't available
      try {
        // First, ensure the senior record exists in the users table
        try {
          const { data: existingSenior, error: selectError } = await supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('id', seniorId);
          
          // If not found or error, try to create
          if (selectError || !existingSenior || existingSenior.length === 0) {
            console.log(`[REQUEST] Senior ${seniorId} doesn't have users table record, creating one`);
            const { error: insertError } = await supabase.from(TABLES.USERS).insert({
              id: seniorId,
              role: 'elderly',
              created_at: new Date().toISOString(),
            });
            
            if (insertError) {
              console.warn(`[REQUEST] Could not create users record:`, insertError.message);
            } else {
              console.log(`[REQUEST] Created users record for ${seniorId}`);
            }
          }
        } catch (userCheckError) {
          console.warn(`[REQUEST] Error checking/creating user record:`, userCheckError.message);
        }

        const { data, error } = await supabase.from(TABLES.HELP_REQUESTS).insert({
          senior_id: seniorId,
          category: requestType === 'voice' ? 'Voice Call' : requestType === 'emotional' ? 'Emotional Support' : 'Chat',
          description: note || '',
          priority: 'medium',
          status: 'pending',
          created_at: new Date().toISOString(),
        }).select().single();

        if (error) {
          console.warn(`[REQUEST] Failed to store pending request in DB:`, error);
          // Don't block the request - continue with socket notifications anyway
        } else {
          console.log(`[REQUEST] Stored pending request in database:`, data.id);
        }
      } catch (dbError) {
        console.warn(`[REQUEST] DB insertion error:`, dbError);
        // Don't block the request - continue with socket notifications anyway
      }

      if (onlineVolunteers.size === 0) {
        console.log(`[REQUEST] No volunteers online, queuing request`);
        socket.emit('seeker:queued');
      }

      if (requestType === 'chat' && onlineVolunteers.size > 0) {
        let pickedVolunteerId = null;
        for (const volId of onlineVolunteers.keys()) {
          if (!isVolunteerBusy(volId)) {
            pickedVolunteerId = volId;
            break;
          }
        }
        if (pickedVolunteerId) {
          await startSession({ seniorId, volunteerId: pickedVolunteerId, req: { requestType, note } });
          return;
        }
      }

      // Notify all online volunteers via socket
      // This works even if database storage failed
      onlineVolunteers.forEach((volSocketId, volId) => {
        io.to(volSocketId).emit('seeker:incoming', { seniorId, requestType, note });
        // Optional push notification if token present
        const title = requestType === 'voice' ? 'Incoming voice call request' : requestType === 'emotional' ? 'Emotional support request' : 'New chat request';
        const body = note && note.length ? note : 'A senior is seeking companionship';
        sendPushNotification(volId, title, body, { seniorId, requestType });
      });
    } catch (e) {
      console.error(`[REQUEST] Error in seeker:request:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  // Push token registration via socket (avoids HTTP auth)
  socket.on('push:register', async ({ userId, token }) => {
    try {
      if (!userId || !token) return;
      pushTokens.set(userId, token);
      console.log(`[PUSH] Registered token via socket for user ${userId}`);
      socket.emit('push:registered', { ok: true });
    } catch (e) {
      console.error('[PUSH] Registration failed:', e);
      socket.emit('push:registered', { ok: false, error: e.message });
    }
  });

  // Volunteer accepts a pending request
  socket.on('volunteer:accept', async ({ seniorId, volunteerId }) => {
    try {
      if (!seniorId || !volunteerId) return;
      const req = pendingRequests.get(seniorId);
      if (!req || req.status !== 'pending') {
        return; // already claimed or not pending
      }
      await startSession({ seniorId, volunteerId, req });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // Senior cancels a pending request
  socket.on('request:cancel', async ({ seniorId }) => {
    try {
      if (!seniorId) return;
      const req = pendingRequests.get(seniorId);
      if (!req || req.status !== 'pending') {
        return; // already claimed or not pending
      }

      // Remove pending request
      pendingRequests.delete(seniorId);
      console.log(`[REQUEST] Senior ${seniorId} cancelled their request`);

      // Notify all volunteers that this request was cancelled
      onlineVolunteers.forEach((volSocketId, volId) => {
        io.to(volSocketId).emit('request:cancelled', { seniorId });
      });

      // Notify senior that request was cancelled
      const seniorSocketId = userSockets.get(seniorId);
      if (seniorSocketId) {
        io.to(seniorSocketId).emit('request:cancelled', { status: 'cancelled' });
      }
    } catch (e) {
      console.error(`[REQUEST] Error cancelling request:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  // Get request status
  socket.on('request:status', async ({ seniorId }) => {
    try {
      if (!seniorId) return;
      const req = pendingRequests.get(seniorId);
      const status = req ? req.status : 'no_pending_request';
      socket.emit('request:status:response', { seniorId, status, request: req });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // Allow clients to join an existing conversation room
  socket.on('session:join', ({ conversationId }) => {
    socket.join(`conv:${conversationId}`);
  });

  // Chat message - IMPORTANT: Only broadcast to the specific conversation room
  socket.on('message:send', async ({ conversationId, senderId, content, type }) => {
    try {
      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId required' });
      }
      const saved = await saveMessage({ conversationId, senderId, content, type });
      // Ensure conversation_id is in the message object
      const messageToEmit = {
        ...saved,
        conversation_id: conversationId,
      };
      // CRITICAL: Only emit to the specific conversation room, NOT to all users
      io.to(`conv:${conversationId}`).emit('message:new', messageToEmit);
      console.log(`[CHAT] Message sent in conversation ${conversationId} from ${senderId}`);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // End chat handler
  socket.on('chat:end', async ({ conversationId, userId }) => {
    try {
      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId required' });
      }
      // Update conversation status to ended
      const { error } = await supabase
        .from(TABLES.CONVERSATIONS)
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
      
      // Notify all participants that chat has ended
      io.to(`conv:${conversationId}`).emit('chat:ended', { conversationId, endedBy: userId });
      console.log(`[CHAT] Conversation ${conversationId} ended by ${userId}`);

      sessions.delete(conversationId);
      const numericId = Number(conversationId);
      if (!Number.isNaN(numericId)) sessions.delete(numericId);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // WebRTC signaling relays within conversation room
  socket.on('webrtc:offer', ({ conversationId, sdp }) => {
    socket.to(`conv:${conversationId}`).emit('webrtc:offer', { sdp });
  });
  socket.on('webrtc:answer', ({ conversationId, sdp }) => {
    socket.to(`conv:${conversationId}`).emit('webrtc:answer', { sdp });
  });
  socket.on('webrtc:ice-candidate', ({ conversationId, candidate }) => {
    socket.to(`conv:${conversationId}`).emit('webrtc:ice-candidate', { candidate });
  });

  // Voice call handlers
  socket.on('call:initiate', async ({ conversationId, callerId, calleeId, callerName }) => {
    try {
      if (!conversationId || !callerId || !calleeId) {
        return socket.emit('error', { message: 'conversationId, callerId, and calleeId required' });
      }
      console.log(`[CALL] Initiate call from ${callerId} to ${calleeId} in conversation ${conversationId}`);

      // Get the specific volunteer's socket
      const calleeSocketId = userSockets.get(calleeId);
      if (!calleeSocketId) {
        return socket.emit('call:failed', { 
          conversationId, 
          reason: 'Volunteer not available',
          message: 'The volunteer is currently offline. Please try again later.'
        });
      }

      // Join caller to conversation room
      socket.join(`conv:${conversationId}`);

      // Send incoming call notification to the specific volunteer only
      io.to(calleeSocketId).emit('call:incoming', {
        conversationId,
        callerId,
        callerName: callerName || 'Senior User',
        calleeId,
      });

      // Notify caller that call is ringing
      socket.emit('call:ringing', {
        conversationId,
        calleeId,
      });

      console.log(`[CALL] Incoming call notification sent to volunteer ${calleeId}`);

      // Send push notification to volunteer
      sendPushNotification(calleeId, 'Incoming Call', `${callerName || 'A senior'} is calling you`, { 
        conversationId,
        callerId,
        type: 'voice_call'
      });

    } catch (e) {
      console.error(`[CALL] Error initiating call:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  // Volunteer accepts the call
  socket.on('call:accept', async ({ conversationId, callerId, calleeId }) => {
    try {
      if (!conversationId || !callerId || !calleeId) {
        return socket.emit('error', { message: 'conversationId, callerId, and calleeId required' });
      }
      console.log(`[CALL] Call accepted by ${calleeId} in conversation ${conversationId}`);

      // Join volunteer to conversation room
      socket.join(`conv:${conversationId}`);

      // Get caller's socket
      const callerSocketId = userSockets.get(callerId);

      // Notify both parties that call is active
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:active', {
          conversationId,
          callerId,
          calleeId,
          acceptedAt: new Date().toISOString(),
        });
      }

      // Notify the volunteer that call is active
      socket.emit('call:active', {
        conversationId,
        callerId,
        calleeId,
        acceptedAt: new Date().toISOString(),
      });

      // Broadcast to both that they can start WebRTC connection
      io.to(`conv:${conversationId}`).emit('call:ready-for-webrtc', {
        conversationId,
        callerId,
        calleeId,
      });

      console.log(`[CALL] Call is now active between ${callerId} and ${calleeId}`);
    } catch (e) {
      console.error(`[CALL] Error accepting call:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  // Volunteer rejects the call
  socket.on('call:reject', async ({ conversationId, callerId, calleeId }) => {
    try {
      if (!conversationId || !callerId || !calleeId) {
        return socket.emit('error', { message: 'conversationId, callerId, and calleeId required' });
      }
      console.log(`[CALL] Call rejected by ${calleeId} in conversation ${conversationId}`);

      const callerSocketId = userSockets.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:rejected', {
          conversationId,
          rejectedBy: calleeId,
          reason: 'Volunteer rejected the call',
        });
      }

      console.log(`[CALL] Call rejected notification sent to caller ${callerId}`);
    } catch (e) {
      console.error(`[CALL] Error rejecting call:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  // End voice call
  socket.on('call:end', async ({ conversationId, callerId, calleeId, userId }) => {
    try {
      if (!conversationId || !userId) {
        return socket.emit('error', { message: 'conversationId and userId required' });
      }
      console.log(`[CALL] Call ended in conversation ${conversationId} by ${userId}`);

      // Notify both parties that call has ended
      io.to(`conv:${conversationId}`).emit('call:ended', {
        conversationId,
        endedBy: userId,
        endedAt: new Date().toISOString(),
      });

      // Remove both from conversation room (they can rejoin for chat)
      const callerSocketId = userSockets.get(callerId);
      const calleeSocketId = userSockets.get(calleeId);

      if (callerSocketId) {
        io.sockets.sockets.get(callerSocketId)?.leave(`conv:${conversationId}`);
      }
      if (calleeSocketId) {
        io.sockets.sockets.get(calleeSocketId)?.leave(`conv:${conversationId}`);
      }

      console.log(`[CALL] Call ended and participants removed from conversation room`);
    } catch (e) {
      console.error(`[CALL] Error ending call:`, e);
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('disconnect', () => {
    if (socket.data?.role === 'VOLUNTEER' && socket.data?.userId) {
      onlineVolunteers.delete(socket.data.userId);
      setVolunteerAvailability({ volunteerId: socket.data.userId, isOnline: false }).catch(() => {});
      io.emit('volunteer:offline', { volunteerId: socket.data.userId });
    }
    if (socket.data?.userId) {
      // Keep last known socket? For simplicity, delete mapping
      userSockets.delete(socket.data.userId);
    }
  });
});

// ----- Auth middleware and profile endpoints (OTP + avatar emoji) -----
const ensureAdmin = (req, res, next) => {
  ensureAuth(req, res, () => {
    console.log(`[AUTH] Checking admin access for user:`, {
      id: req.user?.id,
      role: req.user?.role,
      email: req.user?.email
    });
    
    if (!req.user) {
      console.error(`[AUTH] No user object found`);
      return res.status(403).json({ error: 'Forbidden: User not authenticated' });
    }
    
    if (req.user.role !== 'admin') {
      console.warn(`[AUTH] Admin access denied for user ${req.user?.id} with role ${req.user?.role}`);
      return res.status(403).json({ 
        error: 'Forbidden: Admin access required',
        userRole: req.user?.role
      });
    }
    
    console.log(`[AUTH] Admin access granted for user ${req.user.id}`);
    next();
  });
};

const ensureNgo = (req, res, next) => {
  ensureAuth(req, res, () => {
    if (!req.user) {
      return res.status(403).json({ error: 'Forbidden: User not authenticated' });
    }

    // IMPORTANT: Many deployments store approval/verification flags in metadata
    // (avatar_emoji JSON). Normalize user first so checks are consistent.
    const parsedUser = parseProfileData(req.user);
    req.user = parsedUser;

    const role = String(parsedUser.role || '').toLowerCase();
    if (role !== 'ngo') {
      return res.status(403).json({ error: 'Forbidden: NGO access required', userRole: req.user.role });
    }

    const isBlocked = parsedUser.is_blocked === true || parsedUser.blocked === true;
    if (isBlocked) {
      return res.status(403).json({ error: 'Forbidden: Account disabled' });
    }

    const isApproved = parsedUser.is_approved === true;
    const isVerified = parsedUser.is_verified === true || parsedUser.verified === true;
    if (!isApproved || !isVerified) {
      return res.status(403).json({ error: 'Forbidden: NGO not approved', approved: !!isApproved, verified: !!isVerified });
    }

    next();
  });
};

const logNgoActivity = async ({ ngoId, action, entityType = '', entityId = null, details = {} }) => {
  try {
    await supabase.from('ngo_activity_logs').insert({
      ngo_id: ngoId,
      action: String(action || ''),
      entity_type: String(entityType || ''),
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
};

const avatarForGender = (gender) => {
  if (!gender || typeof gender !== 'string') return '🧑';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return '👨';
  if (g === 'female' || g === 'f') return '👩';
  return '🧑';
};

const readUserMetadata = async (userId) => {
  try {
    const { data } = await supabase
      .from(TABLES.USERS)
      .select('avatar_emoji')
      .eq('id', userId)
      .single();

    const raw = data?.avatar_emoji;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
      return JSON.parse(raw);
    }
    // plain emoji string stored in column
    if (typeof raw === 'string') return { avatar_emoji: raw };
    return {};
  } catch {
    return {};
  }
};

const writeUserMetadata = async (userId, patch = {}) => {
  const existing = await readUserMetadata(userId);
  // Always keep a real emoji stored in metadata.avatar_emoji so parseProfileData doesn't
  // fall back to the JSON string.
  let base = { ...existing };
  if (!base.avatar_emoji) {
    try {
      const { data } = await supabase.from(TABLES.USERS).select('gender').eq('id', userId).single();
      base.avatar_emoji = avatarForGender(data?.gender);
    } catch {
      base.avatar_emoji = '🧑';
    }
  }

  const next = { ...base, ...patch };
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update({ avatar_emoji: JSON.stringify(next) })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return parseProfileData(data);
};

const setVolunteerAvailability = async ({ volunteerId, isOnline }) => {
  if (!volunteerId) return null;
  const patch = {
    is_online: !!isOnline,
    last_seen_at: !isOnline ? new Date().toISOString() : undefined,
  };
  if (patch.last_seen_at === undefined) delete patch.last_seen_at;
  return writeUserMetadata(volunteerId, patch);
};

// Helper to parse profile metadata from avatar_emoji column
const parseProfileData = (user) => {
  if (!user) return user;
  let metadata = {};
  try {
    if (user.avatar_emoji) {
      if (typeof user.avatar_emoji === 'object') {
        metadata = user.avatar_emoji;
      } else if (typeof user.avatar_emoji === 'string' && (user.avatar_emoji.startsWith('{') || user.avatar_emoji.startsWith('['))) {
        metadata = JSON.parse(user.avatar_emoji);
      }
    }
  } catch (e) {
    console.warn(`[WARN] Failed to parse metadata for user ${user.id}`);
  }
  
  // Flatten metadata into user object
  return {
    ...user,
    ...metadata,
    // ensure avatar_emoji is a single emoji if not found in metadata
    avatar_emoji: metadata.avatar_emoji || (typeof user.avatar_emoji === 'string' ? user.avatar_emoji : null) || avatarForGender(user.gender),
    // Ensure status fields are explicitly included if they exist in user but not in metadata
    is_approved: user.is_approved !== undefined ? user.is_approved : metadata.is_approved,
    role: user.role || metadata.role
  };
};

// Send OTP via site mail (email only)
app.post('/auth/send-otp', async (req, res) => {
  // Global middleware already logs the body
  try {
    const { email, name } = req.body || {};
    if (!email) {
      console.warn(`[WARN] /send-otp called without email`);
      return res.status(400).json({ error: 'email required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    console.log(`[INFO] Generated OTP ${code} for ${emailNorm}`);
    otpStore.set(emailNorm, { code, expiresAt });
    // Dev aid: log OTP so you can verify quickly during development
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      console.log(`[DEV] OTP for ${emailNorm}: ${code} (expires in 10m)`);
    }
    // Persist OTP so nodemon restarts don't break verification
    let persisted = false;
    try {
      console.log(`[DB] Attempting to persist OTP for ${emailNorm}...`);
      const { data, error: otpErr } = await supabase
        .from(TABLES.OTP_CODES)
        .upsert(
          { email: emailNorm, code, expires_at: new Date(expiresAt).toISOString() },
          { onConflict: 'email' }
        )
        .select();
      
      if (otpErr) {
        console.warn(`[WARN] Failed to persist OTP for ${emailNorm}: ${otpErr.message} (${otpErr.code || 'no_code'})`);
        console.warn(`[DEBUG] Full error object:`, JSON.stringify(otpErr));
      } else {
        persisted = true;
        console.log(`[DB] OTP successfully persisted for ${emailNorm}. Data:`, JSON.stringify(data));
      }
    } catch (dbErr) {
      console.warn(`[WARN] Failed to persist OTP for ${emailNorm}: ${dbErr?.message || dbErr}`);
    }
    if (persisted) {
      console.log(`[INFO] OTP persisted for ${emailNorm}`);
    } else {
      console.warn(`[WARN] OTP NOT persisted for ${emailNorm} (will rely on in-memory store)`);
    }
    try {
      await sendOtpEmail(emailNorm, code, name);
    } catch (mailErr) {
      console.warn(`[WARN] sendOtpEmail failed for ${emailNorm}: ${mailErr?.message || mailErr}`);
    }
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.json({ sent: true, channel: 'email', devCode: code, persisted });
    }
    res.json({ sent: true, channel: 'email' });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Verify email OTP (custom), upsert profile, issue JWT
app.post('/auth/verify-otp', async (req, res) => {
  console.log(`[AUTH] /verify-otp request received:`, req.body);
  try {
    const { email, token, gender, name, role, phone } = req.body || {};
    if (!email || !token) return res.status(400).json({ error: 'email and token required' });
    const emailNorm = String(email).trim().toLowerCase();
    const tok = String(token).trim();
    console.log(`[INFO] /auth/verify-otp requested for ${emailNorm}`);

    // Source of truth: DB (survives nodemon restarts)
    let rec = null;
    try {
      console.log(`[DB] Looking up OTP in database for ${emailNorm}...`);
      const { data: otpRow, error: otpErr } = await supabase
        .from(TABLES.OTP_CODES)
        .select('*')
        .eq('email', emailNorm)
        .maybeSingle(); 
      
      if (otpErr) {
        console.warn(`[WARN] OTP DB lookup failed for ${emailNorm}: ${otpErr.message}`);
      }
      
      if (otpRow) {
        console.log(`[DB] OTP found in database for ${emailNorm}. Code: ${otpRow.code}`);
        rec = {
          code: otpRow.code,
          expiresAt: otpRow.expires_at ? new Date(otpRow.expires_at).getTime() : 0,
          fromDb: true,
        };
      } else {
        console.log(`[DB] No OTP found in database for ${emailNorm}`);
      }
    } catch (e) {
      console.error(`[ERROR] Exception during DB lookup:`, e);
    }

    // Fallback: memory
    if (!rec) {
      console.log(`[MEM] Looking up OTP in memory for ${emailNorm}...`);
      const mem = otpStore.get(emailNorm);
      if (mem) {
        console.log(`[MEM] OTP found in memory for ${emailNorm}`);
        rec = { ...mem, fromDb: false };
      } else {
        console.log(`[MEM] No OTP found in memory for ${emailNorm}`);
      }
    }

    if (rec) {
      console.log(`[INFO] OTP record found for ${emailNorm} (source=${rec.fromDb ? 'db' : 'memory'})`);
    }

    if (!rec) {
      return res.status(401).json({
        error: 'No OTP requested',
        hint: 'Send OTP again. If server restarted, in-memory OTP is cleared; ensure otp_codes table exists and Supabase key has write access.',
      });
    }
    if (rec.expiresAt < Date.now()) return res.status(401).json({ error: 'OTP expired' });
    if (String(rec.code) !== tok) return res.status(401).json({ error: 'Invalid OTP' });

    // Consume OTP after a short delay (prevents double-tap issues)
    console.log(`[INFO] Scheduling OTP deletion for ${emailNorm} in 30s`);
    setTimeout(async () => {
      try {
        console.log(`[DB/MEM] Deleting consumed OTP for ${emailNorm}`);
        otpStore.delete(emailNorm);
        const { error: delErr } = await supabase.from(TABLES.OTP_CODES).delete().eq('email', emailNorm);
        if (delErr) console.warn(`[WARN] Failed to delete OTP from DB: ${delErr.message}`);
      } catch (e) {
        console.error(`[ERROR] Exception during OTP deletion:`, e);
      }
    }, 30000);

    const { data: existing, error: findErr } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', emailNorm)
      .single();

    let isNew = false;
    const id = existing?.id || randomUUID();
    if (!existing && (findErr?.code === 'PGRST116' || !findErr)) {
      isNew = true;
    }

    const profile = {
      id,
      email: emailNorm,
      phone: phone ?? existing?.phone ?? null,
      name: name ?? existing?.name ?? null,
      role: role ?? existing?.role ?? null,
      gender: gender ?? existing?.gender ?? null,
    };
    
    // Determine approved status
    // IMPORTANT: Some deployments store approval only in metadata (avatar_emoji JSON).
    // Using existing?.is_approved can incorrectly reset approved volunteers to false.
    const existingParsed = existing ? parseProfileData(existing) : null;
    const existingApproved = existingParsed?.is_approved === true;
    const isApproved = role === 'admin' || role === 'elderly' ? true : existingApproved;
    
    // Preserve existing avatar_emoji if it contains JSON metadata
    const currentAvatar = existing?.avatar_emoji;
    const isJson = currentAvatar && (currentAvatar.startsWith('{') || currentAvatar.startsWith('['));
    
    if (!isJson) {
      const metadata = {
        gender: gender ?? existing?.gender,
        is_approved: isApproved,
        avatar_emoji: avatarForGender(gender ?? existing?.gender)
      };
      profile.avatar_emoji = JSON.stringify(metadata);
    } else {
      try {
        const metadata = JSON.parse(currentAvatar);
        metadata.is_approved = isApproved;
        profile.avatar_emoji = JSON.stringify(metadata);
      } catch (e) {
        profile.avatar_emoji = currentAvatar;
      }
    }
    
    const { error: upsertErr } = await supabase.from(TABLES.USERS).upsert(profile, { onConflict: 'id' });
    if (upsertErr) {
      console.error(`[AUTH] Failed to upsert profile for ${emailNorm}:`, upsertErr);
    } else {
      console.log(`[AUTH] Profile persisted for ${emailNorm}`);
    }

    if (isNew && profile.email) { await sendWelcomeEmail(profile.email, profile.name); }

    const access_token = jwt.sign({ uid: id, email: emailNorm }, process.env.JWT_SECRET || 'dev_secret_change_me', { expiresIn: '7d' });
    
    const responseData = {
      access_token,
      user: {
        id,
        email: emailNorm,
        phone: profile.phone,
        name: profile.name,
        role: profile.role,
        gender: profile.gender,
        avatar_emoji: profile.avatar_emoji,
      },
    };
    
    console.log(`[AUTH] Verification successful for ${emailNorm}. Returning profile with role: ${profile.role}`);
    res.json(responseData);
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Current user profile
app.get('/me', ensureAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    console.log(`[AUTH] /me - Returning fresh profile for ${req.user.id}: ${data?.name}`);
    res.json({ user: parseProfileData({ id: req.user.id, email: req.user.email, phone: req.user.phone, ...data }) });
  } catch (e) {
    console.error(`[ERROR] /me failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Alias for frontend checkStatus
app.get('/auth/check-volunteer-status', ensureAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    console.log(`[AUTH] check-volunteer-status - Returning fresh profile for ${req.user.id}: ${data?.name}`);
    res.json({ user: parseProfileData({ id: req.user.id, email: req.user.email, phone: req.user.phone, ...data }) });
  } catch (e) {
    console.error(`[ERROR] check-volunteer-status failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Update profile (recomputes avatar_emoji on gender change)
app.put('/profile', ensureAuth, async (req, res) => {
  try {
    const {
      name,
      role,
      gender,
      phone,
      full_name,
      age,
      city,
      address,
      pincode,
      date_of_birth,
      skills,
      why_volunteer,
      availability,
      preferred_help_types,
      is_active,
      is_approved,
      help_count,
      rating,
      emergency_contacts,
      health_info,
      preferences,
    } = req.body || {};

    const update = { id: req.user.id };

    if (name !== undefined) update.name = name;
    else if (full_name !== undefined) update.name = full_name;
    
    if (phone !== undefined) update.phone = phone;
    if (gender !== undefined) {
      update.gender = gender;
    }

    if (role !== undefined) update.role = role;

    // Get existing metadata to merge with new data
    let existingMetadata = {};
    try {
      const { data: existingData } = await supabase
        .from(TABLES.USERS)
        .select('avatar_emoji')
        .eq('id', req.user.id)
        .single();
      
      if (existingData?.avatar_emoji) {
        try {
          if (typeof existingData.avatar_emoji === 'string' && (existingData.avatar_emoji.startsWith('{') || existingData.avatar_emoji.startsWith('['))) {
            existingMetadata = JSON.parse(existingData.avatar_emoji);
          } else if (typeof existingData.avatar_emoji === 'object') {
            existingMetadata = existingData.avatar_emoji;
          }
        } catch (e) {
          console.warn(`[PROFILE] Failed to parse existing metadata:`, e);
        }
      }
    } catch (e) {
      console.warn(`[PROFILE] Failed to fetch existing metadata:`, e);
    }

    // We store all extra info in avatar_emoji as a JSON string since we can't add columns
    const metadata = {
      ...existingMetadata, // Preserve existing metadata
      gender: gender !== undefined ? gender : existingMetadata.gender,
      age: age !== undefined ? age : existingMetadata.age,
      city: city !== undefined ? city : existingMetadata.city,
      address: address !== undefined ? address : existingMetadata.address,
      pincode: pincode !== undefined ? pincode : existingMetadata.pincode,
      date_of_birth: date_of_birth !== undefined ? date_of_birth : existingMetadata.date_of_birth,
      skills: skills !== undefined ? skills : existingMetadata.skills,
      why_volunteer: why_volunteer !== undefined ? why_volunteer : existingMetadata.why_volunteer,
      availability: availability !== undefined ? availability : existingMetadata.availability,
      preferred_help_types: preferred_help_types !== undefined ? preferred_help_types : existingMetadata.preferred_help_types,
      emergency_contacts: emergency_contacts !== undefined ? emergency_contacts : existingMetadata.emergency_contacts,
      health_info: health_info !== undefined ? health_info : existingMetadata.health_info,
      preferences: preferences !== undefined ? preferences : existingMetadata.preferences,
      is_approved: is_approved !== undefined ? is_approved : existingMetadata.is_approved,
      avatar_emoji: avatarForGender(gender !== undefined ? gender : existingMetadata.gender)
    };
    update.avatar_emoji = JSON.stringify(metadata);

    console.log(`[PROFILE] Updating user ${req.user.id} with metadata storage`);

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(update)
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) {
      console.error(`[ERROR] Profile update failed for ${req.user.id}:`, error);
      throw error;
    }
    console.log(`[PROFILE] Update successful for ${req.user.id}`);
    res.json({ profile: parseProfileData(data) });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});
// ----- End auth/profile block -----

// Explicit registration endpoints (now safely after ensureAuth)
// Register Senior: sets role=elderly, is_approved=true
app.post('/register/senior', ensureAuth, async (req, res) => {
  try {
    const { full_name, phone, name, gender, age, city, address } = req.body || {};
    const update = {
      id: req.user.id,
      role: 'elderly',
    };
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) {
      update.name = name;
    } else if (full_name !== undefined) {
      update.name = full_name;
    } else {
      update.name = req.user.name || 'Senior User';
    }

    const metadata = {
      gender,
      age,
      city,
      address,
      is_approved: true, // Seniors are auto-approved
      avatar_emoji: avatarForGender(gender)
    };
    update.avatar_emoji = JSON.stringify(metadata);

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert(update, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    // Automatically save senior data to seniors table as well
    try {
      const seniorProfile = {
        user_id: req.user.id,
        full_name: update.name,
        age: age ? parseInt(age) : null,
        gender,
        city,
        address,
        phone: phone || req.user.phone,
        updated_at: new Date().toISOString()
      };
      
      const { error: seniorErr } = await supabase
        .from(TABLES.SENIORS)
        .upsert(seniorProfile, { onConflict: 'user_id' });
        
      if (seniorErr) {
        console.warn(`[WARN] Failed to auto-save to seniors table:`, seniorErr.message);
        // We don't throw here to avoid failing the whole registration if just the profile table fails
      } else {
        console.log(`[INFO] Senior profile automatically saved for ${req.user.id}`);
      }
    } catch (err) {
      console.warn(`[WARN] Unexpected error saving senior profile:`, err.message);
    }

    // Notify admin of new senior registration
    try {
      await supabase.from(TABLES.PENDING_APPROVALS).insert({
        uid: req.user.id,
        email: req.user.email,
        full_name: update.name,
        phone: phone || req.user.phone || null,
        role: 'elderly',
        status: 'approved', // Mark as auto-approved but still notified
        created_at: new Date().toISOString()
      });
      console.log(`[INFO] Senior registration notification created for admin: ${req.user.id}`);
    } catch (err) {
      console.warn(`[WARN] Failed to insert into pending_approvals for senior notification:`, err.message);
    }

    res.json({ profile: parseProfileData(data) });
  } catch (e) {
    console.error(`[ERROR] Senior registration failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Register Volunteer: sets role=volunteer_pending
app.post('/register/volunteer', ensureAuth, async (req, res) => {
  try {
    const { full_name, phone, name, gender, age, city, address, skills, why_volunteer } = req.body || {};
    const update = {
      id: req.user.id,
      role: 'volunteer_pending',
    };
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) {
      update.name = name;
    } else if (full_name !== undefined) {
      update.name = full_name;
    }

    const metadata = {
      gender,
      age,
      city,
      address,
      skills,
      why_volunteer,
      is_approved: false,
      avatar_emoji: avatarForGender(gender)
    };
    update.avatar_emoji = JSON.stringify(metadata);

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert(update, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    // Optional: enqueue to pending approvals table if exists
    try {
      const vName = full_name || name || req.user.name || 'Volunteer Applicant';
      const now = new Date().toISOString();

      // Prefer update to avoid duplicates, fallback to insert
      const upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({
          email: req.user.email,
          full_name: vName,
          phone: phone || req.user.phone || null,
          role: 'volunteer',
          status: 'pending',
          created_at: now,
          decided_at: null,
        })
        .eq('uid', req.user.id)
        .select();

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        await supabase.from(TABLES.PENDING_APPROVALS).insert({
          uid: req.user.id,
          email: req.user.email,
          full_name: vName,
          phone: phone || req.user.phone || null,
          role: 'volunteer',
          status: 'pending',
          created_at: now,
        });
      }
      console.log(`[INFO] Volunteer application notification created for admin: ${req.user.id}`);
    } catch (err) {
      console.warn(`[WARN] Failed to insert into pending_approvals for volunteer:`, err.message);
    }

    res.json({ profile: parseProfileData(data) });
  } catch (e) {
    console.error(`[ERROR] Volunteer registration failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Register NGO: sets role=ngo_pending
app.post('/register/ngo', ensureAuth, async (req, res) => {
  try {
    const { 
      ngo_name, 
      registration_number, 
      contact_person, 
      phone, 
      email, 
      areas_of_operation, 
      services_offered,
      verification_documents
    } = req.body || {};

    const update = {
      id: req.user.id,
      role: 'ngo_pending',
      name: ngo_name,
      phone: phone || req.user.phone,
    };

    const metadata = {
      is_approved: false,
      is_ngo: true,
      ngo_name,
      registration_number,
      contact_person,
      areas_of_operation,
      services_offered,
      verification_documents,
      avatar_emoji: '🏢'
    };
    update.avatar_emoji = JSON.stringify(metadata);

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert(update, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    // Save to ngos table
    try {
      const ngoProfile = {
        user_id: req.user.id,
        ngo_name,
        registration_number,
        contact_person,
        phone: phone || req.user.phone,
        email: email || req.user.email,
        areas_of_operation: Array.isArray(areas_of_operation) ? areas_of_operation : [],
        services_offered: Array.isArray(services_offered) ? services_offered : [],
        verification_documents: Array.isArray(verification_documents) ? verification_documents : [],
        status: 'pending',
        updated_at: new Date().toISOString()
      };
      
      const { error: ngoErr } = await supabase
        .from(TABLES.NGOS)
        .upsert(ngoProfile, { onConflict: 'user_id' });
        
      if (ngoErr) {
        console.warn(`[WARN] Failed to save to ngos table:`, ngoErr.message);
      }
    } catch (err) {
      console.warn(`[WARN] Unexpected error saving ngo profile:`, err.message);
    }

    // Notify admin
    try {
      await supabase.from(TABLES.PENDING_APPROVALS).insert({
        uid: req.user.id,
        email: req.user.email,
        full_name: ngo_name,
        phone: phone || req.user.phone || null,
        role: 'ngo',
        status: 'pending',
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn(`[WARN] Failed to insert into pending_approvals for NGO:`, err.message);
    }

    try {
      emitAdminUpdate({ type: 'ngo', action: 'applied', ngo: parseProfileData(data) });
    } catch {}

    res.json({ profile: parseProfileData(data) });
  } catch (e) {
    console.error(`[ERROR] NGO registration failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/check-ngo-status', ensureAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json({ user: parseProfileData(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/ngo/me', ensureNgo, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    const u = parseProfileData(data);
    const regions = Array.isArray(u.ngo_regions)
      ? u.ngo_regions
      : Array.isArray(u.regions)
      ? u.regions
      : [];
    res.json({
      ngo: {
        id: u.id,
        name: u.name || u.ngo_name || 'NGO',
        verified: u.is_verified === true || u.verified === true,
        regions,
        serviceTypes: Array.isArray(u.ngo_service_types)
          ? u.ngo_service_types
          : Array.isArray(u.service_types)
          ? u.service_types
          : [],
        contactPerson: u.contact_person || u.contactPerson || null,
        phone: u.phone || null,
        email: u.email || null,
        registrationNumber: u.registration_number || u.registrationNumber || null,
        ngo_profile_update_status: u.ngo_profile_update_status || null,
        ngo_profile_update_requested_at: u.ngo_profile_update_requested_at || null,
        ngo_profile_update_decided_at: u.ngo_profile_update_decided_at || null,
        ngo_profile_update_reject_reason: u.ngo_profile_update_reject_reason || null,
        ngo_profile_update_request: u.ngo_profile_update_request || null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/profile-update/approve', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const { data, error } = await supabase.from(TABLES.USERS).select('*').eq('id', id).single();
    if (error) throw error;
    const u = parseProfileData(data);

    const reqPatch = u?.ngo_profile_update_request && typeof u.ngo_profile_update_request === 'object'
      ? u.ngo_profile_update_request
      : {};

    const nextPhone = reqPatch.phone !== undefined ? String(reqPatch.phone || '') : undefined;
    const nextEmail = reqPatch.email !== undefined ? String(reqPatch.email || '') : undefined;
    const nextContact = reqPatch.contactPerson !== undefined ? String(reqPatch.contactPerson || '') : undefined;

    // Update base users table for canonical phone/email
    try {
      const updateUser = {};
      if (nextPhone !== undefined) updateUser.phone = nextPhone || null;
      if (nextEmail !== undefined) updateUser.email = nextEmail || null;
      if (Object.keys(updateUser).length) {
        updateUser.updated_at = now;
        await supabase.from(TABLES.USERS).update(updateUser).eq('id', id);
      }
    } catch {}

    // Update NGOs table best-effort
    try {
      const updateNgo = { updated_at: now };
      if (nextPhone !== undefined) updateNgo.phone = nextPhone || null;
      if (nextEmail !== undefined) updateNgo.email = nextEmail || null;
      if (nextContact !== undefined) updateNgo.contact_person = nextContact || null;
      await supabase.from(TABLES.NGOS).upsert({ user_id: id, ...updateNgo }, { onConflict: 'user_id' });
    } catch {}

    // Persist metadata changes and mark approved
    const updated = await writeUserMetadata(id, {
      ...(nextContact !== undefined ? { contact_person: nextContact || null, contactPerson: nextContact || null } : {}),
      ngo_profile_update_status: 'approved',
      ngo_profile_update_decided_at: now,
      ngo_profile_update_reject_reason: null,
    });

    // pending_approvals best-effort
    try {
      await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'approved', decided_at: now })
        .eq('uid', id);
    } catch {}

    emitAdminUpdate({ type: 'ngo', action: 'profile_update_approved', ngo: updated });
    emitNgoUpdate({ ngoId: id, type: 'ngo', action: 'profile_update_approved', ngo: updated });
    try {
      await logNgoActivity({ ngoId: id, action: 'profile_update_approved', entityType: 'ngo', entityId: id, details: reqPatch });
    } catch {}
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to approve NGO profile update:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/profile-update/reject', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body || {};
    const now = new Date().toISOString();

    const updated = await writeUserMetadata(id, {
      ngo_profile_update_status: 'rejected',
      ngo_profile_update_decided_at: now,
      ngo_profile_update_reject_reason: String(reason || ''),
    });

    try {
      await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'rejected', decided_at: now })
        .eq('uid', id);
    } catch {}

    emitAdminUpdate({ type: 'ngo', action: 'profile_update_rejected', ngo: updated });
    emitNgoUpdate({ ngoId: id, type: 'ngo', action: 'profile_update_rejected', ngo: updated });
    try {
      await logNgoActivity({ ngoId: id, action: 'profile_update_rejected', entityType: 'ngo', entityId: id, details: { reason } });
    } catch {}
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to reject NGO profile update:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/ngo/dashboard', ensureNgo, async (req, res) => {
  try {
    const ngoRegions = Array.isArray(req.user.ngo_regions)
      ? req.user.ngo_regions
      : Array.isArray(req.user.regions)
      ? req.user.regions
      : [];
    const regions = Array.isArray(ngoRegions) ? ngoRegions : [];

    const [escalatedRes, sosRes] = await Promise.all([
      supabase
        .from(TABLES.HELP_REQUESTS)
        .select('id,senior_id,status')
        .eq('status', 'escalated')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from(TABLES.SOS_ALERTS)
        .select('id,senior_id,user_id,status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const escalated = Array.isArray(escalatedRes.data) ? escalatedRes.data : [];
    const sos = Array.isArray(sosRes.data) ? sosRes.data : [];

    const seniorIds = Array.from(
      new Set(
        [...escalated.map((r) => r.senior_id), ...sos.map((s) => s.senior_id || s.user_id)].filter(Boolean)
      )
    );

    const seniorsById = new Map();
    if (seniorIds.length) {
      try {
        const { data: seniors } = await supabase.from(TABLES.USERS).select('*').in('id', seniorIds);
        (seniors || []).forEach((u) => seniorsById.set(u.id, parseProfileData(u)));
      } catch {}
    }

    const inRegion = (seniorId) => {
      if (!regions.length) return true;
      const s = seniorsById.get(seniorId);
      const region = s?.region || s?.city || s?.area || null;
      if (!region) return false;
      return regions.includes(region);
    };

    const escalatedActive = escalated.filter((r) => inRegion(r.senior_id)).length;
    const emergenciesActive = sos.filter((s) => inRegion(s.senior_id || s.user_id)).length;

    let availableVolunteers = 0;
    try {
      const { data: vols } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('role', 'volunteer')
        .limit(500);
      const parsed = (vols || []).map(parseProfileData);
      availableVolunteers = parsed.filter((v) => {
        if (v.is_online !== true) return false;
        if (!regions.length) return true;
        const r = v.region || v.city || v.area;
        return r && regions.includes(r);
      }).length;
    } catch {}

    res.json({
      overview: {
        escalatedActive,
        emergenciesActive,
        availableVolunteers,
        regions,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const isTableMissingError = (error) => {
  const code = error?.code;
  const msg = String(error?.message || '');
  if (code === 'PGRST205') return true;
  if (msg.includes('Could not find the table')) return true;
  if (msg.includes('relation') && msg.includes('does not exist')) return true;
  return false;
};

const timeAgoMs = (iso) => {
  const t = Date.parse(iso || '') || 0;
  if (!t) return null;
  return Math.max(0, Date.now() - t);
};

const uniqueById = (items) => {
  const seen = new Set();
  const out = [];
  (items || []).forEach((i) => {
    const id = i?.id;
    if (!id) return;
    if (seen.has(String(id))) return;
    seen.add(String(id));
    out.push(i);
  });
  return out;
};

app.get('/ngo/requests', ensureNgo, async (req, res) => {
  try {
    const { status = 'escalated', limit = 200 } = req.query || {};
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));

    const ngoRegions = Array.isArray(req.user.ngo_regions)
      ? req.user.ngo_regions
      : Array.isArray(req.user.regions)
      ? req.user.regions
      : [];
    const regions = Array.isArray(ngoRegions) ? ngoRegions : [];

    const { data: allRequests, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(500, lim));

    if (error) {
      if (isTableMissingError(error)) {
        return res.status(500).json({
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'help_requests table does not exist. Please run the SQL setup script in Supabase.',
          instructions: 'Run server/SETUP_HELP_REQUESTS_TABLE.sql in your Supabase SQL editor'
        });
      }
      throw error;
    }

    const reqs = Array.isArray(allRequests) ? allRequests : [];
    const candidates = [];

    const pendingTimeoutMs = 10 * 60 * 1000;

    reqs.forEach((r) => {
      const s = String(r.status || '').toLowerCase();
      const ageMs = timeAgoMs(r.created_at);
      const isUrgent = String(r.priority || '').toLowerCase() === 'high' || String(r.priority || '').toLowerCase() === 'urgent';
      const isTimedOut = s === 'pending' && !r.volunteer_id && typeof ageMs === 'number' && ageMs >= pendingTimeoutMs;
      const isEscalated = s === 'escalated';

      if (status === 'all') {
        if (s !== 'completed' && s !== 'cancelled') candidates.push(r);
        return;
      }

      if (status === 'escalated') {
        if (isEscalated || isTimedOut || isUrgent) candidates.push(r);
      } else if (status === 'pending') {
        if (s === 'pending') candidates.push(r);
      } else {
        if (s === String(status).toLowerCase()) candidates.push(r);
      }
    });

    const uniq = uniqueById(candidates).slice(0, lim);
    const seniorIds = Array.from(new Set(uniq.map((r) => r.senior_id).filter(Boolean)));

    const seniorsById = new Map();
    if (seniorIds.length) {
      try {
        const { data: seniors } = await supabase.from(TABLES.USERS).select('*').in('id', seniorIds);
        (seniors || []).map(parseProfileData).forEach((u) => seniorsById.set(u.id, u));
      } catch {}
    }

    const inRegion = (seniorId) => {
      if (!regions.length) return true;
      const s = seniorsById.get(seniorId);
      const region = s?.region || s?.city || s?.area || null;
      if (!region) return false;
      return regions.includes(region);
    };

    const filtered = uniq.filter((r) => inRegion(r.senior_id));
    const enriched = filtered.map((r) => ({
      ...r,
      senior: r.senior_id ? seniorsById.get(r.senior_id) || { id: r.senior_id } : null,
    }));

    res.json({ requests: enriched });
  } catch (e) {
    console.error('[ERROR] Failed to fetch NGO requests:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/requests/:id/assign-volunteer', ensureNgo, async (req, res) => {
  try {
    const { id } = req.params;
    const { volunteerId } = req.body || {};
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });

    const { data: helpRequest, error: fetchError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !helpRequest) {
      return res.status(404).json({ error: 'Help request not found' });
    }

    const status = String(helpRequest.status || '').toLowerCase();
    if (status === 'completed' || status === 'cancelled') {
      return res.status(400).json({ error: `Request is already ${helpRequest.status}` });
    }

    const now = new Date().toISOString();
    const { data: updatedRequest, error: updateError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        volunteer_id: String(volunteerId),
        status: 'accepted',
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    emitAdminUpdate({ type: 'help_request', action: 'assigned_by_ngo', request: updatedRequest, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'help_request', action: 'assigned', request: updatedRequest });
    await logNgoActivity({ ngoId: req.user.id, action: 'assign_volunteer', entityType: 'help_request', entityId: id, details: { volunteerId } });

    const seniorId = updatedRequest?.senior_id;
    let conversation = null;
    try {
      const { data: existingConv } = await supabase
        .from(TABLES.CONVERSATIONS)
        .select('*')
        .eq('senior_id', seniorId)
        .eq('companion_id', String(volunteerId));

      if (Array.isArray(existingConv) && existingConv.length > 0) {
        conversation = existingConv[0];
      } else {
        const { data: newConv } = await supabase
          .from(TABLES.CONVERSATIONS)
          .insert({ senior_id: seniorId, companion_id: String(volunteerId) })
          .select()
          .single();
        conversation = newConv;
      }
    } catch {
      conversation = { id: `conv-${seniorId}-${volunteerId}` };
    }

    if (conversation) {
      const convRoom = `conv:${conversation.id}`;
      const seniorSocketId = userSockets.get(seniorId);
      const volunteerSocketId = onlineVolunteers.get(String(volunteerId)) || userSockets.get(String(volunteerId));
      if (seniorSocketId) io.sockets.sockets.get(seniorSocketId)?.join(convRoom);
      if (volunteerSocketId) io.sockets.sockets.get(volunteerSocketId)?.join(convRoom);
      sessions.set(conversation.id, { seniorId, volunteerId: String(volunteerId) });

      const startedPayload = {
        conversationId: conversation.id,
        seniorId,
        volunteerId: String(volunteerId),
        requestType: updatedRequest?.category || 'help',
      };
      if (seniorSocketId) io.to(seniorSocketId).emit('session:started', startedPayload);
      if (volunteerSocketId) io.to(volunteerSocketId).emit('session:started', startedPayload);
    }

    res.json({ request: updatedRequest, conversation });
  } catch (e) {
    console.error('[ERROR] Failed to assign volunteer by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/requests/:id/handled', ensureNgo, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body || {};
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        status: 'completed',
        volunteer_id: null,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    emitAdminUpdate({ type: 'help_request', action: 'handled_by_ngo', request: data, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'help_request', action: 'handled', request: data });
    await logNgoActivity({ ngoId: req.user.id, action: 'handled_by_ngo', entityType: 'help_request', entityId: id, details: { notes } });

    res.json({ request: data });
  } catch (e) {
    console.error('[ERROR] Failed to mark request handled by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/requests/:id/close', ensureNgo, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution = '' } = req.body || {};
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({ status: 'completed', completed_at: now, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    emitAdminUpdate({ type: 'help_request', action: 'closed_by_ngo', request: data, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'help_request', action: 'closed', request: data });
    await logNgoActivity({ ngoId: req.user.id, action: 'close_case', entityType: 'help_request', entityId: id, details: { resolution } });
    res.json({ request: data });
  } catch (e) {
    console.error('[ERROR] Failed to close request by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/requests/:id/reject', ensureNgo, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body || {};

    const { data: existing, error: fetchError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Help request not found' });

    const now = new Date().toISOString();
    const prefix = `[NGO_REJECTED] ${String(reason || '').trim()}`.trim();
    const nextDescription = prefix ? `${prefix}${existing.description ? `\n${existing.description}` : ''}` : (existing.description || '');

    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({ status: 'cancelled', description: nextDescription, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    emitAdminUpdate({ type: 'help_request', action: 'rejected_by_ngo', request: data, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'help_request', action: 'rejected', request: data });
    await logNgoActivity({ ngoId: req.user.id, action: 'reject', entityType: 'help_request', entityId: id, details: { reason } });

    res.json({ request: data });
  } catch (e) {
    console.error('[ERROR] Failed to reject request by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/ngo/case-history', ensureNgo, async (req, res) => {
  try {
    const { limit = 200 } = req.query || {};
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));
    const ngoRegions = Array.isArray(req.user.ngo_regions)
      ? req.user.ngo_regions
      : Array.isArray(req.user.regions)
      ? req.user.regions
      : [];
    const regions = Array.isArray(ngoRegions) ? ngoRegions : [];

    let { data: requests, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .in('status', ['completed', 'cancelled'])
      .order('completed_at', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(lim);

    if (error) {
      if (isTableMissingError(error)) {
        return res.status(500).json({
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'help_requests table does not exist. Please run the SQL setup script in Supabase.',
          instructions: 'Run server/SETUP_HELP_REQUESTS_TABLE.sql in your Supabase SQL editor'
        });
      }
      throw error;
    }

    requests = Array.isArray(requests) ? requests : [];
    const seniorIds = Array.from(new Set(requests.map((r) => r.senior_id).filter(Boolean)));
    const volunteerIds = Array.from(new Set(requests.map((r) => r.volunteer_id).filter(Boolean)));

    const usersById = new Map();
    const allIds = Array.from(new Set([...seniorIds, ...volunteerIds]));
    if (allIds.length) {
      try {
        const { data: users } = await supabase.from(TABLES.USERS).select('*').in('id', allIds);
        (users || []).map(parseProfileData).forEach((u) => usersById.set(u.id, u));
      } catch {}
    }

    const inRegion = (seniorId) => {
      if (!regions.length) return true;
      const s = usersById.get(seniorId);
      const region = s?.region || s?.city || s?.area || null;
      if (!region) return false;
      return regions.includes(region);
    };

    const enriched = requests
      .filter((r) => inRegion(r.senior_id))
      .map((r) => ({
        ...r,
        senior: r.senior_id ? usersById.get(r.senior_id) || { id: r.senior_id } : null,
        volunteer: r.volunteer_id ? usersById.get(r.volunteer_id) || { id: r.volunteer_id } : null,
      }));

    res.json({ cases: enriched });
  } catch (e) {
    console.error('[ERROR] Failed to fetch NGO case history:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/ngo/volunteers', ensureNgo, async (req, res) => {
  try {
    const { limit = 200 } = req.query || {};
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));
    const ngoRegions = Array.isArray(req.user.ngo_regions)
      ? req.user.ngo_regions
      : Array.isArray(req.user.regions)
      ? req.user.regions
      : [];
    const regions = Array.isArray(ngoRegions) ? ngoRegions : [];

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .in('role', ['volunteer', 'volunteer_pending'])
      .order('updated_at', { ascending: false })
      .limit(lim);
    if (error) throw error;
    const volunteers = (data || []).map(parseProfileData).filter((v) => {
      if (!regions.length) return true;
      const r = v.region || v.city || v.area;
      return r && regions.includes(r);
    });
    res.json({ volunteers });
  } catch (e) {
    console.error('[ERROR] Failed to fetch NGO volunteers:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/volunteers/add', ensureNgo, async (req, res) => {
  try {
    const {
      email,
      full_name,
      name,
      phone,
      city,
      address,
      gender,
      skills,
      why_volunteer,
    } = req.body || {};

    const emailNorm = String(email || '').trim().toLowerCase();
    if (!emailNorm) return res.status(400).json({ error: 'email required' });

    const now = new Date().toISOString();
    const vName = String(full_name || name || '').trim();
    if (!vName) return res.status(400).json({ error: 'full_name required' });

    let existing = null;
    let existingErr = null;
    try {
      const resp = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', emailNorm)
        .maybeSingle();
      existing = resp?.data || null;
      existingErr = resp?.error || null;
    } catch (e) {
      existing = null;
      existingErr = e;
    }
    if (existingErr && existingErr.code !== 'PGRST116') {
      throw existingErr;
    }

    if (existing) {
      const exRole = String(existing.role || '').toLowerCase();
      if (exRole && exRole !== 'volunteer' && exRole !== 'volunteer_pending') {
        return res.status(400).json({ error: `User already exists with role ${existing.role}` });
      }
    }

    const id = existing?.id || randomUUID();
    const existingMeta = existing?.id ? await readUserMetadata(existing.id) : {};

    const metadata = {
      ...existingMeta,
      gender: gender !== undefined ? gender : existingMeta.gender,
      age: existingMeta.age,
      city: city !== undefined ? city : existingMeta.city,
      address: address !== undefined ? address : existingMeta.address,
      skills: skills !== undefined ? skills : existingMeta.skills,
      why_volunteer: why_volunteer !== undefined ? why_volunteer : existingMeta.why_volunteer,
      is_approved: false,
      created_by_ngo: true,
      created_by_ngo_id: req.user.id,
      created_by_ngo_at: now,
      avatar_emoji: existingMeta.avatar_emoji || avatarForGender(gender || existing?.gender),
    };

    const upsertUser = {
      id,
      email: emailNorm,
      phone: phone !== undefined ? phone : existing?.phone || null,
      name: vName,
      role: 'volunteer_pending',
      gender: gender !== undefined ? gender : existing?.gender || null,
      avatar_emoji: JSON.stringify(metadata),
      updated_at: now,
    };

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert(upsertUser, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    try {
      const upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({
          email: emailNorm,
          full_name: vName,
          phone: phone || existing?.phone || null,
          role: 'volunteer',
          status: 'pending',
          created_at: now,
          decided_at: null,
        })
        .eq('uid', id)
        .select();

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        await supabase.from(TABLES.PENDING_APPROVALS).insert({
          uid: id,
          email: emailNorm,
          full_name: vName,
          phone: phone || existing?.phone || null,
          role: 'volunteer',
          status: 'pending',
          created_at: now,
        });
      }
    } catch (e) {
      console.warn('[WARN] Failed to insert pending_approvals for NGO-added volunteer:', e?.message || e);
    }

    const parsed = parseProfileData(data);
    emitAdminUpdate({ type: 'user', action: 'volunteer_added_by_ngo', user: parsed, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'volunteer', action: 'added', volunteer: parsed });
    await logNgoActivity({ ngoId: req.user.id, action: 'add_volunteer', entityType: 'user', entityId: id, details: { email: emailNorm } });

    res.json({ volunteer: parsed });
  } catch (e) {
    console.error('[ERROR] Failed to add volunteer by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/ngo/emergencies', ensureNgo, async (req, res) => {
  try {
    const { status = 'active', limit = 200 } = req.query || {};
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));

    const ngoRegions = Array.isArray(req.user.ngo_regions)
      ? req.user.ngo_regions
      : Array.isArray(req.user.regions)
      ? req.user.regions
      : [];
    const regions = Array.isArray(ngoRegions) ? ngoRegions : [];

    let query = supabase.from(TABLES.SOS_ALERTS).select('*');
    const st = String(status || 'active').toLowerCase();
    if (st !== 'all') query = query.eq('status', st);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(lim);
    if (error) {
      if (isTableMissingError(error)) {
        return res.status(500).json({
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'sos_alerts table does not exist. Please create it in Supabase.'
        });
      }
      throw error;
    }

    const alerts = Array.isArray(data) ? data : [];
    const seniorIds = Array.from(
      new Set(alerts.map((a) => a.senior_id || a.user_id || a.seniorId).filter(Boolean))
    );
    const seniorsById = new Map();
    if (seniorIds.length) {
      try {
        const { data: seniors } = await supabase.from(TABLES.USERS).select('*').in('id', seniorIds);
        (seniors || []).map(parseProfileData).forEach((u) => seniorsById.set(u.id, u));
      } catch {}
    }

    const inRegion = (seniorId) => {
      if (!regions.length) return true;
      const s = seniorsById.get(seniorId);
      const region = s?.region || s?.city || s?.area || null;
      if (!region) return false;
      return regions.includes(region);
    };

    const enriched = alerts
      .map((a) => {
        const sid = a.senior_id || a.user_id || a.seniorId;
        return { ...a, senior: sid ? seniorsById.get(sid) || { id: sid } : null };
      })
      .filter((a) => {
        const sid = a.senior_id || a.user_id || a.seniorId;
        return sid ? inRegion(sid) : true;
      });

    res.json({ emergencies: enriched });
  } catch (e) {
    console.error('[ERROR] Failed to fetch NGO emergencies:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/emergencies/:id/close', ensureNgo, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body || {};
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .update({ status: 'resolved', resolution: String(notes || ''), resolved_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return res.status(500).json({
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'sos_alerts table does not exist. Please create it in Supabase.'
        });
      }
      throw error;
    }

    emitAdminUpdate({ type: 'sos_alert', action: 'closed_by_ngo', alert: data, ngoId: req.user.id });
    emitNgoUpdate({ ngoId: req.user.id, type: 'sos_alert', action: 'closed', alert: data });
    await logNgoActivity({ ngoId: req.user.id, action: 'close_emergency', entityType: 'sos_alert', entityId: id, details: { notes } });

    res.json({ emergency: data });
  } catch (e) {
    console.error('[ERROR] Failed to close emergency by NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/ngo/profile/request-update', ensureNgo, async (req, res) => {
  try {
    const { contactPerson, phone, email } = req.body || {};
    const patch = {
      contactPerson: contactPerson !== undefined ? String(contactPerson) : undefined,
      phone: phone !== undefined ? String(phone) : undefined,
      email: email !== undefined ? String(email) : undefined,
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    const now = new Date().toISOString();
    const updated = await writeUserMetadata(req.user.id, {
      ngo_profile_update_requested_at: now,
      ngo_profile_update_request: patch,
      ngo_profile_update_status: 'pending',
    });

    try {
      await supabase.from(TABLES.PENDING_APPROVALS).insert({
        uid: req.user.id,
        email: req.user.email,
        full_name: req.user.name || req.user.ngo_name || 'NGO',
        phone: req.user.phone || null,
        role: 'ngo_profile_update',
        status: 'pending',
        created_at: now,
      });
    } catch {}

    emitAdminUpdate({ type: 'ngo', action: 'profile_update_requested', ngo: updated });
    emitNgoUpdate({ ngoId: req.user.id, type: 'ngo', action: 'profile_update_requested', ngo: updated });
    await logNgoActivity({ ngoId: req.user.id, action: 'profile_update_requested', entityType: 'ngo', entityId: req.user.id, details: patch });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to request NGO profile update:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/sos-alerts', ensureAuth, async (req, res) => {
  try {
    const { message = 'SOS alert triggered', type = 'panic' } = req.body || {};
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .insert({
        senior_id: req.user.id,
        message: String(message || ''),
        type: String(type || ''),
        status: 'active',
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return res.status(500).json({
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'sos_alerts table does not exist. Please create it in Supabase.'
        });
      }
      throw error;
    }

    emitAdminUpdate({ type: 'sos_alert', action: 'created', alert: data });
    emitNgoUpdate({ type: 'sos_alert', action: 'created', alert: data });

    res.status(201).json({ alert: data });
  } catch (e) {
    console.error('[ERROR] Failed to create SOS alert:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/volunteers/available', ensureAuth, async (req, res) => {
  try {
    // Fetch volunteers with role='volunteer' and is_approved=true
    // Also check metadata for is_approved in case it's stored there
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'volunteer')
      .limit(50);
    
    if (error) throw error;
    
    // Filter to only include approved volunteers
    // Check both is_approved field and metadata.is_approved
    const approvedVolunteers = data
      .map(parseProfileData)
      .filter(v => {
        // Check explicit is_approved field
        if (v.is_approved === true) return true;
        // Check metadata
        if (v.is_approved === false) return false;
        // If undefined, check if role is volunteer (assume approved if role is set correctly)
        return v.role === 'volunteer';
      })
      .filter(v => v.is_online === true)
      .slice(0, 20);
    
    res.json({ volunteers: approvedVolunteers });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch available volunteers:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/volunteers/me/availability', ensureAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const parsed = parseProfileData({ id: req.user.id, email: req.user.email, phone: req.user.phone, ...data });
    res.json({ isOnline: parsed?.is_online === true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/volunteers/me/availability', ensureAuth, async (req, res) => {
  try {
    const { isOnline } = req.body || {};
    const updated = await setVolunteerAvailability({ volunteerId: req.user.id, isOnline: !!isOnline });
    res.json({ user: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Help Request Endpoints
app.post('/help-requests', ensureAuth, async (req, res) => {
  try {
    const { category, description, priority } = req.body || {};
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .insert({
        senior_id: req.user.id,
        category: category || 'General',
        description: description || '',
        priority: priority || 'medium',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    emitAdminUpdate({ type: 'help_request', action: 'created', request: data });
    res.status(201).json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to create help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/help-requests', ensureAuth, async (req, res) => {
  try {
    console.log(`[DEBUG] Fetching help requests for user ${req.user.id} (role: ${req.user.role})`);
    const { status } = req.query;
    let query = supabase.from(TABLES.HELP_REQUESTS).select();

    if (req.user.role === 'volunteer' || req.user.role === 'caregiver') {
      // Volunteers see pending requests (all pending) or their own accepted requests
      if (status === 'accepted') {
        // Show only their accepted requests
        query = query.eq('volunteer_id', req.user.id).eq('status', 'accepted');
        console.log(`[DEBUG] Caregiver viewing accepted requests`);
      } else if (status === 'completed') {
        query = query.eq('volunteer_id', req.user.id).eq('status', 'completed');
        console.log(`[DEBUG] Caregiver viewing completed requests`);
      } else if (status === 'all') {
        query = query.or(
          `status.eq.pending,and(status.eq.accepted,volunteer_id.eq.${req.user.id}),and(status.eq.completed,volunteer_id.eq.${req.user.id}),and(status.eq.escalated,volunteer_id.eq.${req.user.id})`
        );
        console.log(`[DEBUG] Caregiver viewing all relevant requests (pending + own accepted/completed)`);
      } else {
        // Default: show all pending requests
        query = query.eq('status', 'pending');
        console.log(`[DEBUG] Caregiver viewing pending requests (status=pending filter applied)`);
      }
    } else if (req.user.role === 'elderly' || req.user.role === 'senior') {
      // Seniors see only their own requests
      query = query.eq('senior_id', req.user.id);
      if (status) {
        query = query.eq('status', status);
      }
      console.log(`[DEBUG] Senior viewing own requests (senior_id=${req.user.id})`);
    } else {
      // Admin sees all requests
      if (status) {
        query = query.eq('status', status);
      }
      console.log(`[DEBUG] Admin viewing all requests`);
    }

    const { data: requests, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error(`[ERROR] Database query error:`, error);
      console.error(`[ERROR] Error code:`, error.code);
      console.error(`[ERROR] Error message:`, error.message);
      
      // Check if table doesn't exist
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.error('[ERROR] ========================================');
        console.error('[ERROR] help_requests table does not exist!');
        console.error('[ERROR] ========================================');
        console.error('[ERROR] Please create the table in Supabase using the SQL in:');
        console.error('[ERROR] File: server/SETUP_HELP_REQUESTS_TABLE.sql');
        console.error('[ERROR] ========================================');
        return res.status(500).json({ 
          error: 'Database table not configured',
          code: 'TABLE_NOT_FOUND',
          message: 'help_requests table does not exist. Please run the SQL setup script in Supabase.',
          instructions: 'Run server/SETUP_HELP_REQUESTS_TABLE.sql in your Supabase SQL editor'
        });
      }
      
      throw error;
    }
    
    console.log(`[DEBUG] Query successful, found ${(requests || []).length} requests`);
    console.log(`[DEBUG] Requests data:`, requests);
    
    // If no requests, return empty array with diagnostic info
    if (!requests || requests.length === 0) {
      console.log(`[DEBUG] No requests found (this is OK if no seniors have requested help yet)`);
      return res.json({ requests: [], message: 'No pending requests' });
    }
    
    // Fetch senior data separately for each request
    const enrichedRequests = await Promise.all((requests || []).map(async (helpRequest) => {
      try {
        const { data: senior, error: seniorError } = await supabase
          .from(TABLES.USERS)
          .select()
          .eq('id', helpRequest.senior_id)
          .single();
        
        if (seniorError && seniorError.code !== 'PGRST116') {
          console.warn(`[WARN] Senior fetch error for ${helpRequest.senior_id}:`, seniorError);
        }
        
        return {
          ...helpRequest,
          senior: senior ? parseProfileData(senior) : null
        };
      } catch (e) {
        console.warn(`[WARN] Failed to fetch senior for request ${helpRequest.id}:`, e.message);
        return {
          ...helpRequest,
          senior: null
        };
      }
    }));

    console.log(`[DEBUG] Returning ${enrichedRequests.length} enriched requests`);
    res.json({ requests: enrichedRequests });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch help requests:`, e);
    res.status(500).json({ error: e.message, details: e.toString() });
  }
});

app.put('/help-requests/:id/accept', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[REQUEST] Accepting help request ${id} by volunteer ${req.user.id}`);
    
    // First, fetch the request to verify it exists and is pending
    const { data: helpRequest, error: fetchError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !helpRequest) {
      console.error(`[REQUEST] Help request not found:`, fetchError);
      return res.status(404).json({ error: 'Help request not found' });
    }

    if (helpRequest.status !== 'pending') {
      console.warn(`[REQUEST] Help request is not pending (status=${helpRequest.status})`);
      return res.status(400).json({ error: `Request is already ${helpRequest.status}` });
    }

    // Now update it
    const { data: updatedRequest, error: updateError } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        volunteer_id: req.user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[REQUEST] Accept failed:`, updateError);
      return res.status(500).json({ error: 'Failed to accept request' });
    }

    emitAdminUpdate({ type: 'help_request', action: 'accepted', request: updatedRequest });
    
    const { senior_id: seniorId, category: requestType } = updatedRequest;
    
    console.log(`[REQUEST] Successfully accepted by ${req.user.id}, creating conversation with ${seniorId}`);
    
    // Get or create conversation
    let conversation;
    try {
      const { data: existingConv, error: convFetchError } = await supabase
        .from(TABLES.CONVERSATIONS)
        .select()
        .eq('senior_id', seniorId)
        .eq('companion_id', req.user.id);
      
      if (existingConv && existingConv.length > 0) {
        conversation = existingConv[0];
        console.log(`[REQUEST] Using existing conversation ${conversation.id}`);
      } else {
        // Create new conversation if doesn't exist
        console.log(`[REQUEST] Creating new conversation`);
        const { data: newConv, error: createError } = await supabase
          .from(TABLES.CONVERSATIONS)
          .insert({ senior_id: seniorId, companion_id: req.user.id })
          .select()
          .single();
        
        if (createError || !newConv) {
          console.warn(`[REQUEST] Failed to create conversation:`, createError);
          // Continue anyway - conversations table might not exist
          conversation = { id: `conv-${seniorId}-${req.user.id}` };
        } else {
          conversation = newConv;
          console.log(`[REQUEST] Created new conversation ${newConv.id}`);
        }
      }
    } catch (e) {
      console.warn(`[REQUEST] Conversation fetch error:`, e.message);
      conversation = { id: `conv-${seniorId}-${req.user.id}` };
    }

    // Wire sockets into the conversation room
    if (conversation) {
      const convRoom = `conv:${conversation.id}`;
      const seniorSocketId = userSockets.get(seniorId);
      const volunteerSocketId = onlineVolunteers.get(req.user.id);
      
      console.log(`[REQUEST] Wiring sockets to room ${convRoom}`);
      console.log(`[REQUEST] Senior ${seniorId} socket: ${seniorSocketId}`);
      console.log(`[REQUEST] Volunteer ${req.user.id} socket: ${volunteerSocketId}`);
      
      if (seniorSocketId) io.sockets.sockets.get(seniorSocketId)?.join(convRoom);
      if (volunteerSocketId) io.sockets.sockets.get(volunteerSocketId)?.join(convRoom);
      
      sessions.set(conversation.id, { seniorId, volunteerId: req.user.id });

      // Notify both parties via socket
      const startedPayload = { 
        conversationId: conversation.id, 
        seniorId, 
        volunteerId: req.user.id,
        requestType,
      };
      
      // Send to senior - try direct socket first, then broadcast to all clients
      if (seniorSocketId) {
        io.to(seniorSocketId).emit('session:started', startedPayload);
        console.log(`[REQUEST] ✅ Notified senior ${seniorId} via direct socket`);
      } else {
        // Fallback: broadcast to all sockets (senior might be a new connection)
        io.emit('session:started', startedPayload);
        console.warn(`[REQUEST] ⚠️  Senior ${seniorId} not in userSockets, broadcasting to all`);
      }
      
      // Send to volunteer
      if (volunteerSocketId) {
        io.to(volunteerSocketId).emit('session:started', startedPayload);
        console.log(`[REQUEST] ✅ Notified volunteer ${req.user.id} via direct socket`);
      }
      
      // Notify other volunteers
      onlineVolunteers.forEach((volSocketId, volId) => {
        if (volId !== req.user.id) {
          io.to(volSocketId).emit('request:claimed', { seniorId, volunteerId: req.user.id });
        }
      });
    }

    // Return both the request and the conversation ID
    res.json({ 
      request: updatedRequest,
      conversation: { id: conversation.id },
      conversationId: conversation.id
    });
  } catch (e) {
    console.error(`[ERROR] Failed to accept help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

// GET /conversations - Get all conversations for the current user
app.get('/conversations', ensureAuth, async (req, res) => {
  try {
    console.log(`[CONVERSATIONS] Fetching conversations for user ${req.user.id} (role: ${req.user.role})`);
    
    let query = supabase.from(TABLES.CONVERSATIONS).select('*');
    
    // Filter based on user role
    if (req.user.role === 'volunteer' || req.user.role === 'caregiver') {
      // Volunteers see conversations where they are the companion
      query = query.eq('companion_id', req.user.id);
      console.log(`[CONVERSATIONS] Caregiver viewing their conversations as companion`);
    } else if (req.user.role === 'elderly' || req.user.role === 'senior') {
      // Seniors see conversations where they are the senior
      query = query.eq('senior_id', req.user.id);
      console.log(`[CONVERSATIONS] Senior viewing their conversations`);
    }
    
    const { data: conversations, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });
    
    if (error) {
      console.error(`[ERROR] Conversations query error:`, error);
      
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.error('[ERROR] conversations table does not exist');
        return res.json({ conversations: [] });
      }
      
      throw error;
    }
    
    console.log(`[CONVERSATIONS] Found ${(conversations || []).length} conversations`);
    
    if (!conversations || conversations.length === 0) {
      return res.json({ conversations: [] });
    }
    
    // Fetch companion/senior data for each conversation
    const enrichedConversations = await Promise.all((conversations || []).map(async (conv) => {
      try {
        const companionId = req.user.role === 'volunteer' || req.user.role === 'caregiver' ? conv.senior_id : conv.companion_id;
        
        const { data: user, error: userError } = await supabase
          .from(TABLES.USERS)
          .select()
          .eq('id', companionId)
          .single();
        
        if (userError && userError.code !== 'PGRST116') {
          console.warn(`[WARN] User fetch error for ${companionId}:`, userError);
        }
        
        return {
          ...conv,
          companion: user ? parseProfileData(user) : { id: companionId }
        };
      } catch (e) {
        console.warn(`[WARN] Failed to fetch user for conversation ${conv.id}:`, e.message);
        return {
          ...conv,
          companion: { id: req.user.role === 'volunteer' || req.user.role === 'caregiver' ? conv.senior_id : conv.companion_id }
        };
      }
    }));
    
    console.log(`[CONVERSATIONS] Returning ${enrichedConversations.length} enriched conversations`);
    res.json({ conversations: enrichedConversations });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch conversations:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/help-requests/:id/complete', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('volunteer_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    emitAdminUpdate({ type: 'help_request', action: 'completed', request: data });
    res.json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to complete help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Admin endpoints
app.get('/admin/volunteers/pending', ensureAdmin, async (req, res) => {
  try {
    // Primary source: users table
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .in('role', ['volunteer_pending', 'volunteer'])
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const parsed = (data || []).map(parseProfileData);

    let pending = parsed.filter(v => v.role === 'volunteer_pending' || (v.role === 'volunteer' && v.is_approved !== true));

    // If pending_approvals is available, exclude anyone whose latest decision is approved/rejected
    try {
      const { data: approvalRows, error: apprRowsErr } = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .select('*')
        .order('created_at', { ascending: false });

      if (!apprRowsErr && Array.isArray(approvalRows) && approvalRows.length > 0) {
        const latestById = new Map();
        approvalRows.forEach((r) => {
          const uid = r.user_id || r.uid;
          if (!uid) return;
          const ts = Date.parse(r.decided_at || r.created_at || '') || 0;
          const prev = latestById.get(uid);
          if (!prev || ts > prev.ts) {
            latestById.set(uid, { ts, status: r.status });
          }
        });

        pending = pending.filter(v => {
          const decision = latestById.get(v.id);
          if (!decision) return true;
          return decision.status === 'pending';
        });
      }
    } catch {}

    res.json({ volunteers: pending });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/volunteers/approved', ensureAdmin, async (req, res) => {
  try {
    // Primary source: users table (approved volunteers)
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'volunteer')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    let approvedVolunteers = (data || []).map(parseProfileData).filter(v => v.is_approved === true);

    // If pending_approvals is available, only include those whose latest decision is approved
    try {
      const { data: approvalRows, error: apprRowsErr } = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .select('*')
        .order('created_at', { ascending: false });

      if (!apprRowsErr && Array.isArray(approvalRows) && approvalRows.length > 0) {
        const latestById = new Map();
        approvalRows.forEach((r) => {
          const uid = r.user_id || r.uid;
          if (!uid) return;
          const ts = Date.parse(r.decided_at || r.created_at || '') || 0;
          const prev = latestById.get(uid);
          if (!prev || ts > prev.ts) {
            latestById.set(uid, { ts, status: r.status });
          }
        });

        approvedVolunteers = approvedVolunteers.filter(v => {
          const decision = latestById.get(v.id);
          if (!decision) return true;
          return decision.status === 'approved';
        });
      }
    } catch {}

    res.json({ volunteers: approvedVolunteers });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch approved volunteers:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/volunteers/:id/approve', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] ========== APPROVAL REQUEST ==========`);
  console.log(`[ADMIN] Volunteer ID: ${id}`);
  console.log(`[ADMIN] Admin user:`, JSON.stringify(req.user, null, 2));
  
  try {
    // Fetch current user to get metadata
    const { data: user, error: fetchError } = await supabase.from(TABLES.USERS).select('*').eq('id', id).single();
    
    if (fetchError) {
      console.error(`[ADMIN] Error fetching user:`, fetchError);
      return res.status(404).json({ error: `Volunteer not found: ${fetchError.message}` });
    }
    
    if (!user) {
      console.error(`[ADMIN] User not found with id: ${id}`);
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    console.log(`[ADMIN] Current user data:`, JSON.stringify(user, null, 2));
    
    // Loosen validation: allow approval even if role drifted; we'll set correct role below
    if (user.role !== 'volunteer_pending' && user.role !== 'volunteer') {
      console.warn(`[ADMIN] Approving user ${id} from role ${user.role} -> volunteer`);
    }
    
    let metadata = {};
    if (user.avatar_emoji) {
      if (typeof user.avatar_emoji === 'object') {
        metadata = user.avatar_emoji;
      } else if (typeof user.avatar_emoji === 'string' && (user.avatar_emoji.startsWith('{') || user.avatar_emoji.startsWith('['))) {
        try {
          metadata = JSON.parse(user.avatar_emoji);
        } catch (e) {
          console.warn(`[WARN] Failed to parse metadata, using empty object`);
        }
      }
    }
    
    // Update metadata with approved status
    metadata.is_approved = true;
    const updatedEmoji = JSON.stringify(metadata);
    const now = new Date().toISOString();

    console.log(`[ADMIN] Attempting to update user with:`, {
      role: 'volunteer',
      is_approved: true,
      updated_at: now
    });

    // Update role, is_approved, metadata, and timestamp
    let { data, error } = await supabase
      .from(TABLES.USERS)
      .update({ 
        role: 'volunteer',
        is_approved: true,
        avatar_emoji: updatedEmoji,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`[ERROR] Primary update failed:`, error);
      console.error(`[ERROR] Error details:`, JSON.stringify(error, null, 2));
      
      // Fallback: try without is_approved field (in case column doesn't exist)
      console.log(`[ADMIN] Attempting fallback update...`);
      const fallback = await supabase
        .from(TABLES.USERS)
        .update({ 
          role: 'volunteer',
          avatar_emoji: updatedEmoji,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
      
      if (fallback.error) {
        console.error(`[ERROR] Fallback update also failed:`, fallback.error);
        return res.status(500).json({ 
          error: `Failed to update volunteer: ${fallback.error.message}`,
          details: fallback.error
        });
      }
      
      console.log(`[ADMIN] Fallback update succeeded`);
      data = fallback.data;
    } else {
      console.log(`[ADMIN] Primary update succeeded`);
    }
    
    console.log(`[ADMIN] Updated user data:`, JSON.stringify(data, null, 2));
    
    // Persist decision in pending_approvals (by uid)
    try {
      let upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'approved', decided_at: now })
        .eq('uid', id)
        .select();

      if (upd?.error) {
        upd = await supabase
          .from(TABLES.PENDING_APPROVALS)
          .update({ status: 'approved' })
          .eq('uid', id)
          .select();
      }

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        const ins = await supabase
          .from(TABLES.PENDING_APPROVALS)
          .insert({ uid: id, status: 'approved', decided_at: now, created_at: now })
          .select();
        if (ins?.error) {
          await supabase
            .from(TABLES.PENDING_APPROVALS)
            .insert({ uid: id, status: 'approved', created_at: now })
            .select();
        }
      }

      await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'approved' })
        .eq('uid', id);

      console.log(`[ADMIN] pending_approvals persisted as approved for ${id}`);
    } catch (e) {
      console.warn(`[WARN] Failed to persist pending_approvals (approved) for ${id}:`, e?.message || e);
    }

    // Return the updated volunteer data
    const parsedData = parseProfileData(data);
    emitAdminUpdate({ type: 'user', action: 'volunteer_approved', user: parsedData });
    console.log(`[ADMIN] Returning parsed data:`, JSON.stringify(parsedData, null, 2));
    console.log(`[ADMIN] ========== APPROVAL SUCCESS ==========`);
    
    res.status(200).json({ 
      volunteer: parsedData, 
      success: true, 
      message: 'Volunteer approved successfully' 
    });
  } catch (e) {
    console.error(`[ERROR] ========== APPROVAL EXCEPTION ==========`);
    console.error(`[ERROR] Exception type:`, e.constructor.name);
    console.error(`[ERROR] Exception message:`, e.message);
    console.error(`[ERROR] Exception stack:`, e.stack);
    res.status(500).json({ 
      error: e.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

app.post('/admin/volunteers/:id/reject', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] Rejecting volunteer: ${id}`);
  try {
    // Fetch current user to get metadata
    const { data: user } = await supabase.from(TABLES.USERS).select('*').eq('id', id).single();
    
    if (!user) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    let metadata = {};
    if (user.avatar_emoji) {
      if (typeof user.avatar_emoji === 'object') {
        metadata = user.avatar_emoji;
      } else if (typeof user.avatar_emoji === 'string' && (user.avatar_emoji.startsWith('{') || user.avatar_emoji.startsWith('['))) {
        try {
          metadata = JSON.parse(user.avatar_emoji);
        } catch (e) {
          console.warn(`[WARN] Failed to parse metadata, using empty object`);
        }
      }
    }
    
    // Update metadata with rejected status
    metadata.is_approved = false;
    const updatedEmoji = JSON.stringify(metadata);
    const now = new Date().toISOString();

    let { data, error } = await supabase
      .from(TABLES.USERS)
      .update({ 
        role: 'volunteer_rejected',
        is_approved: false,
        avatar_emoji: updatedEmoji,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.warn(`[WARN] Combined rejection failed, trying role+metadata for ${id}:`, error.message);
      const fallback = await supabase
        .from(TABLES.USERS)
        .update({ 
          role: 'volunteer_rejected',
          avatar_emoji: updatedEmoji,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
        
      if (fallback.error) {
        console.error(`[ERROR] Fallback rejection failed for ${id}:`, fallback.error);
        throw fallback.error;
      }
      data = fallback.data;
    }
    
    console.log(`[ADMIN] Volunteer ${id} rejected successfully`);
    console.log(`[ADMIN] Updated data:`, JSON.stringify(data, null, 2));

    // Persist decision in pending_approvals (by uid)
    try {
      let upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'rejected', decided_at: now })
        .eq('uid', id)
        .select();

      if (upd?.error) {
        upd = await supabase
          .from(TABLES.PENDING_APPROVALS)
          .update({ status: 'rejected' })
          .eq('uid', id)
          .select();
      }

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        const ins = await supabase
          .from(TABLES.PENDING_APPROVALS)
          .insert({ uid: id, status: 'rejected', decided_at: now, created_at: now })
          .select();
        if (ins?.error) {
          await supabase
            .from(TABLES.PENDING_APPROVALS)
            .insert({ uid: id, status: 'rejected', created_at: now })
            .select();
        }
      }

      await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'rejected' })
        .eq('uid', id);

      console.log(`[ADMIN] pending_approvals persisted as rejected for ${id}`);
    } catch (e) {
      console.warn(`[WARN] Failed to persist pending_approvals (rejected) for ${id}:`, e?.message || e);
    }

    // Return the updated volunteer data
    const parsedData = parseProfileData(data);
    emitAdminUpdate({ type: 'user', action: 'volunteer_rejected', user: parsedData });
    console.log(`[ADMIN] Returning parsed data:`, JSON.stringify(parsedData, null, 2));
    res.status(200).json({ volunteer: parsedData, success: true, message: 'Volunteer rejected successfully' });
  } catch (e) {
    console.error(`[ERROR] Rejection failed for ${id}:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/stats', ensureAdmin, async (req, res) => {
  try {
    // Get counts from various tables
    const results = await Promise.all([
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).or('role.eq.elderly,role.eq.senior'),
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).or('role.eq.volunteer,role.eq.caregiver'),
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).in('role', ['ngo', 'ngo_pending', 'ngo_rejected']),
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo'),
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo_pending'),
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo_rejected'),
      // Pending help requests
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from(TABLES.SOS_ALERTS).select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      // Best-effort resolved breakdown (depends on schema having volunteer_id)
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'completed').is('volunteer_id', null),
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'completed').not('volunteer_id', 'is', null),
    ]);

    // Log any errors but continue
    results.forEach((r, idx) => {
      if (r.error) console.warn(`[WARN] Admin stats query ${idx} failed:`, r.error.message);
    });

    const totalSeniors = results[0].count || 0;
    const activeCaregivers = results[1].count || 0;
    const totalNgos = results[2].count || 0;
    const approvedNgos = results[3].count || 0;
    const pendingNgos = results[4].count || 0;
    const rejectedNgos = results[5].count || 0;
    const pendingRequests = results[6].count || 0;
    const sosAlerts = results[7].count || 0;
    const helpResolved = results[8].count || 0;

    let ngoHelpResolved = results[9].count || 0;
    let volunteerHelpResolved = results[10].count || 0;
    if (results[9].error || results[10].error) {
      ngoHelpResolved = 0;
      volunteerHelpResolved = 0;
    }

    res.json({
      stats: {
        totalSeniors,
        activeCaregivers,
        totalNgos,
        approvedNgos,
        pendingNgos,
        rejectedNgos,
        pendingRequests,
        sosAlerts,
        helpResolved,
        ngoHelpResolved,
        volunteerHelpResolved,
        avgResponseTime: '12 min' // Placeholder
      }
    });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch admin stats:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/incidents', ensureAdmin, async (req, res) => {
  try {
    const { status = 'all', q = '' } = req.query || {};
    const qNorm = String(q || '').trim().toLowerCase();

    let helpIncidents = [];
    try {
      const { data: help, error } = await supabase
        .from(TABLES.HELP_REQUESTS)
        .select('*')
        .eq('status', 'escalated')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      helpIncidents = (help || []).map((r) => ({
        source: 'help_request',
        id: r.id,
        type: 'Escalation',
        priority: r.priority || 'medium',
        seniorId: r.senior_id,
        volunteerId: r.volunteer_id,
        description: r.description || '',
        status: 'open',
        createdAt: r.created_at,
      }));
    } catch {}

    let sosIncidents = [];
    try {
      const { data: sos, error } = await supabase
        .from(TABLES.SOS_ALERTS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      sosIncidents = (sos || []).map((s) => {
        const st = String(s.status || '').toLowerCase();
        const mappedStatus = st === 'active' ? 'open' : 'resolved';
        return {
          source: 'sos_alert',
          id: s.id,
          type: 'SOS',
          priority: 'critical',
          seniorId: s.senior_id || s.user_id || s.seniorId,
          description: s.message || s.description || 'SOS alert triggered',
          status: mappedStatus,
          createdAt: s.created_at,
        };
      });
    } catch {}

    const combined = [...helpIncidents, ...sosIncidents].sort((a, b) => {
      const ta = Date.parse(a.createdAt || '') || 0;
      const tb = Date.parse(b.createdAt || '') || 0;
      return tb - ta;
    });

    const uniqueSeniorIds = Array.from(new Set(combined.map((c) => c.seniorId).filter(Boolean)));
    const seniorsById = new Map();
    if (uniqueSeniorIds.length > 0) {
      try {
        const { data: seniors } = await supabase
          .from(TABLES.USERS)
          .select('*')
          .in('id', uniqueSeniorIds);
        (seniors || []).forEach((u) => seniorsById.set(u.id, parseProfileData(u)));
      } catch {}
    }

    let incidents = combined.map((c) => ({
      ...c,
      senior: c.seniorId ? seniorsById.get(c.seniorId) || { id: c.seniorId } : null,
    }));

    if (status !== 'all') {
      incidents = incidents.filter((i) => i.status === status);
    }
    if (qNorm) {
      incidents = incidents.filter((i) => {
        const name = (i?.senior?.name || i?.senior?.full_name || '').toLowerCase();
        const desc = String(i.description || '').toLowerCase();
        return name.includes(qNorm) || desc.includes(qNorm) || String(i.id).toLowerCase().includes(qNorm);
      });
    }

    res.json({ incidents });
  } catch (e) {
    console.error('[ERROR] Failed to fetch admin incidents:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/analytics', ensureAdmin, async (req, res) => {
  try {
    const { period = 'week' } = req.query || {};
    const now = new Date();
    const days = period === 'today' ? 1 : period === 'month' ? 30 : period === 'year' ? 365 : 7;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: requests, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) throw error;

    const total = (requests || []).length;
    const breakdown = {};
    const byDay = new Map();
    let responseSamples = [];

    (requests || []).forEach((r) => {
      const cat = String(r.category || 'Other');
      breakdown[cat] = (breakdown[cat] || 0) + 1;

      const d = new Date(r.created_at || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) || 0) + 1);

      const acceptedAt = r.accepted_at ? Date.parse(r.accepted_at) : null;
      const createdAt = r.created_at ? Date.parse(r.created_at) : null;
      if (acceptedAt && createdAt && acceptedAt >= createdAt) {
        responseSamples.push(acceptedAt - createdAt);
      }
    });

    responseSamples = responseSamples.slice(0, 500);
    const avgMs = responseSamples.length ? Math.round(responseSamples.reduce((a, b) => a + b, 0) / responseSamples.length) : 0;
    const avgMin = avgMs ? Math.max(1, Math.round(avgMs / 60000)) : 0;

    const completed = (requests || []).filter((r) => String(r.status || '').toLowerCase() === 'completed');
    const volunteerCompleted = completed.filter((r) => !!r.volunteer_id).length;
    const ngoCompleted = completed.filter((r) => !r.volunteer_id).length;

    let ngoCounts = { total: 0, approved: 0, pending: 0, rejected: 0 };
    try {
      const countResults = await Promise.all([
        supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).in('role', ['ngo', 'ngo_pending', 'ngo_rejected']),
        supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo'),
        supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo_pending'),
        supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'ngo_rejected'),
      ]);
      ngoCounts = {
        total: countResults[0].count || 0,
        approved: countResults[1].count || 0,
        pending: countResults[2].count || 0,
        rejected: countResults[3].count || 0,
      };
    } catch {}

    const weeklyData = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-7)
      .map(([day, count]) => ({ day, requests: count }));

    res.json({
      metrics: {
        helpRequests: { total, breakdown },
        responseTime: { averageMinutes: avgMin },
        resolution: { completed: completed.length, volunteerCompleted, ngoCompleted },
        ngos: ngoCounts,
      },
      trend: weeklyData,
    });
  } catch (e) {
    console.error('[ERROR] Failed to fetch admin analytics:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/leaderboard/caregivers', ensureAdmin, async (req, res) => {
  try {
    const { period = 'week', limit = 5 } = req.query || {};
    const now = new Date();
    const days = period === 'today' ? 1 : period === 'month' ? 30 : period === 'year' ? 365 : 7;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const lim = Math.min(25, Math.max(1, Number(limit) || 5));

    const { data: requests, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false })
      .limit(3000);
    if (error) throw error;

    const counts = new Map();
    (requests || []).forEach((r) => {
      const vid = r.volunteer_id;
      if (!vid) return;
      counts.set(vid, (counts.get(vid) || 0) + 1);
    });

    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, lim);

    const volunteerIds = ranked.map(([id]) => id);
    const byId = new Map();
    if (volunteerIds.length) {
      try {
        const { data: users } = await supabase
          .from(TABLES.USERS)
          .select('*')
          .in('id', volunteerIds);
        (users || []).forEach((u) => byId.set(u.id, parseProfileData(u)));
      } catch {}
    }

    const leaders = ranked.map(([id, c]) => {
      const u = byId.get(id);
      return {
        id,
        name: u?.name || u?.full_name || 'Volunteer',
        requests: c,
        rating: u?.rating || 0,
      };
    });

    res.json({ leaders });
  } catch (e) {
    console.error('[ERROR] Failed to fetch admin leaderboard:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/users', ensureAdmin, async (req, res) => {
  try {
    const { q = '', role = 'all', status = 'all', verified = 'all', limit = 200 } = req.query || {};
    const qNorm = String(q || '').trim().toLowerCase();
    const roleNorm = String(role || 'all').trim().toLowerCase();
    const statusNorm = String(status || 'all').trim().toLowerCase();
    const verifiedNorm = String(verified || 'all').trim().toLowerCase();
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(lim);
    if (error) throw error;

    let users = (data || []).map(parseProfileData);

    users = users.map((u) => {
      const isBlocked = u.is_blocked === true || u.blocked === true;
      const isVerified = u.is_verified === true || u.verified === true || u.isApproved === true;
      const regionVal = u.region || u.city || u.state || u.location || 'N/A';
      const lastActive = u.last_active_at || u.last_seen_at || u.updated_at || u.created_at || null;
      const normalizedRole = String(u.role || '').toLowerCase();
      return {
        id: u.id,
        name: u.name || u.full_name || u.displayName || 'Anonymous',
        email: u.email,
        phone: u.phone,
        role: normalizedRole,
        status: isBlocked ? 'blocked' : 'active',
        region: regionVal,
        verified: isVerified,
        lastActive,
        raw: u,
      };
    });

    if (roleNorm !== 'all') {
      users = users.filter((u) => u.role === roleNorm);
    }
    if (statusNorm !== 'all') {
      users = users.filter((u) => u.status === statusNorm);
    }
    if (verifiedNorm !== 'all') {
      const want = verifiedNorm === 'true' || verifiedNorm === 'yes' || verifiedNorm === 'verified';
      users = users.filter((u) => u.verified === want);
    }
    if (qNorm) {
      users = users.filter((u) => {
        const hay = `${u.name || ''} ${u.email || ''} ${u.phone || ''} ${u.region || ''} ${u.role || ''}`.toLowerCase();
        return hay.includes(qNorm) || String(u.id).toLowerCase().includes(qNorm);
      });
    }

    res.json({ users });
  } catch (e) {
    console.error('[ERROR] Failed to fetch admin users:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/users/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from(TABLES.USERS).select('*').eq('id', id).single();
    if (error) throw error;
    res.json({ user: parseProfileData(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/users/:id/block', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked = true } = req.body || {};
    const updated = await writeUserMetadata(id, { is_blocked: !!blocked, blocked: !!blocked, blocked_at: !!blocked ? new Date().toISOString() : null });
    emitAdminUpdate({ type: 'user', action: blocked ? 'blocked' : 'unblocked', user: updated });
    res.json({ user: updated });
  } catch (e) {
    console.error('[ERROR] Failed to block/unblock user:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/users/:id/role', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: 'role required' });
    const roleNorm = String(role).trim().toLowerCase();
    const now = new Date().toISOString();

    let { data, error } = await supabase
      .from(TABLES.USERS)
      .update({ role: roleNorm, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      const fallback = await writeUserMetadata(id, { role: roleNorm, role_updated_at: now });
      emitAdminUpdate({ type: 'user', action: 'role_changed', user: fallback });
      return res.json({ user: fallback });
    }
    const parsed = parseProfileData(data);
    emitAdminUpdate({ type: 'user', action: 'role_changed', user: parsed });
    res.json({ user: parsed });
  } catch (e) {
    console.error('[ERROR] Failed to change role:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/users/:id/reset-access', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    const updated = await writeUserMetadata(id, { access_reset_at: now });
    emitAdminUpdate({ type: 'user', action: 'access_reset', user: updated });
    res.json({ ok: true, user: updated });
  } catch (e) {
    console.error('[ERROR] Failed to reset access:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/ngos', ensureAdmin, async (req, res) => {
  try {
    const { q = '', status = 'all', verified = 'all', limit = 200 } = req.query || {};
    const qNorm = String(q || '').trim().toLowerCase();
    const statusNorm = String(status || 'all').trim().toLowerCase();
    const verifiedNorm = String(verified || 'all').trim().toLowerCase();
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .in('role', ['ngo', 'ngo_pending', 'ngo_rejected'])
      .order('updated_at', { ascending: false })
      .limit(lim);
    if (error) throw error;

    let ngos = (data || []).map(parseProfileData).map((u) => {
      const isBlocked = u.is_blocked === true || u.blocked === true;
      const isVerified = u.is_verified === true || u.verified === true;
      const normalizedRole = String(u.role || '').toLowerCase();
      const applicationStatus = normalizedRole === 'ngo_pending'
        ? 'pending'
        : (normalizedRole === 'ngo_rejected' || u.ngo_rejected === true)
          ? 'rejected'
          : 'approved';
      return {
        id: u.id,
        name: u.name || u.full_name || 'NGO',
        email: u.email,
        phone: u.phone,
        status: isBlocked ? 'disabled' : 'enabled',
        verified: isVerified,
        applicationStatus,
        regions: u.ngo_regions || u.regions || [],
        serviceTypes: u.ngo_service_types || u.service_types || [],
        registrationNumber: u.registration_number || u.registrationNumber,
        contactPerson: u.contact_person || u.contactPerson,
        areasOfOperation: u.areas_of_operation || u.areasOfOperation,
        servicesOffered: u.services_offered || u.servicesOffered,
        verificationDocuments: u.verification_documents || u.verificationDocuments,
        raw: u,
      };
    });

    if (statusNorm !== 'all') {
      if (statusNorm === 'pending' || statusNorm === 'approved' || statusNorm === 'rejected') {
        ngos = ngos.filter((n) => n.applicationStatus === statusNorm);
      } else {
        ngos = ngos.filter((n) => n.status === statusNorm);
      }
    }
    if (verifiedNorm !== 'all') {
      const want = verifiedNorm === 'true' || verifiedNorm === 'yes' || verifiedNorm === 'verified';
      ngos = ngos.filter((n) => n.verified === want);
    }
    if (qNorm) {
      ngos = ngos.filter((n) => {
        const hay = `${n.name || ''} ${n.email || ''} ${n.phone || ''}`.toLowerCase();
        return hay.includes(qNorm) || String(n.id).toLowerCase().includes(qNorm);
      });
    }

    res.json({ ngos });
  } catch (e) {
    console.error('[ERROR] Failed to fetch NGOs:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/verify', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified = true } = req.body || {};
    const now = new Date().toISOString();
    const updated = await writeUserMetadata(id, { is_verified: !!verified, verified: !!verified, verified_at: !!verified ? now : null });
    emitAdminUpdate({ type: 'ngo', action: verified ? 'verified' : 'unverified', ngo: updated });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to verify NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/approve', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ role: 'ngo', updated_at: now })
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.warn(`[WARN] Failed to update role=ngo for ${id}:`, e?.message || e);
    }

    const updated = await writeUserMetadata(id, {
      is_approved: true,
      is_verified: true,
      verified: true,
      verified_at: now,
      ngo_rejected: false,
      ngo_rejected_reason: null,
      ngo_rejected_at: null,
    });

    try {
      await supabase
        .from(TABLES.NGOS)
        .upsert({ user_id: id, status: 'approved', updated_at: now }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn(`[WARN] Failed to update ngos status (approved) for ${id}:`, e?.message || e);
    }

    // Persist decision in pending_approvals
    try {
      const upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'approved', decided_at: now })
        .eq('uid', id)
        .select();

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        await supabase
          .from(TABLES.PENDING_APPROVALS)
          .insert({ uid: id, status: 'approved', decided_at: now, created_at: now });
      }
    } catch (e) {
      console.warn(`[WARN] Failed to persist pending_approvals (approved) for ${id}:`, e?.message || e);
    }

    emitAdminUpdate({ type: 'ngo', action: 'approved', ngo: updated });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to approve NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/reject', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body || {};
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ role: 'ngo_rejected', updated_at: now })
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.warn(`[WARN] Failed to update role=ngo_rejected for ${id}:`, e?.message || e);
    }

    const updated = await writeUserMetadata(id, {
      is_approved: false,
      is_verified: false,
      verified: false,
      ngo_rejected: true,
      ngo_rejected_reason: String(reason || ''),
      ngo_rejected_at: now,
    });

    try {
      await supabase
        .from(TABLES.NGOS)
        .upsert({ user_id: id, status: 'rejected', updated_at: now }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn(`[WARN] Failed to update ngos status (rejected) for ${id}:`, e?.message || e);
    }

    // Persist decision in pending_approvals
    try {
      const upd = await supabase
        .from(TABLES.PENDING_APPROVALS)
        .update({ status: 'rejected', decided_at: now })
        .eq('uid', id)
        .select();

      if (upd?.error || !Array.isArray(upd?.data) || upd.data.length === 0) {
        await supabase
          .from(TABLES.PENDING_APPROVALS)
          .insert({ uid: id, status: 'rejected', decided_at: now, created_at: now });
      }
    } catch (e) {
      console.warn(`[WARN] Failed to persist pending_approvals (rejected) for ${id}:`, e?.message || e);
    }

    emitAdminUpdate({ type: 'ngo', action: 'rejected', ngo: updated });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to reject NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/assign', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { regions = [], serviceTypes = [] } = req.body || {};
    const updated = await writeUserMetadata(id, {
      ngo_regions: Array.isArray(regions) ? regions : [regions].filter(Boolean),
      ngo_service_types: Array.isArray(serviceTypes) ? serviceTypes : [serviceTypes].filter(Boolean),
      ngo_assigned_at: new Date().toISOString(),
    });
    emitAdminUpdate({ type: 'ngo', action: 'assigned', ngo: updated });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to assign NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/ngos/:id/access', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled = true } = req.body || {};
    const updated = await writeUserMetadata(id, { is_blocked: !enabled, blocked: !enabled, blocked_at: !enabled ? new Date().toISOString() : null });
    emitAdminUpdate({ type: 'ngo', action: enabled ? 'enabled' : 'disabled', ngo: updated });
    res.json({ ngo: updated });
  } catch (e) {
    console.error('[ERROR] Failed to enable/disable NGO:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/seniors', ensureAdmin, async (req, res) => {
  try {
    const { q = '', status = 'all', highRisk = 'all', limit = 200 } = req.query || {};
    const qNorm = String(q || '').trim().toLowerCase();
    const statusNorm = String(status || 'all').trim().toLowerCase();
    const riskNorm = String(highRisk || 'all').trim().toLowerCase();
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .or('role.eq.elderly,role.eq.senior')
      .order('updated_at', { ascending: false })
      .limit(lim);
    if (error) throw error;

    let seniors = (data || []).map(parseProfileData).map((u) => {
      const isBlocked = u.is_blocked === true || u.blocked === true;
      const isHighRisk = u.high_risk === true || u.is_high_risk === true;
      return {
        id: u.id,
        name: u.name || u.full_name || 'Senior',
        email: u.email,
        phone: u.phone,
        status: isBlocked ? 'deactivated' : 'active',
        region: u.region || u.city || 'N/A',
        highRisk: isHighRisk,
        lastActive: u.last_active_at || u.last_seen_at || u.updated_at || u.created_at || null,
        raw: u,
      };
    });

    if (statusNorm !== 'all') seniors = seniors.filter((s) => s.status === statusNorm);
    if (riskNorm !== 'all') {
      const want = riskNorm === 'true' || riskNorm === 'yes' || riskNorm === 'high';
      seniors = seniors.filter((s) => s.highRisk === want);
    }
    if (qNorm) {
      seniors = seniors.filter((s) => {
        const hay = `${s.name || ''} ${s.email || ''} ${s.phone || ''} ${s.region || ''}`.toLowerCase();
        return hay.includes(qNorm) || String(s.id).toLowerCase().includes(qNorm);
      });
    }

    res.json({ seniors });
  } catch (e) {
    console.error('[ERROR] Failed to fetch seniors:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/seniors/:id/deactivate', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { deactivated = true } = req.body || {};
    const updated = await writeUserMetadata(id, { is_blocked: !!deactivated, blocked: !!deactivated, blocked_at: !!deactivated ? new Date().toISOString() : null });
    emitAdminUpdate({ type: 'senior', action: deactivated ? 'deactivated' : 'activated', senior: updated });
    res.json({ senior: updated });
  } catch (e) {
    console.error('[ERROR] Failed to deactivate senior:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/seniors/:id/flag', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { highRisk = true, reason = '' } = req.body || {};
    const now = new Date().toISOString();
    const updated = await writeUserMetadata(id, {
      high_risk: !!highRisk,
      high_risk_reason: String(reason || ''),
      high_risk_flagged_at: !!highRisk ? now : null,
    });
    emitAdminUpdate({ type: 'senior', action: highRisk ? 'flagged_high_risk' : 'unflagged_high_risk', senior: updated });
    res.json({ senior: updated });
  } catch (e) {
    console.error('[ERROR] Failed to flag senior:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/seniors/:id/emergency-history', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [sosRes, helpRes] = await Promise.all([
      supabase.from(TABLES.SOS_ALERTS).select('*').or(`senior_id.eq.${id},user_id.eq.${id}`).order('created_at', { ascending: false }).limit(100),
      supabase.from(TABLES.HELP_REQUESTS).select('*').eq('senior_id', id).order('created_at', { ascending: false }).limit(200),
    ]);

    const sos = (sosRes?.data || []).map((s) => ({
      id: s.id,
      type: 'sos',
      status: s.status,
      createdAt: s.created_at,
      message: s.message || s.description || '',
    }));

    const help = (helpRes?.data || []).map((r) => ({
      id: r.id,
      type: 'help_request',
      status: r.status,
      createdAt: r.created_at,
      category: r.category,
      priority: r.priority,
      description: r.description || '',
    }));

    res.json({ history: [...sos, ...help].sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)) });
  } catch (e) {
    console.error('[ERROR] Failed to fetch emergency history:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/risk', ensureAdmin, async (req, res) => {
  try {
    // Mood logs are optional; if table doesn't exist, we still provide a sensible response.
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let moodLogs = [];
    try {
      const { data, error } = await supabase
        .from(TABLES.MOOD_LOGS)
        .select('*')
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      moodLogs = data || [];
    } catch {}

    const moodCounts = { happy: 0, okay: 0, sad: 0 };
    const sadBySenior = new Map();

    moodLogs.forEach((m) => {
      const moodRaw = String(m.mood || m.value || m.status || '').toLowerCase();
      const seniorId = m.senior_id || m.user_id || m.seniorId;
      let bucket = 'okay';
      if (moodRaw.includes('sad') || moodRaw.includes('low')) bucket = 'sad';
      else if (moodRaw.includes('happy') || moodRaw.includes('good')) bucket = 'happy';
      moodCounts[bucket] = (moodCounts[bucket] || 0) + 1;
      if (bucket === 'sad' && seniorId) sadBySenior.set(seniorId, (sadBySenior.get(seniorId) || 0) + 1);
    });

    // Also consider seniors with long-pending requests as risk
    let pending = [];
    try {
      const { data, error } = await supabase
        .from(TABLES.HELP_REQUESTS)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      pending = data || [];
    } catch {}

    pending.forEach((r) => {
      const sid = r.senior_id;
      if (!sid) return;
      const ageMs = Date.now() - (Date.parse(r.created_at || '') || Date.now());
      if (ageMs > 24 * 60 * 60 * 1000) {
        sadBySenior.set(sid, (sadBySenior.get(sid) || 0) + 2);
      } else if (ageMs > 6 * 60 * 60 * 1000) {
        sadBySenior.set(sid, (sadBySenior.get(sid) || 0) + 1);
      }
    });

    const ranked = Array.from(sadBySenior.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const seniorIds = ranked.map(([id]) => id);
    const seniorsById = new Map();
    if (seniorIds.length) {
      try {
        const { data } = await supabase.from(TABLES.USERS).select('*').in('id', seniorIds);
        (data || []).forEach((u) => seniorsById.set(u.id, parseProfileData(u)));
      } catch {}
    }

    const riskAlerts = ranked.map(([sid, score], idx) => {
      const level = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
      return {
        id: `${sid}-${idx}`,
        seniorId: sid,
        seniorName: seniorsById.get(sid)?.name || seniorsById.get(sid)?.full_name || 'Senior',
        riskLevel: level,
        reasons: level === 'high' ? ['Repeated low mood / long pending requests'] : ['Needs attention'],
        lastContact: 'N/A',
      };
    });

    const totalMood = moodCounts.happy + moodCounts.okay + moodCounts.sad;
    const moodTrends = totalMood
      ? {
          happy: Math.round((moodCounts.happy / totalMood) * 100),
          okay: Math.round((moodCounts.okay / totalMood) * 100),
          sad: Math.round((moodCounts.sad / totalMood) * 100),
        }
      : { happy: 0, okay: 0, sad: 0 };

    const riskCategories = {
      high: riskAlerts.filter((r) => r.riskLevel === 'high').length,
      medium: riskAlerts.filter((r) => r.riskLevel === 'medium').length,
      low: Math.max(0, riskAlerts.filter((r) => r.riskLevel === 'low').length),
    };

    res.json({ riskCategories, riskAlerts, moodTrends });
  } catch (e) {
    console.error('[ERROR] Failed to fetch admin risk:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/activity', ensureAdmin, async (req, res) => {
  try {
    const [sos, users, help] = await Promise.all([
      supabase.from(TABLES.SOS_ALERTS).select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from(TABLES.USERS).select('*').order('updated_at', { ascending: false }).limit(5),
      supabase.from(TABLES.HELP_REQUESTS).select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    const activities = [];

    if (sos.data) {
      sos.data.forEach(s => {
        activities.push({
          id: `sos-${s.id}`,
          type: 'sos',
          message: `SOS Alert: ${s.status === 'active' ? 'Active' : 'Resolved'} incident`,
          time: s.created_at,
          timestamp: new Date(s.created_at).getTime()
        });
      });
    }

    if (users.data) {
      users.data.forEach(u => {
        activities.push({
          id: `user-${u.id}`,
          type: u.role === 'volunteer_pending' ? 'request' : 'caregiver',
          message: `New ${u.role.replace('_', ' ')}: ${u.name || 'Anonymous'}`,
          time: u.updated_at,
          timestamp: new Date(u.updated_at).getTime()
        });
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ activities: activities.slice(0, 10) });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch admin activity:`, e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  console.log(`Saarthi backend listening on :${PORT}`);
});




