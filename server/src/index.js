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

// In-memory presence and session routing
const onlineVolunteers = new Map(); // volunteerId -> socketId
const sessions = new Map(); // conversationId -> { seniorId, volunteerId }

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

// HTTP endpoints
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', id)
      .order('sent_at', { ascending: true });
    if (error) throw error;
    res.json({ messages: data });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});
// Registration endpoints moved below ensureAuth

app.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { senderId, content, type } = req.body || {};
    if (!senderId || !content) return res.status(400).json({ error: 'senderId and content required' });
    const message = await saveMessage({ conversationId: id, senderId, content, type });
    // broadcast to room
    io.to(`conv:${id}`).emit('message:new', message);
    res.json({ message });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Socket handlers
io.on('connection', (socket) => {
  // Client should emit identify with { userId, role: 'VOLUNTEER'|'SENIOR' }
  socket.on('identify', ({ userId, role }) => {
    socket.data.userId = userId;
    socket.data.role = role;
    if (role === 'VOLUNTEER') {
      onlineVolunteers.set(userId, socket.id);
      io.emit('volunteer:online', { volunteerId: userId });
    }
  });

  // Seeker requests a companion
  socket.on('seeker:request', async ({ seniorId }) => {
    try {
      // Find any online volunteer (simple strategy; enhance with filters later)
      const entry = onlineVolunteers.entries().next();
      if (entry.done) {
        socket.emit('seeker:queued');
        return;
      }
      const [volunteerId, volunteerSocketId] = entry.value;
      const conversation = await createConversation(seniorId, volunteerId);
      const convRoom = `conv:${conversation.id}`;
      sessions.set(conversation.id, { seniorId, volunteerId });

      // Join room and notify both sides
      socket.join(convRoom);
      io.sockets.sockets.get(volunteerSocketId)?.join(convRoom);

      io.to(convRoom).emit('session:started', {
        conversationId: conversation.id,
        seniorId,
        volunteerId,
      });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // Allow clients to join an existing conversation room
  socket.on('session:join', ({ conversationId }) => {
    socket.join(`conv:${conversationId}`);
  });

  // Chat message
  socket.on('message:send', async ({ conversationId, senderId, content, type }) => {
    try {
      const saved = await saveMessage({ conversationId, senderId, content, type });
      io.to(`conv:${conversationId}`).emit('message:new', saved);
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

  socket.on('disconnect', () => {
    if (socket.data?.role === 'VOLUNTEER' && socket.data?.userId) {
      onlineVolunteers.delete(socket.data.userId);
      io.emit('volunteer:offline', { volunteerId: socket.data.userId });
    }
  });
});

// ----- Auth middleware and profile endpoints (OTP + avatar emoji) -----
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

const avatarForGender = (gender) => {
  if (!gender || typeof gender !== 'string') return '🧑';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return '👨';
  if (g === 'female' || g === 'f') return '👩';
  return '🧑';
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
    const isApproved = role === 'admin' || role === 'elderly' ? true : (existing?.is_approved ?? false);
    
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
      await supabase.from(TABLES.PENDING_APPROVALS).insert({
        uid: req.user.id,
        email: req.user.email,
        full_name: vName,
        phone: phone || req.user.phone || null,
        role: 'volunteer',
        status: 'pending',
        created_at: new Date().toISOString()
      });
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
      .slice(0, 20);
    
    res.json({ volunteers: approvedVolunteers });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch available volunteers:`, e);
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
    res.status(201).json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to create help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/help-requests', ensureAuth, async (req, res) => {
  try {
    const { status, role } = req.query;
    let query = supabase.from(TABLES.HELP_REQUESTS).select('*, senior:users!senior_id(*)');

    if (status) {
      query = query.eq('status', status);
    }

    if (req.user.role === 'volunteer' || req.user.role === 'caregiver') {
      // Volunteers see pending requests or those assigned to them
      if (status === 'pending') {
        query = query.eq('status', 'pending');
      } else if (status === 'accepted') {
        query = query.eq('volunteer_id', req.user.id).eq('status', 'accepted');
      }
    } else if (req.user.role === 'elderly' || req.user.role === 'senior') {
      // Seniors see their own requests
      query = query.eq('senior_id', req.user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    // Parse senior metadata
    const parsedData = data.map(req => ({
      ...req,
      senior: parseProfileData(req.senior)
    }));

    res.json({ requests: parsedData });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch help requests:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/help-requests/:id/accept', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        volunteer_id: req.user.id,
        status: 'accepted',
        assigned_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    res.json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to accept help request:`, e);
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
    res.json({ request: data });
  } catch (e) {
    console.error(`[ERROR] Failed to complete help request:`, e);
    res.status(500).json({ error: e.message });
  }
});

// Admin endpoints
app.get('/admin/volunteers/pending', ensureAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'volunteer_pending')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ volunteers: data.map(parseProfileData) });
  } catch (e) {
    console.error(`[ERROR] Registration request failed:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/volunteers/approved', ensureAdmin, async (req, res) => {
  try {
    // Fetch volunteers with role='volunteer' (approved volunteers)
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'volunteer')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    
    // Filter to only include truly approved volunteers
    const approvedVolunteers = data
      .map(parseProfileData)
      .filter(v => {
        // Explicitly approved
        if (v.is_approved === true) return true;
        // If is_approved is false, exclude
        if (v.is_approved === false) return false;
        // If undefined but role is volunteer, include (assume approved)
        return v.role === 'volunteer';
      });
    
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
    
    // Validate that the user is actually a pending volunteer
    if (user.role !== 'volunteer_pending' && user.role !== 'volunteer') {
      console.warn(`[ADMIN] User ${id} has role ${user.role}, not volunteer_pending or volunteer`);
      // Still allow approval if they're already a volunteer (re-approval)
      if (user.role !== 'volunteer') {
        return res.status(400).json({ 
          error: `Cannot approve user with role: ${user.role}. Expected volunteer_pending or volunteer.` 
        });
      }
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
    
    // Also update pending_approvals if it exists
    try {
      const { error: deleteError } = await supabase.from(TABLES.PENDING_APPROVALS).delete().eq('uid', id);
      if (deleteError) {
        console.warn(`[WARN] Could not clean up pending_approvals for ${id}:`, deleteError.message);
      } else {
        console.log(`[ADMIN] Cleaned up pending_approvals for ${id}`);
      }
    } catch (e) {
      console.warn(`[WARN] Exception cleaning up pending_approvals:`, e.message);
    }

    // Return the updated volunteer data
    const parsedData = parseProfileData(data);
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

    // Also update pending_approvals if it exists
    try {
      await supabase.from(TABLES.PENDING_APPROVALS).delete().eq('uid', id);
    } catch (e) {
      console.warn(`[WARN] Could not clean up pending_approvals for ${id}`);
    }

    // Return the updated volunteer data
    const parsedData = parseProfileData(data);
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
      supabase.from(TABLES.USERS).select('*', { count: 'exact', head: true }).eq('role', 'volunteer_pending'),
      supabase.from(TABLES.SOS_ALERTS).select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'resolved')
    ]);

    // Log any errors but continue
    results.forEach((r, idx) => {
      if (r.error) console.warn(`[WARN] Admin stats query ${idx} failed:`, r.error.message);
    });

    const [
      totalSeniors,
      activeCaregivers,
      pendingRequests,
      sosAlerts,
      helpResolved
    ] = results.map(r => r.count || 0);

    res.json({
      stats: {
        totalSeniors,
        activeCaregivers,
        pendingRequests,
        sosAlerts,
        helpResolved,
        avgResponseTime: '12 min' // Placeholder
      }
    });
  } catch (e) {
    console.error(`[ERROR] Failed to fetch admin stats:`, e);
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




