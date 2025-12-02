
import { Transaction, StockHolding, PortfolioDocument, User, CashHolding, RealEstateProperty, RecurringEntry } from '../types';

const DB_NAME = 'FinanceCSDB';
const DB_VERSION = 4; // Incremented to add recurringEntries store

const STORES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  PORTFOLIO: 'portfolio',
  CASH: 'cash',
  DOCUMENTS: 'documents',
  SESSION: 'session',
  REAL_ESTATE: 'realEstate',
  RECURRING_ENTRIES: 'recurringEntries'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB Error:", event);
      reject("Could not open database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        db.createObjectStore(STORES.USERS, { keyPath: 'username' });
      }
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PORTFOLIO)) {
        db.createObjectStore(STORES.PORTFOLIO, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CASH)) {
        db.createObjectStore(STORES.CASH, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SESSION)) {
        db.createObjectStore(STORES.SESSION, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.REAL_ESTATE)) {
        db.createObjectStore(STORES.REAL_ESTATE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.RECURRING_ENTRIES)) {
        db.createObjectStore(STORES.RECURRING_ENTRIES, { keyPath: 'id' });
      }
    };
  });
};

// Generic Helper
const performTransaction = <T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest | void): Promise<T> => {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest | void;
      try {
        request = callback(store);
      } catch (e) {
        reject(e);
        return;
      }

      transaction.oncomplete = () => {
        resolve((request as IDBRequest)?.result);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  });
};

export const IDBService = {
  // generic get all
  getAll: <T>(storeName: string): Promise<T[]> => {
    return performTransaction(storeName, 'readonly', (store) => store.getAll());
  },

  // generic put
  put: <T>(storeName: string, data: T): Promise<void> => {
    return performTransaction(storeName, 'readwrite', (store) => store.put(data));
  },

  // generic delete
  delete: (storeName: string, id: string): Promise<void> => {
    return performTransaction(storeName, 'readwrite', (store) => store.delete(id));
  },

  // generic clear
  clear: (storeName: string): Promise<void> => {
    return performTransaction(storeName, 'readwrite', (store) => store.clear());
  },

  // Specific helpers
  getUser: (username: string): Promise<User | undefined> => {
    return performTransaction(STORES.USERS, 'readonly', (store) => store.get(username));
  },

  getSession: (): Promise<string | null> => {
    return performTransaction<{ key: string, value: string }>(STORES.SESSION, 'readonly', (store) => store.get('active_user'))
      .then(res => res ? res.value : null);
  },

  setSession: (username: string): Promise<void> => {
    return performTransaction(STORES.SESSION, 'readwrite', (store) => store.put({ key: 'active_user', value: username }));
  },

  clearSession: (): Promise<void> => {
    return performTransaction(STORES.SESSION, 'readwrite', (store) => store.delete('active_user'));
  }
};
