import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../types';

// Convert Firebase User to our User type
export const convertFirebaseUser = (user: FirebaseUser): User => {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined
  };
};

// Save user profile to Firestore
export const saveUserProfile = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

// Register a new user
export const registerUser = async (email: string, password: string, displayName: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's profile with the display name
    await updateProfile(user, { displayName });

    // Convert to our User type
    const userProfile = convertFirebaseUser(user);

    // Save user profile to Firestore
    await saveUserProfile(userProfile);

    return userProfile;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Sign in an existing user with email and password
export const signInUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userProfile = convertFirebaseUser(userCredential.user);

    // Update the user profile in Firestore
    await saveUserProfile(userProfile);

    return userProfile;
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    // Add scopes if needed
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const userProfile = convertFirebaseUser(result.user);

    // Save user profile to Firestore
    await saveUserProfile(userProfile);

    return userProfile;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out the current user
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out user:', error);
    throw error;
  }
};

// Get the current user
export const getCurrentUser = (): User | null => {
  const user = auth.currentUser;
  return user ? convertFirebaseUser(user) : null;
};

// Listen for auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? convertFirebaseUser(user) : null);
  });
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};
