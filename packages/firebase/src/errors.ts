const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/configuration-not-found': 'Email/Password sign-in is not enabled for this Firebase project yet.',
  'auth/operation-not-allowed': 'Email/Password sign-in is not enabled for this Firebase project yet.',
  'not-found': 'Firestore database has not been created for this Firebase project yet.',
  'permission-denied': 'Firestore security rules are blocking this request.',
};

/** Turns a Firebase Auth/Firestore error into a user-friendly message. */
export function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code) {
    const key = code.replace(/^firestore\//, '');
    if (FRIENDLY_MESSAGES[key]) return FRIENDLY_MESSAGES[key];
  }
  return (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
}
