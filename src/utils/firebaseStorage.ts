import { db, doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from '../lib/firebase';
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

export interface UploadedDatasetRecord {
  id: string;
  fileName: string;
  pageId: string;
  sourceType: 'csv' | 'excel' | 'url';
  rowCount: number;
  columnCount: number;
  columns: ColumnDef[];
  rows?: SheetRow[];
  uploadedAt: string;
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
    
    const rawPayload = {
      id: fileId,
      fileName,
      pageId,
      sourceType,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      rows,
      uploadedAt: new Date().toISOString(),
    };

    const cleanPayload = sanitizeForFirestore(rawPayload);
    const payloadString = JSON.stringify(cleanPayload);

    // If payload exceeds Firestore doc limit (~800KB), truncate rows in master doc and log metadata
    if (payloadString.length > 800000) {
      console.warn('[FIREBASE] Dataset besar (>800KB), menyimpan metadata dan sampel baris ke Firestore...');
      const truncatedPayload = sanitizeForFirestore({
        ...rawPayload,
        rows: rows.slice(0, 1000), // Keep first 1000 rows in history document
        isTruncated: true,
      });
      await setDoc(doc(db, 'uploaded_datasets', fileId), truncatedPayload);
    } else {
      const docRef = doc(db, 'uploaded_datasets', fileId);
      await setDoc(docRef, cleanPayload);
    }

    console.log('[FIREBASE] Berhasil mencatat file upload di Firestore:', fileName);
    return true;
  } catch (err) {
    console.error('[FIREBASE] Gagal mengunggah file dataset ke Firestore:', err);
    return false;
  }
}

/**
 * Get history of uploaded dataset records from Firebase Firestore
 */
export async function getUploadedDatasetsFromFirebase(maxCount = 20): Promise<UploadedDatasetRecord[]> {
  try {
    const q = query(
      collection(db, 'uploaded_datasets'),
      orderBy('uploadedAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    const records: UploadedDatasetRecord[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.exists()) {
        records.push(docSnap.data() as UploadedDatasetRecord);
      }
    });
    return records;
  } catch (err) {
    console.warn('[FIREBASE] Warning reading uploaded datasets list:', err);
    return [];
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
