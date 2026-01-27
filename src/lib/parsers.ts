import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parse, isValid, format } from 'date-fns';
import { DonationRecord, BankRecord, DonationCategory } from '../types/finance';
import jschardet from 'jschardet';

const findValue = (row: any, keywords: string[]): string => {
    const keys = Object.keys(row);
    // Iterate keywords matching to find the highest priority match
    for (const kw of keywords) {
        const normalizedKw = kw.toLowerCase();
        const foundKey = keys.find(key => key.toLowerCase().includes(normalizedKw));
        if (foundKey) return String(row[foundKey]).trim();
    }
    return '';
};

const findRawValue = (row: any, keywords: string[]): any => {
    const keys = Object.keys(row);
    // Iterate keywords matching to find the highest priority match
    for (const kw of keywords) {
        const normalizedKw = kw.toLowerCase();
        // Exact match first (optimization & accuracy)
        let foundKey = keys.find(key => key.toLowerCase() === normalizedKw);
        if (!foundKey) {
            foundKey = keys.find(key => key.toLowerCase().includes(normalizedKw));
        }

        if (foundKey) {
            const val = row[foundKey];
            if (val !== undefined && val !== null && val !== '') {
                return val;
            }
        }
    }
    return undefined;
};

const CATEGORY_KEYWORD_MAP: Record<string, DonationCategory> = {
    // Arabic
    'زكاة': 'Zakat',
    'صدقة': 'General',
    'أيتام': 'Orphans',
    'يتيم': 'Orphans',
    'كفالة': 'Orphans',
    'صحة': 'Health',
    'علاج': 'Health',
    'تعليم': 'Education',
    'طلاب': 'Education',
    'غارمين': 'Debtors',
    'أسر': 'ProductiveFamilies',
    'أنسولين': 'InsulinPumps',
    'مضخات': 'InsulinPumps',
    'اجتماعي': 'Social',
    'أثاث': 'Furniture',
    'إنساني': 'Humanitarian',
    'مساعدات': 'Humanitarian',
    'إغاثة': 'Humanitarian',
    'عام': 'General',

    // English (for Order Items Summary which might be in English)
    'Zakat': 'Zakat',
    'Sadaqah': 'General',
    'Orphan': 'Orphans',
    'Health': 'Health',
    'Medical': 'Health',
    'Education': 'Education',
    'Student': 'Education',
    'Debtor': 'Debtors',
    'Family': 'ProductiveFamilies',
    'Families': 'ProductiveFamilies',
    'Insulin': 'InsulinPumps',
    'Pump': 'InsulinPumps',
    'Social': 'Social',
    'Furniture': 'Furniture',
    'Humanitarian': 'Humanitarian',
    'Aid': 'Humanitarian',
    'Relief': 'Humanitarian',
    'General': 'General',
};

// Heuristic to detect date format (US vs UK)
const detectDateFormat = (dateValues: any[]): 'US' | 'UK' => {
    let usCount = 0; // consistent with MM/dd/yyyy
    let ukCount = 0; // consistent with dd/MM/yyyy

    for (const val of dateValues) {
        if (!val) continue;
        const str = String(val).trim();
        // Look for xx/xx/xxxx or xx-xx-xxxx
        const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) {
            const first = parseInt(match[1]);
            const second = parseInt(match[2]);

            // If first part > 12, it MUST be Day (dd/MM) -> UK
            if (first > 12) {
                ukCount++;
            }
            // If second part > 12, it MUST be Day (MM/dd) -> US
            else if (second > 12) {
                usCount++;
            }
        }
    }

    // If we found conclusive evidence for US format (and no contradictions implied by the parser flow, though here we trust the strong signal)
    if (usCount > 0 && ukCount === 0) return 'US';
    // If we found conclusive evidence for UK format
    if (ukCount > 0 && usCount === 0) return 'UK';

    // Default to UK (International) if ambiguous or mixed
    return 'UK';
};

