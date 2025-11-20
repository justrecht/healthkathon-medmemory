import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export interface AuthError {
  code: string;
  message: string;
}

// Helper function to translate Firebase error codes to user-friendly messages
const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || "";
  const errorMessages: { [key: string]: string } = {
    "auth/invalid-email": "Email tidak valid",
    "auth/user-not-found": "Email tidak ditemukan. Silakan daftar terlebih dahulu",
    "auth/wrong-password": "Password salah",
    "auth/invalid-login-credentials": "Email atau password salah",
    "auth/user-disabled": "Akun ini telah dinonaktifkan",
    "auth/too-many-requests": "Terlalu banyak percobaan login. Silakan coba lagi nanti",
    "auth/email-already-in-use": "Email sudah terdaftar",
    "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter",
    "auth/operation-not-allowed": "Operasi ini tidak diizinkan",
    "auth/network-request-failed": "Jaringan tidak stabil. Periksa koneksi internet Anda",
  };
  
  console.error("Auth Error Code:", errorCode);
  console.error("Full error:", error);
  
  return errorMessages[errorCode] || error?.message || "Terjadi kesalahan. Silakan coba lagi";
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