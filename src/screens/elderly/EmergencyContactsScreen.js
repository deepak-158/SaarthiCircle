// Emergency Contacts Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { AccessibleInput, LargeButton } from '../../components/common';

const EmergencyContactsScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Son', phone: '+91 98765 43210', relationship: 'Son', isPrimary: true },
    { id: '2', name: 'Daughter', phone: '+91 87654 32109', relationship: 'Daughter', isPrimary: false },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }
    setContacts([
      ...contacts,
      {
        id: Date.now().toString(),
        ...newContact,
        isPrimary: contacts.length === 0,
      },
    ]);
    setNewContact({ name: '', phone: '', relationship: '' });
    setShowModal(false);
    Alert.alert('Success', 'Emergency contact added!');
  };

  const handleDeleteContact = (id) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setContacts(contacts.filter(c => c.id !== id)),
        },
      ]
    );
  };

  const handleSetPrimary = (id) => {
    setContacts(contacts.map(c => ({
      ...c,
      isPrimary: c.id === id,
    })));
  };

  const handleCallContact = (phone) => {
    Alert.alert('Calling', `Calling ${phone}...`);
  };

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
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={28} 
            color={colors.primary.main} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons 
            name="information" 
            size={24} 
            color={colors.primary.main} 
          />
          <Text style={styles.infoText}>
            These contacts will be notified during emergencies and SOS alerts.
          </Text>
        </View>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="account-plus" 
              size={80} 
              color={colors.neutral.gray} 
            />
            <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
            <Text style={styles.emptySubtitle}>
              Add family members or friends who should be contacted in case of emergency.
            </Text>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <View style={styles.contactAvatar}>
                    <MaterialCommunityIcons 
                      name="account" 
                      size={32} 
                      color={colors.primary.main} 
                    />
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryText}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <Text style={styles.contactRelation}>{contact.relationship}</Text>
                  </View>
                </View>
                
                <View style={styles.contactActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleCallContact(contact.phone)}
                  >
                    <MaterialCommunityIcons 
                      name="phone" 
                      size={24} 
                      color={colors.status.success} 
                    />
                  </TouchableOpacity>
                  {!contact.isPrimary && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleSetPrimary(contact.id)}
                    >
                      <MaterialCommunityIcons 
                        name="star-outline" 
                        size={24} 
                        color={colors.status.warning} 
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteContact(contact.id)}
                  >
                    <MaterialCommunityIcons 
                      name="delete" 
                      size={24} 
                      color={colors.status.error} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Contact Button */}
        <View style={styles.buttonContainer}>
          <LargeButton
            title="Add Emergency Contact"
            onPress={() => setShowModal(true)}
            icon="account-plus"
            variant="outline"
          />
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons 
                  name="close" 
                  size={28} 
                  color={colors.neutral.gray} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <AccessibleInput
                label="Name"
                value={newContact.name}
                onChangeText={(value) => setNewContact({ ...newContact, name: value })}
                placeholder="Contact name"
                icon="account"
              />

              <AccessibleInput
                label="Phone Number"
                value={newContact.phone}
                onChangeText={(value) => setNewContact({ ...newContact, phone: value })}
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
                icon="phone"
              />

              <AccessibleInput
                label="Relationship"
                value={newContact.relationship}
                onChangeText={(value) => setNewContact({ ...newContact, relationship: value })}
                placeholder="e.g., Son, Daughter, Friend"
                icon="account-heart"
              />

              <View style={styles.modalButtons}>
                <LargeButton
                  title="Add Contact"
                  onPress={handleAddContact}
                  icon="check"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.primary.main,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  contactsList: {
    padding: spacing.md,
  },
  contactCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  primaryBadge: {
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  primaryText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.white,
    fontWeight: typography.weights.medium,
  },
  contactPhone: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    marginTop: 4,
  },
  contactRelation: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalButtons: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default EmergencyContactsScreen;
