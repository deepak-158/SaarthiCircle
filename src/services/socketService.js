import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/backend';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(BACKEND_URL, { transports: ['websocket'] });
  }
  return socket;
};

export const identify = ({ userId, role }) => {
  getSocket().emit('identify', { userId, role });
};

export const requestCompanion = ({ seniorId }) => {
  getSocket().emit('seeker:request', { seniorId });
};

export const joinSession = ({ conversationId }) => {
  getSocket().emit('session:join', { conversationId });
};

export const sendMessage = ({ conversationId, senderId, content, type = 'text' }) => {
  getSocket().emit('message:send', { conversationId, senderId, content, type });
};

// Voice call methods
export const initiateVoiceCall = ({ conversationId, callerId, calleeId, callerName }) => {
  getSocket().emit('call:initiate', { conversationId, callerId, calleeId, callerName });
};

export const acceptVoiceCall = ({ conversationId, callerId, calleeId }) => {
  getSocket().emit('call:accept', { conversationId, callerId, calleeId });
};

export const rejectVoiceCall = ({ conversationId, callerId, calleeId }) => {
  getSocket().emit('call:reject', { conversationId, callerId, calleeId });
};

export const endVoiceCall = ({ conversationId, callerId, calleeId, userId }) => {
  getSocket().emit('call:end', { conversationId, callerId, calleeId, userId });
};

// WebRTC signaling
export const sendWebRTCOffer = ({ conversationId, sdp }) => {
  getSocket().emit('webrtc:offer', { conversationId, sdp });
};

export const sendWebRTCAnswer = ({ conversationId, sdp }) => {
  getSocket().emit('webrtc:answer', { conversationId, sdp });
};

export const sendICECandidate = ({ conversationId, candidate }) => {
  getSocket().emit('webrtc:ice-candidate', { conversationId, candidate });
};

export default {
  getSocket,
  identify,
  requestCompanion,
  joinSession,
  sendMessage,
  initiateVoiceCall,
  acceptVoiceCall,
  rejectVoiceCall,
  endVoiceCall,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendICECandidate,
};
