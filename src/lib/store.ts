import { create } from 'zustand';
import { ReconciliationState, DonationRecord, BankRecord, ReconciledTransaction } from '../types/finance';
import { reconcileTransactions } from './reconciliation';

export interface UploadedDonationFile {
    name: string;
    count: number;
    ids: string[]; // All record IDs from this file, for removal
}

export interface ExtendedReconciliationState extends ReconciliationState {
    uploadedDonationFiles: UploadedDonationFile[];
    addDonations: (records: DonationRecord[], fileName: string) => void;
    removeDonationFile: (fileName: string) => void;
}

export const useReconciliationStore = create<ExtendedReconciliationState>((set, get) => ({
    donations: [],
    bankRecords: [],
    reconciledTransactions: [],
    uploadedDonationFiles: [],

    setDonations: (records) => {
        set({ donations: records, uploadedDonationFiles: [] });
        get().reconcile();
    },

    addDonations: (records, fileName) => {
        const existing = get().donations;
        const existingFiles = get().uploadedDonationFiles;

        // Remove old records from same file if re-uploaded
        const existingFile = existingFiles.find(f => f.name === fileName);
        let mergedDonations = existing;
        if (existingFile) {
            const oldIds = new Set(existingFile.ids);
            mergedDonations = existing.filter(d => !oldIds.has(d.id));
        }

        const newIds = records.map(r => r.id);
        const updatedFiles = existingFile
            ? existingFiles.map(f => f.name === fileName ? { name: fileName, count: records.length, ids: newIds } : f)
            : [...existingFiles, { name: fileName, count: records.length, ids: newIds }];

        const allDonations = [...mergedDonations, ...records];
        set({ donations: allDonations, uploadedDonationFiles: updatedFiles });
        get().reconcile();
    },

    removeDonationFile: (fileName) => {
        const existing = get().donations;
        const existingFiles = get().uploadedDonationFiles;
        const fileToRemove = existingFiles.find(f => f.name === fileName);
        if (!fileToRemove) return;

        const idsToRemove = new Set(fileToRemove.ids);
        const filtered = existing.filter(d => !idsToRemove.has(d.id));
        const updatedFiles = existingFiles.filter(f => f.name !== fileName);

        set({ donations: filtered, uploadedDonationFiles: updatedFiles });
        get().reconcile();
    },

    setBankRecords: (records) => {
        set({ bankRecords: records });
        get().reconcile();
    },

    reconcile: () => {
        const { donations, bankRecords } = get();
        if (donations.length === 0 && bankRecords.length === 0) return;

        const reconciled = reconcileTransactions(donations, bankRecords);
        set({ reconciledTransactions: reconciled });
    },

    reset: () => {
        set({
            donations: [],
            bankRecords: [],
            reconciledTransactions: [],
            uploadedDonationFiles: [],
        });
    },
}));
