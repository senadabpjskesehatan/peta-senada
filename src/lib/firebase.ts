import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '' 
  ? firebaseConfig.firestoreDatabaseId 
  : '(default)';

export const db = getFirestore(app, databaseId);

export { doc, setDoc, getDoc, onSnapshot };
