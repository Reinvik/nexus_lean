import Dexie, { type Table } from 'dexie';

export interface OfflineFiveSCard {
    id?: number; // Auto-incremented local ID
    area: string;
    description: string;
    findings: string;
    priority: 'Baja' | 'Media' | 'Alta';
    category: 'Seiri' | 'Seiton' | 'Seiso' | 'Seiketsu' | 'Shitsuke' | 'Seguridad' | 'Otro';
    due_date?: string | null;
    status: 'pending_sync'; // Always pending sync when offline
    created_at: string;
    company_id: string; // We still need to know which company it belongs to
    user_id: string;    // Who created it
    timestamp?: number;
}

export interface OfflineImage {
    id?: number;
    card_local_id: number;
    blob: Blob;
    timestamp?: number;
    type?: 'before' | 'after'; // Usually 'before' for creation
}

export interface OfflineAudit {
    id?: number;
    tempId: string;
    title: string;
    area: string;
    auditor: string;
    audit_date: string;
    total_score: number;
    company_id: string;
    user_id: string;
    status: 'pending_sync';
    created_at: string;
}

export interface OfflineAuditEntry {
    id?: number;
    audit_local_id: number; // Foreign key to OfflineAudit.id
    section: string;
    question: string;
    score: number;
    comment: string;
}

export class NexusDB extends Dexie {
    offline_cards!: Table<OfflineFiveSCard>;
    offline_images!: Table<OfflineImage>;
    offline_audits!: Table<OfflineAudit>;
    offline_audit_entries!: Table<OfflineAuditEntry>;

    constructor() {
        super('NexusDB');
        this.version(1).stores({
            offline_cards: '++id, status, company_id, user_id',
            offline_images: '++id, card_local_id',
            offline_audits: '++id, status, company_id, user_id, tempId',
            offline_audit_entries: '++id, audit_local_id'
        });
    }
}

export const db = new NexusDB();
