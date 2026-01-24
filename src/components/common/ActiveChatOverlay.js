import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useChat } from '../../context/ChatContext';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

/**
 * ActiveChatOverlay
 * Shows active chats at the bottom of the screen
 * Allows quick switching between conversations
 * Persists across navigation
 */
const ActiveChatOverlay = () => {
  const { activeChats, removeActiveChat, activeSession } = useChat();
  const navigation = useNavigation();
  const [expandedChats, setExpandedChats] = useState(false);

  // Show overlay only if there are active chats
  if (!activeChats || activeChats.length === 0) {
    return null;
  }

  const handleSwitchChat = (chat) => {
    if (!chat.conversationId || !chat.companion) {
      Alert.alert('Error', 'Invalid chat data');
      return;
    }
    navigation.navigate('Chat', {
      mode: 'text',
      companion: chat.companion,
      conversationId: chat.conversationId,
    });
  };

  const handleCloseChat = (conversationId, event) => {
    event?.stopPropagation?.();
    removeActiveChat(conversationId);
    Alert.alert('Chat Ended', 'You have closed this chat.');
  };

  const formatCompanionName = (companion) => {
    if (!companion) return 'Unknown';
    return companion.fullName || companion.name || 'Companion';
  };

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && styles.containerAndroid]}>
      {expandedChats ? (
        // Expanded view - show all active chats
        <View style={styles.expandedContainer}>
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedTitle}>Active Chats ({activeChats.length})</Text>
            <TouchableOpacity onPress={() => setExpandedChats(false)}>
              <MaterialCommunityIcons name="chevron-down" size={24} color={colors.primary.main} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.expandedList} showsVerticalScrollIndicator={false}>
            {activeChats.map((chat) => (
              <TouchableOpacity
                key={chat.conversationId}
                style={[
                  styles.expandedChatItem,
                  activeSession?.conversationId === chat.conversationId && styles.activeChatItem,
                ]}
                onPress={() => {
                  handleSwitchChat(chat);
                  setExpandedChats(false);
                }}
              >
                <View style={styles.expandedChatContent}>
                  <View style={styles.expandedChatInfo}>
                    <MaterialCommunityIcons
                      name="account-circle"
                      size={40}
                      color={colors.primary.main}
                      style={styles.chatAvatar}
                    />
                    <View style={styles.expandedChatText}>
                      <Text style={styles.expandedChatName} numberOfLines={1}>
                        {formatCompanionName(chat.companion)}
                      </Text>
                      {chat.lastMessage && (
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {chat.lastMessage}
                        </Text>
                      )}
                    </View>
                  </View>
                  {activeSession?.conversationId === chat.conversationId && (
                    <View style={styles.activeBadge}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.secondary.green} />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.closeButtonExpanded}
                  onPress={(e) => handleCloseChat(chat.conversationId, e)}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color={colors.accent.red} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        // Collapsed view - show only current active chat
        <TouchableOpacity
          style={styles.collapsedContainer}
          onPress={() => setExpandedChats(true)}
          activeOpacity={0.8}
        >
          <View style={styles.collapsedContent}>
            <View style={styles.activeIndicator}>
              <MaterialCommunityIcons
                name="phone-in-talk"
                size={16}
                color={colors.secondary.green}
              />
            </View>
            <View style={styles.collapsedInfo}>
              <Text style={styles.collapsedLabel}>Active Chat</Text>
              <Text style={styles.collapsedName} numberOfLines={1}>
                {activeChats.length > 0 ? formatCompanionName(activeChats[0].companion) : 'Unknown'}
              </Text>
            </View>
            <View style={styles.chatCountBadge}>
              <Text style={styles.chatCountText}>{activeChats.length}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-up"
              size={20}
              color={colors.primary.main}
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.mediumGray,
    ...shadows.lg,
    zIndex: 999,
  },
  containerAndroid: {
    elevation: 10,
  },
  // Collapsed styles
  collapsedContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  collapsedInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  collapsedLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.semiBold,
  },
  collapsedName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  chatCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  chatCountText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  // Expanded styles
  expandedContainer: {
    maxHeight: '70%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  expandedTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  expandedList: {
    maxHeight: '85%',
  },
  expandedChatItem: {
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeChatItem: {
    backgroundColor: colors.primary.light,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  expandedChatContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedChatInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    marginRight: spacing.sm,
  },
  expandedChatText: {
    flex: 1,
  },
  expandedChatName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  lastMessage: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  activeBadge: {
    marginHorizontal: spacing.sm,
  },
  closeButtonExpanded: {
    padding: spacing.sm,
  },
});

export default ActiveChatOverlay;
