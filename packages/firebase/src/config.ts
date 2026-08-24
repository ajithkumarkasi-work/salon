import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

export interface InitFirebaseOptions {
  /** Custom auth persistence (e.g. React Native AsyncStorage-backed persistence). */
  authPersistence?: Persistence;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

/**
 * Initializes the shared Firebase app instance. Call this once per app
 * (web/mobile) with that platform's config and, on React Native, a
 * persistence implementation backed by AsyncStorage.
 */
export function initFirebase(config: FirebaseOptions, options: InitFirebaseOptions = {}): FirebaseApp {
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  app = initializeApp(config);
  auth = options.authPersistence
    ? initializeAuth(app, { persistence: options.authPersistence })
    : getAuth(app);
  // Undefined optional fields (e.g. skipped coupon limits) must be dropped
  // instead of rejected, so forms don't need every optional value filled in.
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  storage = getStorage(app);

  return app;
}

function ensureInitialized<T>(value: T | undefined, name: string): T {
  if (!value) {
    throw new Error(`@glowbook/firebase: ${name} was accessed before initFirebase() was called.`);
  }
  return value;
}

export function getFirebaseApp(): FirebaseApp {
  return ensureInitialized(app, 'FirebaseApp');
}

export function getFirebaseAuth(): Auth {
  return ensureInitialized(auth, 'Auth');
}

export function getFirebaseDb(): Firestore {
  return ensureInitialized(db, 'Firestore');
}

export function getFirebaseStorage(): FirebaseStorage {
  return ensureInitialized(storage, 'Storage');
}
