import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReconciledTransaction } from '@/types/finance';
import { CATEGORY_MAP_AR } from './reconciliation';

export const exportToPDF = (transactions: ReconciledTransaction[]) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // NOTE: For full Arabic support in jsPDF, a custom font (like Noto Sans Arabic) 
    // must be embedded. Without it, Arabic text might not render correctly.
    // For now, we use standard text with a recommendation to use the "Print" feature 
    // for high-quality Arabic PDF reports.

    // Title
    doc.setFontSize(18);
    doc.text('تقرير مطابقة التبرعات', 148, 15, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.text(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-BH')}`, 148, 22, { align: 'center' });

    // Summary stats
    const totalDonations = transactions.filter(t => t.donation).length;
    const matchedCount = transactions.filter(t => t.reconciliation.status === 'matched').length;
    const totalAmount = transactions.reduce((sum, t) => sum + (t.donation?.amount || 0), 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.reconciliation.feeAmount, 0);

    doc.setFontSize(10);
    doc.text(`إجمالي التبرعات: ${totalDonations} | المطابقة: ${matchedCount} | المبلغ الإجمالي: ${totalAmount.toFixed(3)} د.ب | الرسوم: ${totalFees.toFixed(3)} د.ب`, 148, 30, { align: 'center' });

    // Table data
    const tableData = transactions.map(item => [
        item.bankRecord?.date || item.donation?.date || '',
        item.donation?.donorName || item.bankRecord?.description || '',
        item.donation?.amount ? `${item.donation.amount.toFixed(3)}` : '-',
        item.reconciliation.netActual ? `${item.reconciliation.netActual.toFixed(3)}` : '-',
        `${item.reconciliation.feeAmount.toFixed(3)}`,
        item.donation?.category ? (CATEGORY_MAP_AR[item.donation.category] || item.donation.category) : '-',
        item.donation?.transactionId || item.bankRecord?.traceId || '-',
        item.reconciliation.status === 'matched' ? 'متطابق' :
            item.reconciliation.status === 'pending' ? 'معلق' : 'إضافة بنكية'
    ]);

    // Generate table
    autoTable(doc, {
        head: [['التاريخ', 'البيان / الاسم', 'الإجمالي', 'الصافي', 'الرسوم', 'الفئة', 'المرجع', 'الحالة']],
        body: tableData,
        startY: 35,
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            halign: 'right', // Right align for Arabic
        },
        headStyles: {
            fillColor: [79, 70, 229], // Indigo 600
            textColor: 255,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 60 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 30 },
            6: { cellWidth: 30 },
            7: { cellWidth: 25 }
        },
    });

    // Save
    const fileName = `تقرير_المطابقة_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
