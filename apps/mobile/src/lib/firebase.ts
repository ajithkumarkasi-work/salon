import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-expect-error -- getReactNativePersistence exists at runtime but is missing from the RN auth types.
import { getReactNativePersistence } from 'firebase/auth';
import { initFirebase } from '@glowbook/firebase';

initFirebase(
  {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  { authPersistence: getReactNativePersistence(AsyncStorage) },
);

// Re-export everything so the rest of the mobile app only imports from here.
export * from '@glowbook/firebase';
