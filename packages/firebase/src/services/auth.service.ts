import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { addDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { User, UserRole } from '@glowbook/shared-types';
import { getFirebaseApp, getFirebaseAuth } from '../config';
import { Collections } from '../collections';
import { typedCollection } from '../converters';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

function userDocRef(uid: string) {
  return doc(typedCollection<User>(Collections.users), uid);
}

/** Creates the Firebase Auth account plus the matching `users/{uid}` profile doc. */
export async function registerWithEmail(input: RegisterInput): Promise<User> {
  const { user: firebaseUser } = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    input.email,
    input.password,
  );

  await updateProfile(firebaseUser, { displayName: `${input.firstName} ${input.lastName}` });

  const profile: Omit<User, 'id'> = {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone ?? null,
    avatarUrl: null,
    role: input.role ?? UserRole.CUSTOMER,
    isActive: true,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userDocRef(firebaseUser.uid), { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as any);

  return { id: firebaseUser.uid, ...profile };
}

export async function loginWithEmail(input: LoginInput): Promise<User> {
  const { user: firebaseUser } = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    input.email,
    input.password,
  );

  return fetchUserProfile(firebaseUser.uid);
}

export async function logout(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export async function fetchUserProfile(uid: string): Promise<User> {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) {
    throw new Error(`No user profile found for uid ${uid}`);
  }
  return { id: snapshot.id, ...snapshot.data() } as User;
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<User> {
  await updateDoc(userDocRef(uid), { ...updates, updatedAt: serverTimestamp() });
  return fetchUserProfile(uid);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const snapshot = await getDocs(
    query(typedCollection<User>(Collections.users), where('email', '==', email.trim().toLowerCase())),
  );
  return snapshot.docs[0] ? snapshot.docs[0].data() : null;
}

export async function listUsersByRole(role: UserRole): Promise<User[]> {
  const snapshot = await getDocs(query(typedCollection<User>(Collections.users), where('role', '==', role)));
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
}

export interface WalkInCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Creates a Firestore-only customer profile (no Firebase Auth login) for
 * staff/owner-assisted "walk-in" bookings where the customer has no account.
 */
export async function createWalkInCustomer(input: WalkInCustomerInput): Promise<User> {
  const profile: Omit<User, 'id'> = {
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone ?? null,
    avatarUrl: null,
    role: UserRole.CUSTOMER,
    isActive: true,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await addDoc(typedCollection<User>(Collections.users), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);

  return { id: ref.id, ...profile };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user?.email) throw new Error('You must be signed in to change your password.');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export interface CreateStaffAccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Creates a real Firebase Auth login + `users/{uid}` profile (role STAFF) for
 * a staff member, without signing the current (owner/admin) session out.
 * Uses a throwaway secondary Firebase app instance, since the client SDK's
 * createUserWithEmailAndPassword always signs in as the new user.
 */
export async function createStaffAccount(input: CreateStaffAccountInput): Promise<User> {
  const secondaryApp = initializeApp(getFirebaseApp().options, `staff-creation-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const { user: firebaseUser } = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email,
      input.password,
    );

    const profile: Omit<User, 'id'> = {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      avatarUrl: null,
      role: UserRole.STAFF,
      isActive: true,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userDocRef(firebaseUser.uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any);

    await firebaseSignOut(secondaryAuth);
    return { id: firebaseUser.uid, ...profile };
  } finally {
    await deleteApp(secondaryApp);
  }
}
