export type DonationCategory =
    | 'Zakat'
    | 'InsulinPumps'
    | 'General'
    | 'Debtors'
    | 'Health'
    | 'ProductiveFamilies'
    | 'Social'
    | 'Furniture'
    | 'Education'
    | 'Humanitarian'
    | 'Orphans'
    | 'HealingAndHope'
    | 'AutismCenter'
    | 'OrphansDinar'
    | 'Split';

export interface DonationRecord {
    id: string;
    donorName: string;
    amount: number; // Gross amount from website
    category: DonationCategory;
    splitDetails?: string[]; // For donations with multiple categories
    splitAmounts?: { category: DonationCategory; amount: number }[]; // Actual amounts per category
    date: string;
    transactionId: string;
    orderId?: string; // New field for matching
    invoiceId?: string; // New field for MPGS matching
    raw?: any; // Original row data
}

export interface BankRecord {
    id: string;
    amount: number; // Net amount received in bank
    date: string;
    description: string;
    traceId?: string;
    mpgsOrderRef?: string; // New field for Invoice matching
    mpgsOrderId?: string; // New field for MPGS matching
    raw?: any; // Original row data
}

export interface ReconciliationStatus {
    status: 'matched' | 'pending' | 'discrepancy' | 'extra_bank_entry';
    feeAmount: number;
    netExpected: number;
    netActual?: number;
    difference: number;
    matchScore?: number;
}

export interface ReconciledTransaction {
    donation?: DonationRecord;
    bankRecord?: BankRecord;
    reconciliation: ReconciliationStatus;
}

export interface ReconciliationState {
    donations: DonationRecord[];
    bankRecords: BankRecord[];
    reconciledTransactions: ReconciledTransaction[];
    setDonations: (records: DonationRecord[]) => void;
    setBankRecords: (records: BankRecord[]) => void;
    reconcile: () => void;
    reset: () => void;
}
