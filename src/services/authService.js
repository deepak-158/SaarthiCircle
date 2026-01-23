import AsyncStorage from '@react-native-async-storage/async-storage';

let authChangeListeners = [];

export const subscribeToAuthChanges = (listener) => {
  authChangeListeners.push(listener);
  return () => {
    authChangeListeners = authChangeListeners.filter(l => l !== listener);
  };
};

const notifyAuthChanges = (isAuthenticated, userRole) => {
  authChangeListeners.forEach(listener => {
    try {
      listener(isAuthenticated, userRole);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

export const login = async (token, role, profile) => {
  await AsyncStorage.setItem('userToken', token);
  await AsyncStorage.setItem('userRole', role);
  await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
  notifyAuthChanges(true, role);
};

export const logout = async () => {
  try {
    // Explicitly remove critical items first
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userProfile');
    // Then attempt to clear everything else
    await AsyncStorage.clear();
  } catch (e) {
    console.error('Error during logout:', e);
  } finally {
    notifyAuthChanges(false, null);
  }
};

export const checkAuth = async () => {
  const userToken = await AsyncStorage.getItem('userToken');
  const userRole = await AsyncStorage.getItem('userRole');
  return { isAuthenticated: !!userToken, userRole };
};
