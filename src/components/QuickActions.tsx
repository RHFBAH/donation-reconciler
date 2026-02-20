'use client';

import React from 'react';
import { Download, FileText, Printer, Copy, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReconciledTransaction } from '@/types/finance';
import { exportToExcel, exportBankReport } from '@/lib/export';
import { exportToPDF } from '@/lib/pdf-export';
import { useReconciliationStore } from '@/lib/store';

interface QuickActionsProps {
    transactions: ReconciledTransaction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ transactions }) => {
    const { uploadedDonationFiles } = useReconciliationStore();

    const handleExportExcel = () => {
        if (transactions.length > 0) {
            exportToExcel(transactions);
        }
    };

    const handleExportBankReport = () => {
        if (transactions.length > 0) {
            exportBankReport(transactions, uploadedDonationFiles);
        }
    };

    const handleExportPDF = () => {
        if (transactions.length > 0) {
            exportToPDF(transactions);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCopyData = () => {
        const text = transactions.map(t =>
            `${t.donation?.donorName || t.bankRecord?.description} - ${t.donation?.amount || t.bankRecord?.amount} د.ب`
        ).join('\n');
        navigator.clipboard.writeText(text);
    };

    const actions = [
        {
            icon: Download,
            label: 'تصدير Excel (كامل)',
            onClick: handleExportExcel,
            color: 'from-green-500 to-green-600',
            hoverColor: 'hover:shadow-green-500/50'
        },
        {
            icon: Building2,
            label: 'تقرير البنك (مع المصادر)',
            onClick: handleExportBankReport,
            color: 'from-indigo-500 to-indigo-600',
            hoverColor: 'hover:shadow-indigo-500/50'
        },
        {
            icon: Printer,
            label: 'طباعة',
            onClick: handlePrint,
            color: 'from-blue-500 to-blue-600',
            hoverColor: 'hover:shadow-blue-500/50'
        },
        {
            icon: Copy,
            label: 'نسخ',
            onClick: handleCopyData,
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:shadow-purple-500/50'
        }
    ];

    return (
        <div className="fixed bottom-6 left-6 z-50 flex gap-2" dir="ltr">
            {actions.map((action, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={action.onClick}
                    className={`p-3 rounded-full bg-gradient-to-br ${action.color} text-white shadow-lg ${action.hoverColor} hover:shadow-xl transition-all group relative`}
                    title={action.label}
                >
                    <action.icon size={20} />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {action.label}
                    </span>
                </motion.button>
            ))}
        </div>
    );
};
