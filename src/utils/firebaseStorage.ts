import { db, doc, setDoc, getDoc } from '../lib/firebase';
import { DashboardPage } from '../types';

const COLLECTION_NAME = 'dashboard_states';
const DOC_ID = 'master';

export interface FirebaseDashboardState {
  version: number;
  updatedAt: string;
  activePageId: string;
  pages: DashboardPage[];
}

/**
 * Save state directly to Firebase Firestore
 */
export async function saveFirebaseDashboardState(
  pages: DashboardPage[],
  activePageId: string,
  version?: number
): Promise<FirebaseDashboardState | null> {
  try {
    const payload: FirebaseDashboardState = {
      version: version || Date.now(),
      updatedAt: new Date().toISOString(),
      activePageId,
      pages,
    };

    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (err) {
    console.warn('[FIREBASE] Error saving dashboard state to Firestore:', err);
    return null;
  }
}

/**
 * Get state directly from Firebase Firestore
 */
export async function getFirebaseDashboardState(): Promise<FirebaseDashboardState | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirebaseDashboardState;
      if (data && Array.isArray(data.pages) && data.pages.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[FIREBASE] Error reading dashboard state from Firestore:', err);
  }
  return null;
}
