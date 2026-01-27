import * as XLSX from 'xlsx';
import { ReconciledTransaction } from '../types/finance';
import { CATEGORY_MAP_AR } from './reconciliation';

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
                item.donation.category === 'Split' && item.donation.splitDetails
                    ? `تبرع مقسم: ${item.donation.splitDetails.map(c => CATEGORY_MAP_AR[c as keyof typeof CATEGORY_MAP_AR] || c).join('، ')}`
                    : CATEGORY_MAP_AR[item.donation.category]
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
