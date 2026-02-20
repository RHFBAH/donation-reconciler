'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, PlusCircle, Files } from 'lucide-react';
import { parseDonationFile, parseBankFile } from '@/lib/parsers';
import { useReconciliationStore } from '@/lib/store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileUploadProps {
    type: 'donations' | 'bank';
    label: string;
    onSuccess?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ type, label, onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [selectedEncoding, setSelectedEncoding] = useState<string>('auto');
    const { setDonations, addDonations, setBankRecords, uploadedDonationFiles, removeDonationFile } = useReconciliationStore();

    const handleFile = async (file: File) => {
        setStatus('loading');
        setErrorMessage(null);
        setFileName(file.name);
        try {
            if (type === 'donations') {
                const records = await parseDonationFile(file, selectedEncoding);
                if (records.length === 0) throw new Error('الملف فارغ أو بتنسيق غير صحيح');
                addDonations(records, file.name);
            } else {
                const records = await parseBankFile(file, selectedEncoding);
                if (records.length === 0) throw new Error('الملف فارغ أو بتنسيق غير صحيح');
                setBankRecords(records);
            }
            setStatus('success');
            onSuccess?.();
            // Reset status after a few seconds so a new file can be uploaded again
            if (type === 'donations') {
                setTimeout(() => { setStatus('idle'); setFileName(null); }, 2500);
            }
        } catch (error: any) {
            console.error(error);
            setErrorMessage(error.message || 'حدث خطأ أثناء معالجة الملف');
            setStatus('error');
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
            // Reset input so same file can be re-selected
            e.target.value = '';
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const isMultiMode = type === 'donations';
    const hasUploadedFiles = isMultiMode && uploadedDonationFiles.length > 0;

    return (
        <div className="space-y-4">
            {/* Encoding Selection for CSV */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    ترميز الملف:
                </label>
                <select
                    value={selectedEncoding}
                    onChange={(e) => setSelectedEncoding(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer hover:text-primary transition-colors min-w-[140px]"
                    dir="rtl"
                >
                    <option value="auto">تلقائي ✨</option>
                    <option value="windows-1256">العربية (Windows-1256)</option>
                    <option value="UTF-8">العالمي (UTF-8)</option>
                    <option value="ISO-8859-6">العربية (ISO-8859-6)</option>
                </select>
            </div>

            {/* Uploaded Donation Files List */}
            {hasUploadedFiles && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Files size={12} />
                        الملفات المرفوعة ({uploadedDonationFiles.reduce((s, f) => s + f.count, 0)} سجل)
                    </p>
                    {uploadedDonationFiles.map((f) => (
                        <div key={f.name} className="flex items-center justify-between gap-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-700 truncate">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{f.count} تبرع</span>
                                <button
                                    onClick={() => removeDonationFile(f.name)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                    title="حذف هذا الملف"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* File Upload Area */}
            <div
                className={cn(
                    'relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-500 flex flex-col items-center justify-center text-center gap-4 bg-white shadow-sm ring-1 ring-slate-200/10',
                    isDragging ? 'border-primary bg-blue-50/50 scale-[1.02]' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50/50 hover:shadow-md',
                    status === 'success' && !isMultiMode && 'border-emerald-200 bg-emerald-50/30',
                    status === 'success' && isMultiMode && 'border-slate-200', // reset after adding
                    status === 'error' && 'border-rose-200 bg-rose-50/30'
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={onFileChange}
                    className="hidden"
                    ref={fileInputRef}
                />

                <div className={cn(
                    "p-4 rounded-2xl transition-all duration-500 shadow-sm",
                    status === 'idle' && "bg-slate-100 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:rotate-6",
                    status === 'loading' && "bg-blue-100 text-blue-600 animate-bounce",
                    status === 'success' && !isMultiMode && "bg-emerald-100 text-emerald-600",
                    status === 'success' && isMultiMode && "bg-emerald-100 text-emerald-600",
                    status === 'error' && "bg-rose-100 text-rose-600"
                )}>
                    {status === 'success' ? (
                        isMultiMode ? <PlusCircle size={32} /> : <CheckCircle2 size={32} />
                    ) : status === 'error' ? (
                        <AlertCircle size={32} />
                    ) : isMultiMode && hasUploadedFiles ? (
                        <PlusCircle size={32} />
                    ) : (
                        <Upload size={32} />
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-800">
                        {isMultiMode && hasUploadedFiles ? `إضافة ملف آخر` : label}
                    </h3>
                    <p className={cn(
                        "text-sm max-w-[220px] leading-relaxed transition-colors",
                        status === 'error' ? "text-rose-500 font-semibold" : "text-slate-500"
                    )}>
                        {status === 'loading' ? 'جاري المعالجة...'
                            : status === 'error' ? errorMessage
                                : status === 'success' && isMultiMode ? `✓ تمت إضافة: ${fileName}`
                                    : status === 'success' && !isMultiMode ? fileName
                                        : isMultiMode && hasUploadedFiles
                                            ? 'يمكنك رفع تقرير تبرعات إضافي'
                                            : 'اسحب الملف هنا أو انقر للاختيار'}
                    </p>
                </div>

                <div className="flex gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded">CSV</span>
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded">EXCEL</span>
                </div>

                {isMultiMode && (
                    <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-2 text-[10px] text-indigo-600/80 font-bold bg-indigo-50/50 py-1.5 rounded-lg border border-indigo-100/50 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="animate-pulse">📁</span>
                        <span>يمكنك رفع ملفين: تبرعات مرة واحدة + شهرية</span>
                    </div>
                )}
                {!isMultiMode && (
                    <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-2 text-[10px] text-amber-600/80 font-bold bg-amber-50/50 py-1.5 rounded-lg border border-amber-100/50 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="animate-pulse">💡</span>
                        <span>استخدم Excel (.xlsx) لأفضل نتائج</span>
                    </div>
                )}
            </div>
        </div>
    );
};