const parseDate = (dateVal: any, preferredFormat: 'US' | 'UK' = 'UK'): string => {
    if (!dateVal) return new Date().toISOString().split('T')[0];

    // If it's already a Date object
    if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
    }

    const dateStr = String(dateVal).trim();
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Priority: Try manual regex for standard SQL timestamp "yyyy-MM-dd" anywhere in the string
    // This allows matching "2026-01-20 07:20:31" or "Date: 2026-01-20" or "2026-01-20T..."
    const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }

    // Heuristic-based format selection
    let formats = [
        'yyyy-MM-dd',
        'yyyy/MM/dd',
        'dd-MM-yyyy',
        'dd/MM/yyyy',
        'd-M-yyyy',
        'd/M/yyyy',
    ];

    if (preferredFormat === 'US') {
        // Prioritize MM/dd
        formats = [
            'yyyy-MM-dd', // ISO always first
            'yyyy/MM/dd',
            'MM/dd/yyyy',
            'M/d/yyyy',
            'MM-dd-yyyy',
            // Fallbacks
            'dd/MM/yyyy'
        ];
    } else {
        // Prioritize dd/MM (Default/UK)
        formats = [
            'yyyy-MM-dd',
            'yyyy/MM/dd',
            'dd/MM/yyyy',
            'd/M/yyyy',
            'dd-MM-yyyy',
            // Fallbacks
            'MM/dd/yyyy'
        ];
    }

    // Add time variants
    const timeFormats = formats.map(f => `${f} HH:mm:ss`).concat(formats.map(f => `${f} HH:mm`));
    const allFormats = [...formats, ...timeFormats];

    for (const fmt of allFormats) {
        try {
            const parsed = parse(dateStr, fmt, new Date());
            if (isValid(parsed)) {
                return format(parsed, 'yyyy-MM-dd');
            }
        } catch (e) {
            // continue
        }
    }

    // Fallback: try Date.parse
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
        return new Date(timestamp).toISOString().split('T')[0];
    }

    // Last resort: Try splitting by space... reuse logic above with preferred formats
    if (dateStr.includes(' ')) {
        const justDate = dateStr.split(' ')[0];
        for (const fmt of formats) {
            try {
                const parsed = parse(justDate, fmt, new Date());
                if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
            } catch (e) { }
        }
    }

    console.warn('Failed to parse date:', dateVal, 'Str:', dateStr);
    return new Date().toISOString().split('T')[0]; // Default to today if all fails
};

