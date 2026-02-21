import * as XLSX from 'xlsx';
import { ReconciledTransaction } from '../types/finance';
import { UploadedDonationFile } from './store';
import { CATEGORY_MAP_AR, getCategoryLabel } from './reconciliation';

export const exportToExcel = (transactions: ReconciledTransaction[]) => {
    const data = transactions.map((item) => {
        const statusMap = {
            matched: 'متطابق',
            pending: 'قيد الانتظار',
            discrepancy: 'يوجد فرق',
            extra_bank_entry: 'إضافة بنكية (غير مسجلة)',
        };

        return {
            'التاريخ': item.bankRecord?.date || item.donation?.date || '',
            'البيان': item.donation?.donorName || item.bankRecord?.description || '',
            'المبلغ (Gross)': item.donation?.amount ? Number(item.donation.amount.toFixed(3)) : '-',
            'المبلغ (Net)': (item.reconciliation.netActual || item.bankRecord?.amount || item.reconciliation.netExpected).toFixed(3),
            'الرسوم': item.reconciliation.feeAmount.toFixed(3),
            'الفرق': item.reconciliation.difference.toFixed(3),
            'مرجع العملية': item.donation?.transactionId || item.bankRecord?.traceId || '',
            'التصنيف': item.donation ? (
                item.donation.category === 'Split'
                    ? (item.donation.splitAmounts
                        ? `تبرع مقسم: ${item.donation.splitAmounts.map(s => `${getCategoryLabel(s.category, item.donation!.transactionId)} (${s.amount.toFixed(3)})`).join('، ')}`
                        : `تبرع مقسم: ${item.donation.splitDetails?.map(c => getCategoryLabel(c, item.donation!.transactionId)).join('، ')}`)
                    : getCategoryLabel(item.donation.category, item.donation.transactionId)
            ) : 'إدخال بنكي',
            'الحالة': statusMap[item.reconciliation.status],
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'التسوية');

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Donation_Reconciliation_${dateStr}.xlsx`;

    try {
        // Write to buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        // Create Blob and download
        // Using standard MIME type for .xlsx without charset
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename; // Use property instead of setAttribute
        document.body.appendChild(link);

        link.click();

        // Delay cleanup to ensure browser captures the filename
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);

        console.log('Export successful:', filename);
    } catch (error) {
        console.error('Export failed:', error);
        alert('حدث خطأ أثناء تصدير الملف. يرجى المحاولة مرة أخرى.');
    }
};

// Helper: find which uploaded file a donation belongs to
const getDonationSourceFile = (donationId: string, uploadedFiles: UploadedDonationFile[]): string => {
    for (const f of uploadedFiles) {
        if (f.ids.includes(donationId)) return f.name;
    }
    return 'غير محدد';
};

export const exportBankReport = (
    transactions: ReconciledTransaction[],
    uploadedFiles: UploadedDonationFile[]
) => {
    // Only include bank-perspective rows (all bank records + unmatched donations)
    const bankRows = transactions.filter(
        t => t.bankRecord || t.reconciliation.status === 'extra_bank_entry'
    );

    const data = bankRows.map((item) => {
        const isMatched = item.reconciliation.status === 'matched';
        const sourceFile = isMatched && item.donation
            ? getDonationSourceFile(item.donation.id, uploadedFiles)
            : '';

        // Build category detail string
        let categoryDetail = '';
        if (isMatched && item.donation) {
            if (item.donation.category === 'Split') {
                if (item.donation.splitAmounts && item.donation.splitAmounts.length > 0) {
                    categoryDetail = item.donation.splitAmounts
                        .map(s => `${getCategoryLabel(s.category, item.donation!.transactionId)} (${s.amount.toFixed(3)})`)
                        .join(' + ');
                } else if (item.donation.splitDetails && item.donation.splitDetails.length > 0) {
                    categoryDetail = item.donation.splitDetails
                        .map(c => getCategoryLabel(c, item.donation!.transactionId))
                        .join(' + ');
                }
            } else {
                categoryDetail = getCategoryLabel(item.donation.category, item.donation.transactionId);
            }
        }

        return {
            'التاريخ': item.bankRecord?.date || '',
            'البيان': item.bankRecord?.description || '',
            'المبلغ البنكي': item.bankRecord?.amount ? Number(item.bankRecord.amount.toFixed(3)) : '',
            'رقم المرجع (Auth)': item.bankRecord?.traceId || '',
            'حالة المطابقة': isMatched ? '✓ متطابق' : '✗ لا يوجد تطابق',
            'اسم المتبرع': isMatched ? (item.donation?.donorName || '') : '',
            'مبلغ التبرع (Gross)': isMatched && item.donation?.amount ? Number(item.donation.amount.toFixed(3)) : '',
            'تفصيل الفئة': categoryDetail,
            'الرسوم': isMatched ? Number(item.reconciliation.feeAmount.toFixed(3)) : '',
            'المبلغ المحصل (الصافي)': isMatched ? Number((item.reconciliation.netActual || 0).toFixed(3)) : '',
            'رقم الطلب (Order ID)': isMatched ? (item.donation?.orderId || item.donation?.transactionId || '') : '',
            'مصدر التطابق (الملف)': sourceFile,
        };
    });


    const ws = XLSX.utils.json_to_sheet(data);

    // Style header row width (12 columns)
    ws['!cols'] = [
        { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 20 },
        { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 25 },
        { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'تقرير البنك');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Bank_Report_${dateStr}.xlsx`;

    try {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    } catch (error) {
        console.error('Bank report export failed:', error);
        alert('حدث خطأ أثناء تصدير التقرير.');
    }
};
