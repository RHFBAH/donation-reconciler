import { create } from 'zustand';
import { ReconciliationState, DonationRecord, BankRecord, ReconciledTransaction } from '../types/finance';
import { reconcileTransactions } from './reconciliation';

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
    donations: [],
    bankRecords: [],
    reconciledTransactions: [],

    setDonations: (records) => {
        set({ donations: records });
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
        });
    },
}));