export const parseDonationFile = async (file: File, userEncoding: string = 'auto'): Promise<DonationRecord[]> => {
    return new Promise((resolve, reject) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        const mapDonationRow = (row: any, index: number, preferredFormat: 'US' | 'UK'): DonationRecord[] => {
            // Prioritize Gross/Total then generic Amount
            const amountKeywords = ['Gross', 'Total', 'Value', 'Price', 'المبلغ', 'القيمة', 'الاجمالي', 'الاجمالى', 'قيمة التبرع', 'مبلغ التبرع', 'Amount'];
            const amountStr = findValue(row, amountKeywords);
            const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

            const nameKeywords = ['Donor Name', 'Name', 'FullName', 'الاسم', 'اسم المتبرع', 'المتبرع', 'جهة التبرع', 'العميل'];
            const donorName = findValue(row, nameKeywords) || 'Unknown';

            const dateVal = findRawValue(row, ['Order Created At', 'Paid On', 'Date', 'CreatedAt', 'التاريخ', 'تاريخ التبرع', 'تاريخ العملية']);
            // console.log(`Row: ${donorName}, DateVal: ${dateVal}, RawKeys: ${Object.keys(row).join(',')}`); // DEBUG
            const dateStr = parseDate(dateVal, preferredFormat);

            const idKeywords = ['Transaction ID', 'Txn ID', 'Reference', 'AuthCode', 'Auth Code', 'Order ID', 'ID', 'رقم العملية', 'المرجع', 'كود التفويض', 'كود العملية', 'رقم المرجع', 'رمز المرجع'];
            const transactionId = findValue(row, idKeywords) || '';

            // Look for 'Order Items Summary' and other category columns
            const rawCategory = findValue(row, ['Order Items Summary', 'Items', 'Product', 'Category', 'Type', 'Account', 'البند', 'نوع التبرع', 'الحساب', 'التصنيف']);

            // Attempt to parse split items (e.g. "25 Education, 25 Health")
            const parts = rawCategory.split(/[,،\n]/).map(p => p.trim()).filter(p => p);
            const splitItems: { category: DonationCategory, amount: number }[] = [];

            if (parts.length > 1) {
                for (const part of parts) {
                    // Extract amount from part
                    const partAmountMatch = part.match(/[0-9]+(\.[0-9]+)?/);
                    const partAmount = partAmountMatch ? parseFloat(partAmountMatch[0]) : 0;

                    // Extract category from part
                    let partCategory: DonationCategory | null = null;
                    for (const [key, mappedCategory] of Object.entries(CATEGORY_KEYWORD_MAP)) {
                        if (part.toLowerCase().includes(key.toLowerCase())) {
                            partCategory = mappedCategory;
                            break;
                        }
                    }

                    if (partCategory && partAmount > 0) {
                        splitItems.push({ category: partCategory, amount: partAmount });
                    }
                }
            }

            // Validation: Check if split items sum checks out roughly OR we found multiple valid parts
            const splitTotal = splitItems.reduce((sum, item) => sum + item.amount, 0);
            const isSplitValid = splitItems.length > 1 && Math.abs(splitTotal - amount) < 1.0; // Tolerance of 1.0 for float issues

            if (isSplitValid) {
                return splitItems.map((item, i) => ({
                    id: `don-${index}-split-${i}-${Date.now()}`,
                    donorName,
                    amount: item.amount,
                    category: item.category,
                    date: dateStr,
                    transactionId, // Same Transaction ID for all splits
                    raw: row,
                }));
            }

            // Fallback to single record (existing logic)
            let category: DonationCategory = 'General';
            const foundCategories = new Set<DonationCategory>();

            for (const [key, mappedCategory] of Object.entries(CATEGORY_KEYWORD_MAP)) {
                if (rawCategory.toLowerCase().includes(key.toLowerCase())) {
                    foundCategories.add(mappedCategory);
                }
            }

            // Remove 'General' if we have other specific categories
            if (foundCategories.size > 1 && foundCategories.has('General')) {
                foundCategories.delete('General');
            }

            if (foundCategories.size === 1) {
                category = Array.from(foundCategories)[0];
            } else if (foundCategories.size > 1) {
                category = 'Split';
            }

            return [{
                id: `don-${index}-${Date.now()}`,
                donorName,
                amount,
                category,
                splitDetails: category === 'Split' ? Array.from(foundCategories) : undefined,
                date: dateStr,
                transactionId,
                invoiceId: findValue(row, ['Invoice Id', 'Invoice ID', 'Invoice#', 'رقم الفاتورة', 'رقم الفاتوره']),
                raw: row,
            }];
        };
        // ...
        // ... (rest of parseDonationFile)
        if (extension === 'csv') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const buffer = e.target?.result as ArrayBuffer;
                const bytes = new Uint8Array(buffer);

                // Auto-detect encoding
                const detected = jschardet.detect(Buffer.from(bytes));
                let encoding = detected.encoding || 'UTF-8';

                // If detected as ASCII (common mistake for Arabic), try common Arabic encodings
                const encodingsToTry = encoding.toLowerCase() === 'ascii'
                    ? ['windows-1256', 'UTF-8', 'ISO-8859-6']
                    : [encoding, 'UTF-8', 'windows-1256'];

                console.log('Detected encoding for donations:', encoding, '- Will try:', encodingsToTry);

                let csvText = '';
                for (const enc of encodingsToTry) {
                    try {
                        const decoder = new TextDecoder(enc);
                        csvText = decoder.decode(bytes);
                        // Check if we got valid text (not too many replacement chars)
                        const replacementChars = (csvText.match(/�/g) || []).length;
                        if (replacementChars < csvText.length * 0.05) { // Less than 5% invalid
                            console.log('Successfully decoded with:', enc);
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }

                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results: Papa.ParseResult<any>) => {
                        const allRows = results.data;
                        // Extract all date values for heuristic
                        const dateValues = allRows.map((row: any) => findRawValue(row, ['Order Created At', 'Paid On', 'Date', 'CreatedAt', 'التاريخ', 'تاريخ التبرع', 'تاريخ العملية']));
                        const formatPref = detectDateFormat(dateValues);
                        console.log('Detected Donation Date Format:', formatPref);

                        const records = allRows.flatMap((row: any, index: number) => mapDonationRow(row, index, formatPref));
                        resolve(records);
                    },
                    error: (error: Error) => reject(error),
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);

        } else if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Extract all date values for heuristic
                const dateValues = (jsonData as any[]).map((row: any) => findRawValue(row, ['Order Created At', 'Paid On', 'Date', 'CreatedAt', 'التاريخ', 'تاريخ التبرع', 'تاريخ العملية']));
                const formatPref = detectDateFormat(dateValues);
                console.log('Detected Donation Date Format (Excel):', formatPref);

                const records = (jsonData as any[]).flatMap((row: any, index: number) => mapDonationRow(row, index, formatPref));
                resolve(records);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error('Unsupported file format'));
        }
    });
};

