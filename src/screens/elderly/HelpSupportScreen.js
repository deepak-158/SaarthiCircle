// Help & Support Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { LargeButton, LargeCard } from '../../components/common';

const HelpSupportScreen = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: '1',
      question: 'How do I use the SOS button?',
      answer: 'Press and hold the red SOS button on the home screen for 3 seconds. This will alert your emergency contacts and nearby volunteers.',
    },
    {
      id: '2',
      question: 'How do I add emergency contacts?',
      answer: 'Go to Profile → Emergency Contacts → Add Contact. Enter their name, phone number, and relationship.',
    },
    {
      id: '3',
      question: 'How can I talk to a companion?',
      answer: 'Go to the Companion tab and tap "Find Companion". You can chat, voice call, or video call with matched volunteers.',
    },
    {
      id: '4',
      question: 'How do I ask for help?',
      answer: 'Tap the Help tab and select a category (Medical, Grocery, etc.). You can describe your need using voice or text.',
    },
    {
      id: '5',
      question: 'Can I change the app language?',
      answer: 'Yes! Go to Profile → Preferences → Language. We support Hindi, English, Bengali, Tamil, Telugu, and Marathi.',
    },
    {
      id: '6',
      question: 'How do I log my mood?',
      answer: 'Tap the Mood tab and select how you\'re feeling. This helps us and your caregivers understand your wellbeing.',
    },
  ];

  const supportOptions = [
    {
      id: 'call',
      title: 'Call Support',
      subtitle: 'Talk to our team',
      icon: 'phone',
      color: colors.status.success,
      action: () => Alert.alert('Support', 'Calling support at 1800-XXX-XXXX'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Chat with us',
      icon: 'whatsapp',
      color: '#25D366',
      action: () => Alert.alert('WhatsApp', 'Opening WhatsApp support...'),
    },
    {
      id: 'email',
      title: 'Email',
      subtitle: 'Write to us',
      icon: 'email',
      color: colors.primary.main,
      action: () => Alert.alert('Email', 'support@saathicircle.com'),
    },
  ];

  const tutorials = [
    { id: '1', title: 'Getting Started', icon: 'play-circle', duration: '3 min' },
    { id: '2', title: 'Using Voice Commands', icon: 'microphone', duration: '2 min' },
    { id: '3', title: 'Emergency Features', icon: 'alert-circle', duration: '4 min' },
    { id: '4', title: 'Finding Companions', icon: 'account-heart', duration: '3 min' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={28} 
            color={colors.primary.main} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact Support</Text>
          <View style={styles.supportGrid}>
            {supportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.supportCard}
                onPress={option.action}
              >
                <View style={[styles.supportIcon, { backgroundColor: option.color + '20' }]}>
                  <MaterialCommunityIcons 
                    name={option.icon} 
                    size={28} 
                    color={option.color} 
                  />
                </View>
                <Text style={styles.supportTitle}>{option.title}</Text>
                <Text style={styles.supportSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Video Tutorials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Video Tutorials</Text>
          <View style={styles.tutorialsList}>
            {tutorials.map((tutorial) => (
              <TouchableOpacity
                key={tutorial.id}
                style={styles.tutorialCard}
                onPress={() => Alert.alert('Tutorial', `Playing: ${tutorial.title}`)}
              >
                <View style={styles.tutorialIcon}>
                  <MaterialCommunityIcons 
                    name={tutorial.icon} 
                    size={24} 
                    color={colors.primary.main} 
                  />
                </View>
                <View style={styles.tutorialInfo}>
                  <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                  <Text style={styles.tutorialDuration}>{tutorial.duration}</Text>
                </View>
                <MaterialCommunityIcons 
                  name="play-circle-outline" 
                  size={32} 
                  color={colors.primary.main} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {faqs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqCard}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <MaterialCommunityIcons 
                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={colors.neutral.gray} 
                  />
                </View>
                {expandedFaq === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <View style={styles.feedbackCard}>
            <MaterialCommunityIcons 
              name="message-text-outline" 
              size={48} 
              color={colors.primary.main} 
            />
            <Text style={styles.feedbackTitle}>Have Feedback?</Text>
            <Text style={styles.feedbackText}>
              We'd love to hear from you! Your feedback helps us improve SaathiCircle.
            </Text>
            <LargeButton
              title="Send Feedback"
              onPress={() => Alert.alert('Feedback', 'Opening feedback form...')}
              variant="outline"
              icon="send"
              size="md"
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>SaathiCircle</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <TouchableOpacity onPress={() => Alert.alert('Terms', 'Opening Terms & Conditions...')}>
            <Text style={styles.linkText}>Terms & Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Privacy', 'Opening Privacy Policy...')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  supportGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supportCard: {
    width: '31%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supportIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  supportTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
  },
  supportSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    textAlign: 'center',
  },
  tutorialsList: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  tutorialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorialInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tutorialTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
  },
  tutorialDuration: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
  },
  faqList: {
    gap: spacing.sm,
  },
  faqCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  feedbackCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.md,
  },
  feedbackText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  appName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  appVersion: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: 4,
  },
  linkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
});

export default HelpSupportScreen;
