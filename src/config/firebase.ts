import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, setLogLevel } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9GEeHB91pflX8l4A1jyFa60-zExfaDJo",
  authDomain: "healthkathon-medmemory.firebaseapp.com",
  projectId: "healthkathon-medmemory",
  storageBucket: "healthkathon-medmemory.firebasestorage.app",
  messagingSenderId: "696161324408",
  appId: "1:696161324408:web:0433668b80bf164de84c8d",
};

// Initialize Firebase (avoid re-initialization in development)
export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// Initialize Auth
// @ts-ignore
let auth: any;
try {
  // Try to initialize with persistence if possible, otherwise fallback
  // For now using default getAuth which might warn on RN but works
  auth = getAuth(app);
} catch (e) {
  console.error("Auth init error", e);
}
export { auth };

// Initialize Firestore with React Native compatibility
initializeFirestore(app, { experimentalForceLongPolling: true });
export const db = getFirestore(app);

// Reduce Firestore log noise (e.g., transient BloomFilter warnings)
setLogLevel("error");

export default app;
