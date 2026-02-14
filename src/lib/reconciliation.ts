import { DonationCategory, DonationRecord, BankRecord, ReconciledTransaction } from '../types/finance';
import { parse, differenceInDays } from 'date-fns';

export const CATEGORY_MAP_AR: Record<DonationCategory, string> = {
    Zakat: 'زكاة المال',
    InsulinPumps: 'مضخات الأنسولين',
    General: 'التبرع العام',
    Debtors: 'الغارمين',
    Health: 'المشاريع الصحية',
    ProductiveFamilies: 'الأسر المنتجة',
    Social: 'المشاريع الاجتماعية',
    Furniture: 'الأثاث والأجهزة الكهربائية',
    Education: 'المشاريع التعليمية',
    Humanitarian: 'المساعدات الإنسانية',
    Orphans: 'دينار اليتيم',
    Split: 'تبرع مقسم',
};

// Default fee configuration: 1% commission + 10% VAT on commission = 1.1%
const DEFAULT_FEE_PERCENT = 1.1;
const DATE_TOLERANCE_DAYS = 3;

export const calculateExpectedNet = (gross: number, feePercent = DEFAULT_FEE_PERCENT): number => {
    const fee = (gross * feePercent) / 100;
    return Number((gross - fee).toFixed(3));
};

const isCloseDate = (date1: string, date2: string): boolean => {
    try {
        // Dates are expected to be yyyy-MM-dd from parsers
        const d1 = parse(date1, 'yyyy-MM-dd', new Date());
        const d2 = parse(date2, 'yyyy-MM-dd', new Date());
        return Math.abs(differenceInDays(d1, d2)) <= DATE_TOLERANCE_DAYS;
    } catch (e) {
        return false;
    }
};

export const reconcileTransactions = (
    websiteDonations: DonationRecord[],
    bankEntries: BankRecord[]
): ReconciledTransaction[] => {
    const matchedBankIds = new Set<string>();
    const donationResults = new Map<string, ReconciledTransaction>();

    // 1. Group donations by normalized transactionId to handle splits
    const donationGroups = new Map<string, DonationRecord[]>();
    websiteDonations.forEach(don => {
        if (don.transactionId) {
            const normId = don.transactionId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const group = donationGroups.get(normId) || [];
            group.push(don);
            donationGroups.set(normId, group);
        }
    });

    // 2. Pass 1: Match groups by Transaction ID (Many-to-One)
    for (const [normId, group] of donationGroups.entries()) {
        const totalGross = group.reduce((sum, d) => sum + d.amount, 0);
        const expectedNet = calculateExpectedNet(totalGross);

        // Find bank entry with matching ID or description containing ID
        const matchingBankEntry = bankEntries.find(entry => {
            if (matchedBankIds.has(entry.id)) return false;

            const normalizeId = (id: string) => {
                if (!id) return '';
                // 1. Remove common prefixes and non-alphanumeric characters
                let normalized = id.replace(/^(INV|MPGS|TXN|ORDER|REF)[-_]?/i, '');
                normalized = normalized.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return normalized;
            };

            const normBankId = normalizeId(entry.traceId || '');
            const normMpgs = normalizeId(entry.mpgsOrderRef || '');
            const normDesc = (entry.description || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            // Match by Auth Code (traceId) or MPGS Order Reference
            const isAuthMatch = (normId && normBankId === normId) || (normId && normDesc.includes(normId));

            // Collect all invoice IDs and order IDs from the donation group
            const groupInvoiceIds = group.map(d => normalizeId(d.invoiceId || '')).filter(id => id);
            const groupOrderIds = group.map(d => normalizeId(d.orderId || '')).filter(id => id);

            const isInvoiceMatch = (normMpgs && groupInvoiceIds.includes(normMpgs)) || (normBankId && groupInvoiceIds.includes(normBankId));

            // Match by Order ID
            const normMpgsOrderId = normalizeId(entry.mpgsOrderId || '');
            const isOrderMatch = (normMpgsOrderId && groupOrderIds.includes(normMpgsOrderId));

            return isAuthMatch || isInvoiceMatch || isOrderMatch;
        });

        if (matchingBankEntry) {
            matchedBankIds.add(matchingBankEntry.id);
            const actualNet = matchingBankEntry.amount;
            const totalFee = Number((totalGross - actualNet).toFixed(3));
            const totalDiff = Number((expectedNet - actualNet).toFixed(3));

            group.forEach(don => {
                const ratio = totalGross > 0 ? don.amount / totalGross : 1 / group.length;
                const netActual = Number((actualNet * ratio).toFixed(3));
                donationResults.set(don.id, {
                    donation: don,
                    bankRecord: matchingBankEntry,
                    reconciliation: {
                        status: 'matched',
                        feeAmount: Number((totalFee * ratio).toFixed(3)),
                        netExpected: calculateExpectedNet(don.amount),
                        netActual,
                        difference: Number((totalDiff * ratio).toFixed(3)),
                    }
                });
            });
        }
    }

    // 3. Final Pass: Mark remaining donations as pending
    websiteDonations.forEach(donation => {
        if (donationResults.has(donation.id)) return;

        const expectedNet = calculateExpectedNet(donation.amount);

        // Still pending after ID pass
        donationResults.set(donation.id, {
            donation,
            reconciliation: {
                status: 'pending',
                feeAmount: Number((donation.amount - expectedNet).toFixed(3)),
                netExpected: expectedNet,
                difference: 0,
            },
        });
    });

    // Convert results back to array in original order of websiteDonations
    const reconciledDonations = websiteDonations.map(don => donationResults.get(don.id)!);

    // 4. Identify remaining bank entries as extra
    const extraBankEntries: ReconciledTransaction[] = bankEntries
        .filter((entry) => !matchedBankIds.has(entry.id))
        .map((entry) => ({
            bankRecord: entry,
            reconciliation: {
                status: 'extra_bank_entry',
                feeAmount: 0,
                netExpected: 0,
                difference: entry.amount,
            },
        }));

    const allTransactions = [...reconciledDonations, ...extraBankEntries];

    // Sort by date (oldest to newest)
    return allTransactions.sort((a, b) => {
        const dateA = a.bankRecord?.date || a.donation?.date || '';
        const dateB = b.bankRecord?.date || b.donation?.date || '';
        return dateA.localeCompare(dateB);
    });
};
