import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfBfRwi8jJERanPtB_K3m3Zrjw4RGnBqA",
  authDomain: "enada-810ca.firebaseapp.com",
  projectId: "enada-810ca",
  storageBucket: "enada-810ca.firebasestorage.app",
  messagingSenderId: "626910211570",
  appId: "1:626910211570:web:a5633a2c37783d611c8f6b",
  measurementId: "G-HPMWYD6B3S"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Analytics safely
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  }).catch(() => {});
}

// Initialize Firestore
export const db = getFirestore(app);

export { doc, setDoc, getDoc, onSnapshot };
