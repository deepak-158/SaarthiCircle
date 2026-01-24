// Firebase Configuration for SaathiCircle
// Using Firebase Authentication and Firestore

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  addDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
// Replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBlPPWeK4F3oaMcV2-clCerxLX0P_UIiXo",
  authDomain: "sarthicirc.firebaseapp.com",
  projectId: "sarthicirc",
  storageBucket: "sarthicirc.firebasestorage.app",
  messagingSenderId: "804659897970",
  appId: "1:804659897970:web:724a2fdbea93dfd9ce44eb",
  measurementId: "G-HQNN1YCWP6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// User Roles
export const USER_ROLES = {
  ELDERLY: 'elderly',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};

// Admin phone numbers (only these can be admins - change in code to add more)
const ADMIN_PHONES = [
  '+919876543210', // Change this to your admin phone number
  // Add more admin phones here as needed
];

// Check if phone is admin
export const isAdminPhone = (phone) => {
  return ADMIN_PHONES.includes(phone);
};

// Admin emails (only these can be admins - change in code to add more)
const ADMIN_EMAILS = [
  'dipakshukla158@gmail.com',
  // Add more admin emails here as needed
];

// Check if email is admin
export const isAdminEmail = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
};

// Get user by phone number
export const getUserByPhone = async (phone) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('phone', '==', phone)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Get user by phone error:', error);
    return null;
  }
};

// Register user by phone
export const registerUserByPhone = async (userData) => {
  try {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userDoc = {
      ...userData,
      uid: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, 'users', userId), userDoc);
    return { id: userId, ...userDoc };
  } catch (error) {
    console.error('Register user error:', error);
    throw error;
  }
};

// Google Sign In with Firebase
export const signInWithGoogle = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
};

// Check if user exists
export const checkUserExists = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  } catch (error) {
    console.error('Check user exists error:', error);
    return false;
  }
};

// Register elderly user
export const registerElderly = async (user, additionalData) => {
  try {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData.fullName,
      photoURL: user.photoURL,
      phone: additionalData.phone || '',
      role: USER_ROLES.ELDERLY,
      isApproved: true, // Elderly users are auto-approved
      isActive: true,
      // Personal Info
      fullName: additionalData.fullName || user.displayName,
      age: additionalData.age || null,
      dateOfBirth: additionalData.dateOfBirth || null,
      address: additionalData.address || '',
      city: additionalData.city || '',
      pincode: additionalData.pincode || '',
      // Preferences
      language: additionalData.language || 'en',
      voiceEnabled: true,
      // Health Info
      bloodGroup: additionalData.bloodGroup || '',
      healthConditions: additionalData.healthConditions || [],
      allergies: additionalData.allergies || '',
      medications: additionalData.medications || '',
      doctorName: additionalData.doctorName || '',
      doctorPhone: additionalData.doctorPhone || '',
      // Emergency Contacts
      emergencyContacts: additionalData.emergencyContacts || [],
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    return userData;
  } catch (error) {
    console.error('Register elderly error:', error);
    throw error;
  }
};

// Register volunteer (requires admin approval)
export const registerVolunteer = async (user, additionalData) => {
  try {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData.fullName,
      photoURL: user.photoURL,
      phone: additionalData.phone || '',
      role: USER_ROLES.VOLUNTEER,
      isApproved: false, // Volunteers need admin approval
      isActive: true,
      // Personal Info
      fullName: additionalData.fullName || user.displayName,
      age: additionalData.age || null,
      address: additionalData.address || '',
      city: additionalData.city || '',
      pincode: additionalData.pincode || '',
      // Volunteer specific
      skills: additionalData.skills || [],
      availability: additionalData.availability || '',
      experience: additionalData.experience || '',
      whyVolunteer: additionalData.whyVolunteer || '',
      idProof: additionalData.idProof || '',
      // Stats
      helpCount: 0,
      rating: 0,
      reviewCount: 0,
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedAt: null,
      approvedBy: null,
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Also add to pending approvals collection for easy admin access
    await addDoc(collection(db, 'pendingApprovals'), {
      uid: user.uid,
      email: user.email,
      fullName: userData.fullName,
      phone: userData.phone,
      role: USER_ROLES.VOLUNTEER,
      createdAt: serverTimestamp(),
    });

    return userData;
  } catch (error) {
    console.error('Register volunteer error:', error);
    throw error;
  }
};

