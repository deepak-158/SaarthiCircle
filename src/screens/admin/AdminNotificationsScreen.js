// Admin Notifications Screen - All notifications and alerts
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

// Notification types with icons and colors
const NOTIFICATION_TYPES = {
  volunteer_request: {
    icon: 'account-plus',
    color: colors.primary.main,
    bgColor: '#E3F2FD',
  },
  sos_alert: {
    icon: 'alert-circle',
    color: colors.accent.red,
    bgColor: '#FFEBEE',
  },
  incident: {
    icon: 'alert-decagram',
    color: colors.accent.orange,
    bgColor: '#FFF3E0',
  },
  system: {
    icon: 'information',
    color: colors.neutral.darkGray,
    bgColor: '#F5F5F5',
  },
  approval: {
    icon: 'check-circle',
    color: colors.secondary.green,
    bgColor: '#E8F5E9',
  },
};

// Dummy notifications for fallback
const DUMMY_NOTIFICATIONS = [
  {
    id: '1',
    type: 'volunteer_request',
    title: 'New Volunteer Request',
    message: 'Priya Sharma has applied to become a volunteer',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    read: false,
    actionRoute: 'VolunteerApproval',
  },
  {
    id: '2',
    type: 'sos_alert',
    title: 'SOS Alert',
    message: 'Senior Ramesh Kumar triggered an SOS alert in Sector 45',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    read: false,
    actionRoute: 'IncidentManagement',
  },
  {
    id: '3',
    type: 'volunteer_request',
    title: 'New Volunteer Request',
    message: 'Amit Patel has applied to become a volunteer',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    read: true,
    actionRoute: 'VolunteerApproval',
  },
  {
    id: '4',
    type: 'incident',
    title: 'Incident Reported',
    message: 'A senior reported a fall incident at Green Park',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: true,
    actionRoute: 'IncidentManagement',
  },
  {
    id: '5',
    type: 'approval',
    title: 'Volunteer Approved',
    message: 'You approved Rahul Verma as a volunteer',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    read: true,
    actionRoute: null,
  },
  {
    id: '6',
    type: 'system',
    title: 'System Update',
    message: 'New AI risk detection model deployed successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    actionRoute: 'AIRiskDashboard',
  },
  {
    id: '7',
    type: 'sos_alert',
    title: 'SOS Alert Resolved',
    message: 'SOS alert by Kamla Devi has been resolved',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    read: true,
    actionRoute: 'IncidentManagement',
  },
];

const AdminNotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Try to load from Firebase
      let firebaseNotifications = [];
      try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
          notificationsRef,
          where('targetRole', '==', 'admin'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        
        firebaseNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
      } catch (fbError) {
        console.log('Firebase notifications not available:', fbError.message);
      }

      // Use Firebase data if available, otherwise use dummy
      if (firebaseNotifications.length > 0) {
        setNotifications(firebaseNotifications);
      } else {
        setNotifications(DUMMY_NOTIFICATIONS);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(DUMMY_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationPress = (notification) => {
    // Mark as read (in a real app, update Firebase)
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // Navigate to action route if available
    if (notification.actionRoute) {
      navigation.navigate(notification.actionRoute);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotificationItem = ({ item }) => {
    const typeConfig = NOTIFICATION_TYPES[item.type] || NOTIFICATION_TYPES.system;
    
    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem, 
          shadows.sm,
          !item.read && styles.unreadItem
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: typeConfig.bgColor }]}>
          <MaterialCommunityIcons 
            name={typeConfig.icon} 
            size={24} 
            color={typeConfig.color} 
          />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={20} 
          color={colors.neutral.gray} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color={colors.neutral.white} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadButton} onPress={markAllAsRead}>
              <MaterialCommunityIcons name="check-all" size={24} color={colors.neutral.white} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={80} color={colors.neutral.gray} />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyMessage}>
            {filter === 'unread' 
              ? 'You have read all your notifications' 
              : 'You don\'t have any notifications yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary.main]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  unreadBadge: {
    backgroundColor: colors.accent.red,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  markReadButton: {
    padding: spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    padding: spacing.sm,
    ...shadows.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  filterTabActive: {
    backgroundColor: colors.primary.main,
  },
  filterText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
  },
  filterTextActive: {
    color: colors.neutral.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.darkGray,
    marginTop: spacing.md,
  },
  emptyMessage: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unreadItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
  },
  unreadTitle: {
    fontWeight: typography.weights.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  notificationMessage: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
});

export default AdminNotificationsScreen;
