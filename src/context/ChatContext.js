import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  // Map of all active chats: conversationId -> { conversationId, companion, isActive, lastMessage, timestamp }
  const [activeChats, setActiveChats] = useState(new Map());

  // Load active session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await AsyncStorage.getItem('activeChatSession');
        if (session) {
          setActiveSession(JSON.parse(session));
        }
        const chatsJson = await AsyncStorage.getItem('activeChats');
        if (chatsJson) {
          const chats = JSON.parse(chatsJson);
          setActiveChats(new Map(Object.entries(chats)));
        }
      } catch (e) {
        console.error('Failed to load chat session', e);
      }
    };
    loadSession();
  }, []);

  // Persist session changes
  useEffect(() => {
    const saveSession = async () => {
      try {
        if (activeSession) {
          await AsyncStorage.setItem('activeChatSession', JSON.stringify(activeSession));
        } else {
          await AsyncStorage.removeItem('activeChatSession');
        }
      } catch (e) {
        console.error('Failed to save chat session', e);
      }
    };
    saveSession();
  }, [activeSession]);

  // Persist active chats
  useEffect(() => {
    const saveChats = async () => {
      try {
        const chatsObj = Object.fromEntries(activeChats);
        await AsyncStorage.setItem('activeChats', JSON.stringify(chatsObj));
      } catch (e) {
        console.error('Failed to save active chats', e);
      }
    };
    if (activeChats.size > 0) {
      saveChats();
    }
  }, [activeChats]);

  const startSession = (session) => {
    setActiveSession(session);
    // Also add to active chats
    if (session?.conversationId) {
      setActiveChats((prev) => {
        const updated = new Map(prev);
        updated.set(session.conversationId, {
          conversationId: session.conversationId,
          companion: session.companion,
          isActive: true,
          lastMessage: null,
          timestamp: Date.now(),
        });
        return updated;
      });
    }
  };

  const endSession = () => {
    setActiveSession(null);
    setIsCallActive(false);
    setCallDuration(0);
  };

  const addActiveChat = (conversationId, companion) => {
    setActiveChats((prev) => {
      const updated = new Map(prev);
      updated.set(conversationId, {
        conversationId,
        companion,
        isActive: true,
        lastMessage: null,
        timestamp: Date.now(),
      });
      return updated;
    });
  };

  const removeActiveChat = (conversationId) => {
    setActiveChats((prev) => {
      const updated = new Map(prev);
      updated.delete(conversationId);
      return updated;
    });
  };

  const updateActiveChatMessage = (conversationId, lastMessage) => {
    setActiveChats((prev) => {
      const updated = new Map(prev);
      const chat = updated.get(conversationId);
      if (chat) {
        updated.set(conversationId, {
          ...chat,
          lastMessage,
          timestamp: Date.now(),
        });
      }
      return updated;
    });
  };

  const getActiveChatsList = () => {
    return Array.from(activeChats.values());
  };

  const setCallStatus = (active) => {
    setIsCallActive(active);
  };

  return (
    <ChatContext.Provider
      value={{
        activeSession,
        isCallActive,
        callDuration,
        setCallDuration,
        startSession,
        endSession,
        setCallStatus,
        activeChats: Array.from(activeChats.values()),
        addActiveChat,
        removeActiveChat,
        updateActiveChatMessage,
        getActiveChatsList,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
