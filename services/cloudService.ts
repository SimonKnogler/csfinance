
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { CloudConfig } from '../types';

const CONFIG_KEY = 'financecs_cloud_config';

const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  apiKey: 'AIzaSyDwsBpp7FpSwfsquBSs3XCUr4ATWzs71Cw',
  authDomain: 'financetracker-7208d.firebaseapp.com',
  projectId: 'financetracker-7208d',
  storageBucket: 'financetracker-7208d.firebasestorage.app',
  messagingSenderId: '662481570634',
  appId: '1:662481570634:web:79ed464a5282e9c0054fb3'
};

const getEnvConfig = (): CloudConfig | null => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (apiKey && projectId && appId) {
    return {
      apiKey,
      projectId,
      appId,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''
    };
  }
  return DEFAULT_CLOUD_CONFIG;
};

const ENV_CONFIG = getEnvConfig();

export const CloudService = {
  hasEnvConfig: (): boolean => !!ENV_CONFIG,
  usesEnvConfig: (): boolean => !!ENV_CONFIG && !localStorage.getItem(CONFIG_KEY),
  getConfig: (): CloudConfig | null => {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return ENV_CONFIG;
  },

  saveConfig: (config: CloudConfig) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  removeConfig: () => {
    localStorage.removeItem(CONFIG_KEY);
    // Force reload to clear initialized Firebase app instances
    window.location.reload();
  },

  getDb: () => {
    const config = CloudService.getConfig();
    if (!config) return null;

    try {
      let app;
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      return getFirestore(app);
    } catch (e) {
      console.error("Firebase Init Error", e);
      return null;
    }
  },

  testConnection: async (config: CloudConfig): Promise<boolean> => {
    try {
      // Initialize a temporary app with a unique name to avoid conflicts
      const tempApp = initializeApp(config, `test-conn-${Date.now()}`);
      const db = getFirestore(tempApp);
      // Try to read a dummy collection to verify auth/connectivity
      // This doesn't need to exist, we just want to see if the SDK throws a config/network error
      await getDocs(collection(db, 'ping'));
      return true;
    } catch (e) {
      console.error("Connection Test Failed:", e);
      return false;
    }
  },

  // --- GENERIC CRUD ---

  saveItem: async (collectionName: string, item: any) => {
    const db = CloudService.getDb();
    if (!db) return;
    try {
      const id = item.id || item.username; // Handle User object case
      if (!id) return;
      await setDoc(doc(db, collectionName, id), item);
    } catch (e) {
      console.error(`Cloud Save Error (${collectionName}):`, e);
    }
  },

  deleteItem: async (collectionName: string, id: string) => {
    const db = CloudService.getDb();
    if (!db) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error(`Cloud Delete Error (${collectionName}):`, e);
    }
  },

  saveAll: async (collectionName: string, items: any[]) => {
    const db = CloudService.getDb();
    if (!db || items.length === 0) return;
    
    // Firestore Batch Limit is 500 operations.
    // We must chunk the data to avoid crashes.
    const CHUNK_SIZE = 450; // Safe margin below 500
    
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(item => {
             const id = item.id || item.username;
             if (id) {
                const ref = doc(db, collectionName, id);
                batch.set(ref, item);
             }
        });

        try {
            await batch.commit();
        } catch (e) {
           console.error(`Cloud Batch Save Error (${collectionName}) at index ${i}:`, e);
           // We continue to the next batch even if one fails, to save as much as possible
        }
    }
  },

  getAll: async <T>(collectionName: string): Promise<T[]> => {
    const db = CloudService.getDb();
    if (!db) return [];
    
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.docs.map(doc => doc.data() as T);
    } catch (e) {
      console.error(`Cloud Fetch Error (${collectionName}):`, e);
      return [];
    }
  }
};
