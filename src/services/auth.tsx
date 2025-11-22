import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { t_static } from "../i18n";

export interface AuthError {
  code: string;
  message: string;
}

// Helper function to translate Firebase error codes to user-friendly messages
const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || "";
  const errorMessages: { [key: string]: string } = {
    "auth/invalid-email": t_static("authInvalidEmail"),
    "auth/user-not-found": t_static("authUserNotFound"),
    "auth/wrong-password": t_static("authWrongPassword"),
    "auth/invalid-login-credentials": t_static("authInvalidCredentials"),
    "auth/user-disabled": t_static("authUserDisabled"),
    "auth/too-many-requests": t_static("authTooManyRequests"),
    "auth/email-already-in-use": t_static("authEmailInUse"),
    "auth/weak-password": t_static("authWeakPassword"),
    "auth/operation-not-allowed": t_static("authOperationNotAllowed"),
    "auth/network-request-failed": t_static("authNetworkFailed"),
  };
  
  console.error("Auth Error Code:", errorCode);
  console.error("Full error:", error);
  
  return errorMessages[errorCode] || error?.message || t_static("authUnknownError");
};

export const signUpWithEmail = async (email: string, password: string, name: string, role: 'patient' | 'caregiver') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, {
      displayName: name
    });

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: name,
      role: role,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    return { user, error: null };
  } catch (error: any) {
    const authError: AuthError = {
      code: error?.code || "unknown",
      message: getAuthErrorMessage(error)
    };
    return { user: null, error: authError };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login
    await setDoc(doc(db, "users", user.uid), {
      lastLogin: new Date()
    }, { merge: true });

    return { user, error: null };
  } catch (error: any) {
    const authError: AuthError = {
      code: error?.code || "unknown",
      message: getAuthErrorMessage(error)
    };
    return { user: null, error: authError };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error as AuthError };
  }
};

export const getUserProfile = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};