export const parseBankFile = async (file: File, userEncoding: string = 'auto'): Promise<BankRecord[]> => {
    return new Promise((resolve, reject) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        const mapBankRow = (row: any, index: number, preferredFormat: 'US' | 'UK'): BankRecord => {
            // Prioritize Net/ToPay then generic Amount
            let amountStr = findValue(row, ['ToPay', 'Net', 'Credit', 'الصافي', 'مبلغ العملية', 'مدين', 'دائن', 'Transaction Amount', 'Amount', 'المبلغ']);

            const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

            const dateVal = findValue(row, ['Date', 'TransactionDate', 'Transaction Date', 'التاريخ', 'تاريخ العملية']);
            const dateStr = parseDate(dateVal, preferredFormat);

            return {
                id: `bank-${index}-${Date.now()}`,
                amount: amount,
                date: dateStr,
                description: findValue(row, ['Description', 'Details', 'البيان', 'تفاصيل', 'الملاحظات']),
                // Prioritize specific IDs like Auth Code, RRN over generic IDs
                traceId: findValue(row, ['AuthCode', 'Auth Code', 'RRN', 'Trace ID', 'Reference', 'رقم المرجع', 'المرجع', 'رقم العملية', 'كود التفويض', 'رمز المرجع']) || '',
                mpgsOrderRef: findValue(row, ['MPGS Order Reference', 'Order Reference', 'MPGS Reference', 'مرجع MPGS', 'مرجع الطلب']),
                raw: row,
            };
        };

        if (extension === 'csv') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const buffer = e.target?.result as ArrayBuffer;
                const bytes = new Uint8Array(buffer);

                let csvText = '';

                // Use user-selected encoding if specified
                if (userEncoding !== 'auto') {
                    console.log('Using user-selected encoding for bank:', userEncoding);
                    const decoder = new TextDecoder(userEncoding);
                    csvText = decoder.decode(bytes);
                } else {
                    // Auto-detect encoding
                    const detected = jschardet.detect(Buffer.from(bytes));
                    let encoding = detected.encoding || 'UTF-8';

                    // If detected as ASCII (common mistake for Arabic), try common Arabic encodings
                    const encodingsToTry = encoding.toLowerCase() === 'ascii'
                        ? ['windows-1256', 'UTF-8', 'ISO-8859-6']
                        : [encoding, 'UTF-8', 'windows-1256'];

                    console.log('Detected encoding for bank:', encoding, '- Will try:', encodingsToTry);

                    for (const enc of encodingsToTry) {
                        try {
                            const decoder = new TextDecoder(enc);
                            csvText = decoder.decode(bytes);
                            // Check if we got valid text (not too many replacement chars)
                            const replacementChars = (csvText.match(/�/g) || []).length;
                            if (replacementChars < csvText.length * 0.05) { // Less than 5% invalid
                                console.log('Successfully decoded with:', enc);
                                break;
                            }
                        } catch (err) {
                            continue;
                        }
                    }
                }

                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results: Papa.ParseResult<any>) => {
                        const allRows = results.data;
                        const dateValues = allRows.map((row: any) => findValue(row, ['Date', 'TransactionDate', 'Transaction Date', 'التاريخ', 'تاريخ العملية']));
                        const formatPref = detectDateFormat(dateValues);
                        console.log('Detected Bank Date Format:', formatPref);

                        const records = allRows.map((row: any, index: number) => mapBankRow(row, index, formatPref));
                        resolve(records);
                    },
                    error: (error: Error) => reject(error),
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);

        } else if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                const dateValues = (jsonData as any[]).map((row: any) => findValue(row, ['Date', 'TransactionDate', 'Transaction Date', 'التاريخ', 'تاريخ العملية']));
                const formatPref = detectDateFormat(dateValues);
                console.log('Detected Bank Date Format (Excel):', formatPref);

                const records = (jsonData as any[]).map((row: any, index: number) => mapBankRow(row, index, formatPref));
                resolve(records);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error('Unsupported file format'));
        }
    });
};

