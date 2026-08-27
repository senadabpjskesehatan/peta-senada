import { db, doc, setDoc, getDoc } from '../lib/firebase';
import { DashboardPage, ColumnDef, SheetRow } from '../types';

const COLLECTION_NAME = 'dashboard_states';
const DOC_ID = 'master';

export interface FirebaseDashboardState {
  version: number;
  updatedAt: string;
  activePageId: string;
  pages: DashboardPage[];
  isUploadedBaseline?: boolean;
}

/**
 * Remove undefined properties recursively to prevent Firestore setDoc errors
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Save state directly to Firebase Firestore
 */
export async function saveFirebaseDashboardState(
  pages: DashboardPage[],
  activePageId: string,
  version?: number,
  isUploadedBaseline: boolean = true
): Promise<FirebaseDashboardState | null> {
  try {
    const rawPayload: FirebaseDashboardState = {
      version: version || Date.now(),
      updatedAt: new Date().toISOString(),
      activePageId,
      pages,
      isUploadedBaseline,
    };

    const cleanPayload = sanitizeForFirestore(rawPayload);
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, cleanPayload, { merge: true });
    console.log('[FIREBASE] Berhasil menyimpan status dashboard ke Firestore', cleanPayload.version);
    return cleanPayload;
  } catch (err) {
    console.error('[FIREBASE] Error saving dashboard state to Firestore:', err);
    return null;
  }
}

/**
 * Save explicit uploaded file dataset record to Firebase Firestore
 */
export async function saveUploadedDatasetToFirebase(
  fileName: string,
  pageId: string,
  columns: ColumnDef[],
  rows: SheetRow[],
  sourceType: 'csv' | 'excel' | 'url' = 'excel'
): Promise<boolean> {
  try {
    const fileId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = sanitizeForFirestore({
      id: fileId,
      fileName,
      pageId,
      sourceType,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      rows,
      uploadedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'uploaded_datasets', fileId);
    await setDoc(docRef, payload);
    console.log('[FIREBASE] Berhasil mengunggah file dataset ke Firestore:', fileName);
    return true;
  } catch (err) {
    console.error('[FIREBASE] Gagal mengunggah file dataset ke Firestore:', err);
    return false;
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
    console.error('[FIREBASE] Error reading dashboard state from Firestore:', err);
  }
  return null;
}
