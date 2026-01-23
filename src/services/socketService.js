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

export default {
  getSocket,
  identify,
  requestCompanion,
  joinSession,
  sendMessage,
};
