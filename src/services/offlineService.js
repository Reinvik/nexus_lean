
const DB_NAME = 'NexusOfflineDB';
const DB_VERSION = 3;
const STORE_NAME = 'offline5SCards';

class OfflineService {
    constructor() {
        this.db = null;
        this.initPromise = this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("OfflineDB Error:", event.target.error);
                reject("Error opening offline database");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'tempId' });
                }
                if (!db.objectStoreNames.contains('offlineAudits')) {
                    db.createObjectStore('offlineAudits', { keyPath: 'tempId' });
                }
                if (!db.objectStoreNames.contains('companiesCache')) {
                    db.createObjectStore('companiesCache', { keyPath: 'id' });
                }
            };
        });
    }

    async getDB() {
        if (!this.db) {
            await this.initPromise;
        }
        return this.db;
    }

    // --- COMPANY CACHE METHODS ---
    async saveCompanies(companies) {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction(['companiesCache'], 'readwrite');
                    const store = transaction.objectStore('companiesCache');

                    // Clear existing first to ensure fresh list
                    store.clear().onsuccess = () => {
                        let count = 0;
                        if (!companies || companies.length === 0) {
                            resolve();
                            return;
                        }

                        companies.forEach(company => {
                            const request = store.add(company);
                            request.onsuccess = () => {
                                count++;
                                if (count === companies.length) resolve();
                            };
                            request.onerror = (e) => reject(e.target.error);
                        });
                    };
                    transaction.onerror = (e) => reject(e.target.error);
                } catch (err) {
                    reject(err);
                }
            });
        } catch (error) { console.error("Error saving companies cache:", error); }
    }

    async getCompanies() {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                try {
                    if (!db.objectStoreNames.contains('companiesCache')) {
                        console.warn("store companiesCache not found, returning empty");
                        resolve([]);
                        return;
                    }

                    const transaction = db.transaction(['companiesCache'], 'readonly');
                    const store = transaction.objectStore('companiesCache');
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = (e) => {
                        console.error("Error in getCompanies request:", e.target.error);
                        resolve([]); // Fail safe
                    };
                } catch (err) {
                    console.error("Error creating transaction for companiesCache:", err);
                    resolve([]); // Fail safe
                }
            });
        } catch (error) {
            console.error("Error accessing DB for getCompanies:", error);
            return [];
        }
    }

    // --- 5S CARDS METHODS ---

    async saveCard(cardData, imageBeforeFile, imageAfterFile) {
        try {
            const db = await this.getDB();
            const record = {
                tempId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                data: cardData,
                files: {
                    imageBefore: imageBeforeFile || null,
                    imageAfter: imageAfterFile || null
                },
                status: 'pending_sync'
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(record);
                request.onsuccess = () => resolve(record);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) {
            console.error("OfflineService saveCard error:", error);
            throw error;
        }
    }

    async getAllCards() {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = request.result || [];
                    results.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(results);
                };
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) { return []; }
    }

    async deleteCard(tempId) {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(tempId);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) { console.error(error); }
    }

    async clearAll() { // Clears Cards Only
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) { console.error(error); }
    }

    // --- 5S AUDIT METHODS ---

    async saveAudit(auditData) {
        try {
            const db = await this.getDB();
            const record = {
                tempId: `offline_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                data: auditData, // Includes entries, title, area, auditor, etc.
                status: 'pending_sync'
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['offlineAudits'], 'readwrite');
                const store = transaction.objectStore('offlineAudits');
                const request = store.add(record);
                request.onsuccess = () => resolve(record);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) {
            console.error("OfflineService saveAudit error:", error);
            throw error;
        }
    }

    async getAllAudits() {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['offlineAudits'], 'readonly');
                const store = transaction.objectStore('offlineAudits');
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = request.result || [];
                    results.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(results);
                };
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) { return []; }
    }

    async deleteAudit(tempId) {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['offlineAudits'], 'readwrite');
                const store = transaction.objectStore('offlineAudits');
                const request = store.delete(tempId);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) { console.error(error); }
    }
}

export const offlineService = new OfflineService();
