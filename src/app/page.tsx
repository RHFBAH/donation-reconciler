'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CATEGORY_MAP_AR } from '@/lib/reconciliation';
import { useReconciliationStore } from '@/lib/store';
import { FileUpload } from '@/components/FileUpload';
import { FilterPanel, FilterOptions } from '@/components/FilterPanel';
import { QuickActions } from '@/components/QuickActions';
import { DonationCategory, ReconciledTransaction } from '@/types/finance';
import { CATEGORY_COLORS, animations } from '@/lib/theme';
import {
  BarChart3,
  Trash2,
  CheckCircle2,
  XCircle,
  DollarSign,
  Percent,
  Search,
  AlertCircle,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { reconciledTransactions, reset, donations, bankRecords, uploadedDonationFiles } = useReconciliationStore();
  const [activeView, setActiveView] = useState<'matched' | 'unmatched' | 'unmatched_donation'>('matched');
  const [showCategorySummary, setShowCategorySummary] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    categories: [],
    searchQuery: ''
  });

  const matchedTransactions = useMemo(() =>
    reconciledTransactions.filter(item => item.reconciliation.status === 'matched'),
    [reconciledTransactions]
  );

  const unmatchedBankEntries = useMemo(() =>
    reconciledTransactions.filter(item => item.reconciliation.status === 'extra_bank_entry'),
    [reconciledTransactions]
  );

  const unmatchedDonations = useMemo(() =>
    reconciledTransactions.filter(item => item.reconciliation.status === 'pending'),
    [reconciledTransactions]
  );

  const getFilteredTransactions = useMemo(() => {
    let transactions: ReconciledTransaction[] = [];
    if (activeView === 'matched') transactions = matchedTransactions;
    else if (activeView === 'unmatched') transactions = unmatchedBankEntries;
    else if (activeView === 'unmatched_donation') transactions = unmatchedDonations;

    return transactions.filter((item: ReconciledTransaction) => {
      const donorName = item.donation?.donorName || '';
      const description = item.bankRecord?.description || '';
      const matchesSearch = !filters.searchQuery ||
        donorName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (item.donation?.transactionId || '').toLowerCase().includes(filters.searchQuery.toLowerCase());

      const itemDate = item.donation?.date || item.bankRecord?.date || '';
      const matchesDateFrom = !filters.dateFrom || itemDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || itemDate <= filters.dateTo;

      const amount = item.donation?.amount || item.bankRecord?.amount || 0;
      const matchesAmountMin = filters.amountMin === '' || amount >= filters.amountMin;
      const matchesAmountMax = filters.amountMax === '' || amount <= filters.amountMax;

      const matchesCategory = filters.categories.length === 0 ||
        (item.donation && filters.categories.includes(item.donation.category));

      return matchesSearch && matchesDateFrom && matchesDateTo &&
        matchesAmountMin && matchesAmountMax && matchesCategory;
    });
  }, [activeView, matchedTransactions, unmatchedBankEntries, unmatchedDonations, filters]);

  // Dynamic Category Summary for the filtered period
  const categorySummary = useMemo(() => {
    if (activeView !== 'matched') return null;

    const summary: Record<string, { total: number; count: number }> = {};

    getFilteredTransactions.forEach(item => {
      if (item.donation && item.reconciliation.status === 'matched') {
        const cat = item.donation.category;
        if (!summary[cat]) summary[cat] = { total: 0, count: 0 };
        summary[cat].total += item.reconciliation.netActual || 0;
        summary[cat].count += 1;
      }
    });

    return Object.entries(summary).sort((a, b) => b[1].total - a[1].total);
  }, [getFilteredTransactions, activeView]);

  const stats = useMemo(() => {
    const totalReceived = bankRecords.reduce((sum, item) => sum + item.amount, 0);
    const matchedAmount = matchedTransactions.reduce((sum, item) => sum + (item.reconciliation.netActual || 0), 0);
    const totalFees = reconciledTransactions.reduce((sum, item) => sum + item.reconciliation.feeAmount, 0);
    const matchRate = totalReceived > 0 ? (matchedAmount / totalReceived) * 100 : 0;

    return [
      { label: 'إجمالي البنك', value: totalReceived, count: bankRecords.length, unit: 'عملية', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
      { label: 'المبلغ المطابق', value: matchedAmount, count: matchedTransactions.length, unit: 'عملية', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
      { label: 'نسبة المطابقة', value: matchRate, icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50/50', isPercentage: true },
      { label: 'رسوم المعالجة', value: totalFees, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/50' },
    ];
  }, [donations, bankRecords, reconciledTransactions, matchedTransactions]);

  if (!mounted) return null;

  if (uploadedDonationFiles.length === 0 || bankRecords.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12" dir="rtl">
        <div className="w-full max-w-3xl space-y-12">
          {/* Hero Section */}
          <motion.div className="text-center space-y-6" {...animations.fadeIn}>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">منصة المطابقة المالية</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
              أهلاً بك في نظام <span className="text-indigo-600">المطابقة الذكي</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
              ارفع تقارير التبرعات (لمرة واحدة + شهرية) وكشف حساب البنك للبدء في المطابقة التلقائية.
            </p>
          </motion.div>

          {/* Upload Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...animations.slideUp} transition={{ delay: 0.1 }} className="flex flex-col">
              <FileUpload type="donations" label="تقرير التبرعات" />
            </motion.div>
            <motion.div {...animations.slideUp} transition={{ delay: 0.2 }} className="flex flex-col">
              <FileUpload type="bank" label="كشف حساب البنك" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-8"
          >
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest flex items-center justify-center gap-2">
              <BarChart3 size={14} />
              مدعوم بالذكاء الاصطناعي للمطابقة
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100" dir="rtl">
      {/* Top Header */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-lg font-bold">لوحة المطابقة</h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs font-bold border border-transparent hover:border-rose-100"
          >
            <Trash2 size={14} />
            إعادة تعيين
          </motion.button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                {stat.count !== undefined && (
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-tighter">
                    {stat.count} {stat.unit}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black tabular-nums tracking-tighter">
                    {stat.isPercentage ? `${stat.value.toFixed(1)}%` : `${stat.value.toFixed(3)}`}
                  </p>
                  {!stat.isPercentage && <span className="text-[10px] font-bold text-slate-400">د.ب</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Category Summary Panel */}
        {activeView === 'matched' && categorySummary && categorySummary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setShowCategorySummary(!showCategorySummary)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-indigo-600" />
                <span className="font-bold text-sm text-slate-700">ملخص التبرعات حسب الفئة (للفترة المختارة)</span>
              </div>
              {showCategorySummary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <AnimatePresence>
              {showCategorySummary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-white">
                    {categorySummary.map(([cat, data]) => (
                      <div key={cat} className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat as DonationCategory]?.split(' ')[0] || 'bg-slate-400'}`}></span>
                          <span className="text-[10px] font-black text-slate-500 uppercase">{CATEGORY_MAP_AR[cat as DonationCategory] || cat}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black tabular-nums">{data.total.toFixed(3)} <span className="text-[10px] text-slate-400">د.ب</span></span>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{data.count} تبرع</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Filter Bar */}
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          onClear={() => setFilters({ dateFrom: '', dateTo: '', amountMin: '', amountMax: '', categories: [], searchQuery: '' })}
        />

        {/* Data Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveView('matched')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all relative ${activeView === 'matched' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <CheckCircle2 size={16} />
              المتطابقة ({matchedTransactions.filter(t => t.reconciliation.status === 'matched').length})
              {activeView === 'matched' && <motion.div layoutId="tab-active" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
            </button>
            <button
              onClick={() => setActiveView('unmatched')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all relative ${activeView === 'unmatched' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <XCircle size={16} />
              تقرير البنك (غير المطابق) ({unmatchedBankEntries.length})
              {activeView === 'unmatched' && <motion.div layoutId="tab-active" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
            </button>
            <button
              onClick={() => setActiveView('unmatched_donation')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all relative ${activeView === 'unmatched_donation' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <AlertTriangle size={16} />
              تقرير التبرعات (غير المطابق) ({unmatchedDonations.length})
              {activeView === 'unmatched_donation' && <motion.div layoutId="tab-active" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">البيان / الاسم</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">رقم العملية (Auth)</th>
                  {activeView === 'matched' ? (
                    <>
                      <th className="px-6 py-4">الصافي</th>
                      <th className="px-6 py-4">الرسوم</th>
                      <th className="px-6 py-4">الفئة</th>
                    </>
                  ) : activeView === 'unmatched_donation' ? (
                    <>
                      <th className="px-6 py-4">الفئة</th>
                      <th className="px-6 py-4">الحالة</th>
                    </>
                  ) : (
                    <th className="px-6 py-4">الحالة</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getFilteredTransactions.map((item, idx) => {
                  const currentTxId = item.donation?.transactionId || item.bankRecord?.traceId;
                  // Look for same transaction ID in adjacent filtered results
                  const isPartofGroup = currentTxId && getFilteredTransactions.some((other, oIdx) => {
                    const otherTxId = other.donation?.transactionId || other.bankRecord?.traceId;
                    return oIdx !== idx && otherTxId === currentTxId;
                  });

                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isPartofGroup ? 'bg-indigo-50/10' : ''}`}>
                      <td className="px-6 py-4 text-slate-500 tabular-nums font-medium">
                        {item.bankRecord?.date || item.donation?.date}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex flex-col">
                          <span>{item.donation?.donorName || item.bankRecord?.description}</span>
                          {isPartofGroup && (
                            <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-1 mt-0.5">
                              <CreditCard size={10} />
                              تبرع مجزأ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 tabular-nums">
                        {(item.donation?.amount || item.bankRecord?.amount)?.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500 tabular-nums">
                        {item.donation?.transactionId || item.bankRecord?.traceId || '-'}
                      </td>
                      {activeView === 'matched' && (
                        <>
                          <td className="px-6 py-4 text-emerald-600 font-black tabular-nums">
                            {item.reconciliation.netActual?.toFixed(3)}
                          </td>
                          <td className="px-6 py-4 text-rose-500 font-bold tabular-nums">
                            {item.reconciliation.feeAmount.toFixed(3)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border ${CATEGORY_COLORS[item.donation?.category || 'General'] || 'bg-slate-100 text-slate-600'}`}>
                              {CATEGORY_MAP_AR[item.donation?.category || 'General'] || 'غير معروف'}
                            </span>
                          </td>
                        </>
                      )}
                      {activeView === 'unmatched' && (
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase">إضافة بنكية</span>
                        </td>
                      )}
                      {activeView === 'unmatched_donation' && (
                        <>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border ${CATEGORY_COLORS[item.donation?.category || 'General'] || 'bg-slate-100 text-slate-600'}`}>
                              {CATEGORY_MAP_AR[item.donation?.category || 'General'] || 'غير معروف'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase">غير موجود بالبنك</span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {getFilteredTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                <Search size={40} className="mb-2 opacity-10" />
                <p className="font-bold">لا توجد سجلات</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <QuickActions transactions={reconciledTransactions} />
    </div>
  );
}
