
import { Transaction, StockHolding, PortfolioDocument, User, CashHolding, RealEstateProperty, RecurringEntry } from '../types';
import { getInitialPortfolio } from './yahooFinanceService';
import { IDBService } from './idbService';
import { CloudService } from './cloudService';

// Hybrid Strategy:
// READ: Try Cloud first (for sync), fallback to Local. Update Local with Cloud data.
// WRITE: Write to Local (for speed) AND Cloud (for sync).

export const StorageService = {
  // --- USER & AUTH ---
  saveUser: async (user: User) => {
    await IDBService.put('users', user);
    // Non-blocking cloud save
    if (CloudService.getConfig()) {
        CloudService.saveItem('users', user).catch(e => console.warn("Cloud sync failed:", e));
    }
  },

  getUser: async (username: string): Promise<User | undefined> => {
    // Auth is sensitive to latency, check local first
    let user = await IDBService.getUser(username);
    
    // If not found locally, try cloud (e.g., new device login)
    if (!user && CloudService.getConfig()) {
       try {
         const cloudUsers = await CloudService.getAll<User>('users');
         user = cloudUsers.find(u => u.username === username);
         // If found in cloud, cache it locally
         if (user) await IDBService.put('users', user);
       } catch (e) {
         console.error("Failed to fetch user from cloud", e);
       }
    }
    return user;
  },

  login: async (username: string): Promise<void> => {
    await IDBService.setSession(username);
  },

  logout: async (): Promise<void> => {
    await IDBService.clearSession();
  },

  isAuthenticated: async (): Promise<boolean> => {
    const session = await IDBService.getSession();
    return !!session;
  },

  getCurrentUser: async (): Promise<string | null> => {
     return await IDBService.getSession();
  },

  // --- TRANSACTIONS ---
  saveTransactions: async (transactions: Transaction[]) => {
    // 1. Save Locally (Critical Path)
    await IDBService.clear('transactions');
    const localPromises = transactions.map(t => IDBService.put('transactions', t));
    await Promise.all(localPromises);

    // 2. Sync to Cloud (Background)
    if (CloudService.getConfig()) {
        CloudService.saveAll('transactions', transactions)
            .catch(e => console.error("Cloud transaction sync failed:", e));
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    await IDBService.put('transactions', transaction);
    if (CloudService.getConfig()) {
        CloudService.saveItem('transactions', transaction)
            .catch(e => console.error("Cloud transaction sync failed:", e));
    }
  },

  getTransactions: async (): Promise<Transaction[]> => {
    // Try Sync
    if (CloudService.getConfig()) {
        try {
            const cloudData = await CloudService.getAll<Transaction>('transactions');
            if (cloudData.length > 0) {
                // Overwrite local with cloud (Source of Truth)
                await IDBService.clear('transactions');
                const promises = cloudData.map(t => IDBService.put('transactions', t));
                await Promise.all(promises);
                return cloudData;
            }
        } catch (e) {
            console.warn("Could not reach cloud, falling back to local.", e);
        }
    }
    return await IDBService.getAll<Transaction>('transactions');
  },

  // --- PORTFOLIO ---
  savePortfolio: async (holdings: StockHolding[]) => {
    await IDBService.clear('portfolio');
    const localPromises = holdings.map(h => IDBService.put('portfolio', h));
    await Promise.all(localPromises);
    
    if (CloudService.getConfig()) {
        CloudService.saveAll('portfolio', holdings)
            .catch(e => console.error("Cloud portfolio sync failed:", e));
    }
  },

  getPortfolio: async (): Promise<StockHolding[]> => {
    if (CloudService.getConfig()) {
        try {
            const cloudData = await CloudService.getAll<StockHolding>('portfolio');
            if (cloudData.length > 0) {
                await IDBService.clear('portfolio');
                const promises = cloudData.map(h => IDBService.put('portfolio', h));
                await Promise.all(promises);
                return cloudData;
            }
        } catch (e) {
             console.warn("Could not reach cloud, falling back to local.", e);
        }
    }
    
    const items = await IDBService.getAll<StockHolding>('portfolio');
    return items.length > 0 ? items : getInitialPortfolio();
  },

  // --- CASH HOLDINGS ---
  saveCash: async (cashHoldings: CashHolding[]) => {
    await IDBService.clear('cash');
    const localPromises = cashHoldings.map(c => IDBService.put('cash', c));
    await Promise.all(localPromises);

    if (CloudService.getConfig()) {
      CloudService.saveAll('cash', cashHoldings)
        .catch(e => console.error("Cloud cash sync failed:", e));
    }
  },

  getCash: async (): Promise<CashHolding[]> => {
    if (CloudService.getConfig()) {
      try {
        const cloudData = await CloudService.getAll<CashHolding>('cash');
        if (cloudData.length > 0) {
          await IDBService.clear('cash');
          const promises = cloudData.map(c => IDBService.put('cash', c));
          await Promise.all(promises);
          return cloudData;
        }
      } catch (e) {
        console.warn("Could not reach cloud for cash, falling back to local.", e);
      }
    }
    return await IDBService.getAll<CashHolding>('cash');
  },

  // --- REAL ESTATE ---
  saveRealEstate: async (properties: RealEstateProperty[]) => {
    await IDBService.clear('realEstate');
    const localPromises = properties.map(p => IDBService.put('realEstate', p));
    await Promise.all(localPromises);

    if (CloudService.getConfig()) {
      CloudService.saveAll('realEstate', properties)
        .catch(e => console.error("Cloud real estate sync failed:", e));
    }
  },

  getRealEstate: async (): Promise<RealEstateProperty[]> => {
    if (CloudService.getConfig()) {
      try {
        const cloudData = await CloudService.getAll<RealEstateProperty>('realEstate');
        if (cloudData.length > 0) {
          await IDBService.clear('realEstate');
          const promises = cloudData.map(p => IDBService.put('realEstate', p));
          await Promise.all(promises);
          return cloudData;
        }
      } catch (e) {
        console.warn("Could not reach cloud for real estate, falling back to local.", e);
      }
    }
    return await IDBService.getAll<RealEstateProperty>('realEstate');
  },

  // --- RECURRING ENTRIES (Budget) ---
  saveRecurringEntries: async (entries: RecurringEntry[]) => {
    await IDBService.clear('recurringEntries');
    const localPromises = entries.map(e => IDBService.put('recurringEntries', e));
    await Promise.all(localPromises);

    if (CloudService.getConfig()) {
      CloudService.saveAll('recurringEntries', entries)
        .catch(e => console.error("Cloud recurring entries sync failed:", e));
    }
  },

  getRecurringEntries: async (): Promise<RecurringEntry[]> => {
    if (CloudService.getConfig()) {
      try {
        const cloudData = await CloudService.getAll<RecurringEntry>('recurringEntries');
        if (cloudData.length > 0) {
          await IDBService.clear('recurringEntries');
          const promises = cloudData.map(e => IDBService.put('recurringEntries', e));
          await Promise.all(promises);
          return cloudData;
        }
      } catch (e) {
        console.warn("Could not reach cloud for recurring entries, falling back to local.", e);
      }
    }
    return await IDBService.getAll<RecurringEntry>('recurringEntries');
  },

  // --- DOCUMENTS ---
  saveDocuments: async (docs: PortfolioDocument[]) => {
     await IDBService.clear('documents');
     const localPromises = docs.map(d => IDBService.put('documents', d));
     await Promise.all(localPromises);

     // Cloud Sync for Documents (Filtered)
     if (CloudService.getConfig()) {
         // Skip documents > 800KB to avoid hitting Firestore document size limits (1MB)
         // In a real production app, we would use Firebase Storage, not Firestore, for files.
         const safeDocs = docs.filter(d => d.data && d.data.length < 800000); 
         
         if (safeDocs.length > 0) {
             CloudService.saveAll('documents', safeDocs)
                 .catch(e => console.error("Cloud doc sync failed:", e));
         } else if (docs.length > 0) {
             console.warn("Documents skipped cloud sync due to size limits (Local Only)");
         }
     }
  },

  getDocuments: async (): Promise<PortfolioDocument[]> => {
    if (CloudService.getConfig()) {
        try {
            const cloudData = await CloudService.getAll<PortfolioDocument>('documents');
            if (cloudData.length > 0) {
                // We intentionally DO NOT clear local documents blindly here, 
                // because local might have large files that cloud rejected.
                // For simplicity in this demo, we merge:
                const localDocs = await IDBService.getAll<PortfolioDocument>('documents');
                
                // Simple merge strategy: prefer cloud, keep local only if missing in cloud
                const mergedMap = new Map<string, PortfolioDocument>();
                localDocs.forEach(d => mergedMap.set(d.id, d));
                cloudData.forEach(d => mergedMap.set(d.id, d));
                
                const merged = Array.from(mergedMap.values());
                
                // Update Local Cache
                await IDBService.clear('documents');
                const promises = merged.map(d => IDBService.put('documents', d));
                await Promise.all(promises);
                
                return merged;
            }
        } catch (e) {
            console.warn("Could not reach cloud, falling back to local.", e);
        }
    }
    return await IDBService.getAll<PortfolioDocument>('documents');
  },

  // --- DATA MANAGEMENT ---
  exportAllData: async (): Promise<string> => {
    const users = await IDBService.getAll('users');
    const transactions = await IDBService.getAll('transactions');
    const portfolio = await IDBService.getAll('portfolio');
    const documents = await IDBService.getAll('documents');

    const data = { users, transactions, portfolio, documents };
    return JSON.stringify(data, null, 2);
  },

  importData: async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      
      // Import to Local
      if (data.users) for (const u of data.users) await IDBService.put('users', u);
      if (data.transactions) for (const t of data.transactions) await IDBService.put('transactions', t);
      if (data.portfolio) for (const p of data.portfolio) await IDBService.put('portfolio', p);
      if (data.documents) for (const d of data.documents) await IDBService.put('documents', d);

      // Import to Cloud if Connected
      if (CloudService.getConfig()) {
         // We can run these in background
         const syncPromises = [];
         if (data.users) syncPromises.push(CloudService.saveAll('users', data.users));
         if (data.transactions) syncPromises.push(CloudService.saveAll('transactions', data.transactions));
         if (data.portfolio) syncPromises.push(CloudService.saveAll('portfolio', data.portfolio));
         Promise.all(syncPromises).catch(e => console.error("Import Cloud Sync Failed", e));
      }

      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },
  
  clearAllData: async () => {
      await IDBService.clear('users');
      await IDBService.clear('transactions');
      await IDBService.clear('portfolio');
      await IDBService.clear('documents');
      await IDBService.clear('session');
      
      // Note: We do not automatically wipe cloud data on factory reset to be safe.
  }
};