// Create admin user (auto-approve if admin email)
export const createAdminIfEligible = async (user) => {
  if (!isAdminEmail(user.email)) {
    return null;
  }

  try {
    const existingProfile = await getUserProfile(user.uid);
    if (existingProfile) {
      // Update to admin role if not already
      if (existingProfile.role !== USER_ROLES.ADMIN) {
        await updateDoc(doc(db, 'users', user.uid), {
          role: USER_ROLES.ADMIN,
          isApproved: true,
          updatedAt: serverTimestamp(),
        });
      }
      return { ...existingProfile, role: USER_ROLES.ADMIN };
    }

    // Create new admin profile
    const adminData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: USER_ROLES.ADMIN,
      isApproved: true,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), adminData);
    return adminData;
  } catch (error) {
    console.error('Create admin error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (uid, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Admin: Approve volunteer
export const approveVolunteer = async (volunteerUid, adminUid) => {
  try {
    await updateDoc(doc(db, 'users', volunteerUid), {
      isApproved: true,
      approvedAt: serverTimestamp(),
      approvedBy: adminUid,
      updatedAt: serverTimestamp(),
    });

    // Remove from pending approvals
    const pendingQuery = query(
      collection(db, 'pendingApprovals'),
      where('uid', '==', volunteerUid)
    );
    const pendingDocs = await getDocs(pendingQuery);
    pendingDocs.forEach(async (docSnap) => {
      await updateDoc(docSnap.ref, { status: 'approved' });
    });

    return true;
  } catch (error) {
    console.error('Approve volunteer error:', error);
    throw error;
  }
};

// Admin: Reject volunteer
export const rejectVolunteer = async (volunteerUid, adminUid, reason) => {
  try {
    await updateDoc(doc(db, 'users', volunteerUid), {
      isApproved: false,
      isActive: false,
      rejectedAt: serverTimestamp(),
      rejectedBy: adminUid,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Update pending approvals
    const pendingQuery = query(
      collection(db, 'pendingApprovals'),
      where('uid', '==', volunteerUid)
    );
    const pendingDocs = await getDocs(pendingQuery);
    pendingDocs.forEach(async (docSnap) => {
      await updateDoc(docSnap.ref, { status: 'rejected', reason });
    });

    return true;
  } catch (error) {
    console.error('Reject volunteer error:', error);
    throw error;
  }
};

// Admin: Get pending volunteer approvals
export const getPendingVolunteers = async () => {
  try {
    // Simplified query to avoid needing composite index
    const q = query(
      collection(db, 'users'),
      where('role', '==', USER_ROLES.VOLUNTEER),
      where('isApproved', '==', false)
    );
    const snapshot = await getDocs(q);
    // Filter active and sort in memory
    const volunteers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(v => v.isActive !== false)
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    return volunteers;
  } catch (error) {
    console.error('Get pending volunteers error:', error);
    return [];
  }
};

// Get all users by role
export const getUsersByRole = async (role) => {
  try {
    // Simplified query - single field doesn't need index
    const q = query(
      collection(db, 'users'),
      where('role', '==', role)
    );
    const snapshot = await getDocs(q);
    // Sort in memory to avoid needing composite index
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    return users;
  } catch (error) {
    console.error('Get users by role error:', error);
    return [];  // Return empty array instead of throwing
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userProfile');
    return true;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Register admin by phone (for admin phones in ADMIN_PHONES list)
export const registerAdminByPhone = async (phone, additionalData = {}) => {
  try {
    // Check if phone is in admin list
    if (!isAdminPhone(phone)) {
      throw new Error('This phone number is not authorized as admin');
    }

    // Check if admin already exists
    const existingUser = await getUserByPhone(phone);
    if (existingUser) {
      // Update to admin if not already
      if (existingUser.role !== USER_ROLES.ADMIN) {
        await updateDoc(doc(db, 'users', existingUser.id), {
          role: USER_ROLES.ADMIN,
          isApproved: true,
          isActive: true,
          updatedAt: serverTimestamp(),
        });
        return { ...existingUser, role: USER_ROLES.ADMIN, isApproved: true };
      }
      return existingUser;
    }

    // Create new admin profile
    const userId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const adminData = {
      uid: userId,
      phone: phone,
      fullName: additionalData.fullName || 'Admin',
      email: additionalData.email || '',
      role: USER_ROLES.ADMIN,
      isApproved: true,
      isActive: true,
      department: additionalData.department || 'Operations',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', userId), adminData);
    console.log('Admin registered successfully:', userId);
    return { id: userId, ...adminData };
  } catch (error) {
    console.error('Register admin error:', error);
    throw error;
  }
};

// Ensure admin exists (call this when admin logs in)
export const ensureAdminExists = async (phone) => {
  try {
    if (!isAdminPhone(phone)) {
      return null;
    }

    const existingUser = await getUserByPhone(phone);
    if (existingUser) {
      return existingUser;
    }

    // Create admin if doesn't exist
    return await registerAdminByPhone(phone, { fullName: 'Admin' });
  } catch (error) {
    console.error('Ensure admin exists error:', error);
    return null;
  }
};

// Auth state listener
export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Export instances
export { auth, db };

// Notification service
export const createNotification = async (notificationData) => {
  try {
    const notification = {
      ...notificationData,
      createdAt: serverTimestamp(),
      read: false,
    };
    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return { id: docRef.id, ...notification };
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Help Requests
export const createHelpRequest = async (seniorUid, requestData) => {
  try {
    const helpRequest = {
      seniorUid,
      ...requestData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'helpRequests'), helpRequest);
    return { id: docRef.id, ...helpRequest };
  } catch (error) {
    console.error('Create help request error:', error);
    throw error;
  }
};

// Get help requests for volunteers
export const getHelpRequests = async (status = null) => {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, 'helpRequests'),
        where('status', '==', status)
      );
    } else {
      q = query(collection(db, 'helpRequests'));
    }
    
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
    
    // Sort by createdAt descending
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Get help requests error:', error);
    return [];
  }
};

// Get all help requests for dashboard
export const getAllHelpRequests = async () => {
  try {
    const q = query(collection(db, 'helpRequests'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Get all help requests error:', error);
    return [];
  }
};

// Update help request status
export const updateHelpRequestStatus = async (requestId, status, volunteerUid = null) => {
  try {
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    if (volunteerUid) {
      updateData.assignedTo = volunteerUid;
    }
    
    if (status === 'active') {
      updateData.acceptedAt = serverTimestamp();
    } else if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(doc(db, 'helpRequests', requestId), updateData);
    return true;
  } catch (error) {
    console.error('Update help request error:', error);
    throw error;
  }
};

// Get volunteer stats
export const getVolunteerStats = async (volunteerUid) => {
  try {
    const q = query(
      collection(db, 'helpRequests'),
      where('assignedTo', '==', volunteerUid)
    );
    const snapshot = await getDocs(q);
    
    const requests = snapshot.docs.map(doc => doc.data());
    const completed = requests.filter(r => r.status === 'completed').length;
    const active = requests.filter(r => r.status === 'active').length;
    
    return {
      totalHelped: completed,
      activeRequests: active,
      totalRequests: requests.length,
    };
  } catch (error) {
    console.error('Get volunteer stats error:', error);
    return { totalHelped: 0, activeRequests: 0, totalRequests: 0 };
  }
};

// SOS Alerts
export const createSOSAlert = async (seniorUid, alertData) => {
  try {
    const sosAlert = {
      seniorUid,
      ...alertData,
      status: 'active',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'sosAlerts'), sosAlert);
    return { id: docRef.id, ...sosAlert };
  } catch (error) {
    console.error('Create SOS alert error:', error);
    throw error;
  }
};

// Mood Logs
export const createMoodLog = async (seniorUid, moodData) => {
  try {
    const moodLog = {
      seniorUid,
      ...moodData,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'moodLogs'), moodLog);
    return { id: docRef.id, ...moodLog };
  } catch (error) {
    console.error('Create mood log error:', error);
    throw error;
  }
};
