// Incoming Call Listener - Global listener for incoming calls
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useChat } from '../context/ChatContext';
import { getSocket } from '../services/socketService';

export const useIncomingCallListener = () => {
  const navigation = useNavigation();
  const { setIncomingCallNotification } = useChat();

  useEffect(() => {
    const socket = getSocket();

    // Listen for incoming call
    socket.off('call:incoming');
    socket.on('call:incoming', ({ conversationId, callerId, callerName, calleeId }) => {
      console.log('[CALL] Incoming call from:', callerName);
      
      // Store incoming call info in context
      setIncomingCallNotification(callerName, callerId, conversationId);

      // Navigate to incoming call screen if not already in a call
      navigation.navigate('IncomingCall', {
        conversationId,
        callerId,
        callerName,
        calleeId,
      });
    });

    return () => {
      socket.off('call:incoming');
    };
  }, [navigation, setIncomingCallNotification]);
};

export default useIncomingCallListener;
