import { DonationCategory } from '@/types/finance';

export const STATUS_COLORS = {
    matched: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-100',
        badge: 'bg-emerald-100/80 text-emerald-700',
        icon: 'text-emerald-500'
    },
    pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-100',
        badge: 'bg-amber-100/80 text-amber-700',
        icon: 'text-amber-500'
    },
    extra: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-100',
        badge: 'bg-rose-100/80 text-rose-700',
        icon: 'text-rose-500'
    },
    discrepancy: {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        border: 'border-violet-100',
        badge: 'bg-violet-100/80 text-violet-700',
        icon: 'text-violet-500'
    }
};

export const CATEGORY_COLORS: Record<DonationCategory, string> = {
    Zakat: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    InsulinPumps: 'bg-blue-50 text-blue-700 border-blue-100',
    General: 'bg-slate-50 text-slate-700 border-slate-100',
    Debtors: 'bg-orange-50 text-orange-700 border-orange-100',
    Health: 'bg-rose-50 text-rose-700 border-rose-100',
    ProductiveFamilies: 'bg-teal-50 text-teal-700 border-teal-100',
    Social: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    Furniture: 'bg-stone-50 text-stone-700 border-stone-100',
    Education: 'bg-amber-50 text-amber-700 border-amber-100',
    Humanitarian: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Orphans: 'bg-pink-50 text-pink-700 border-pink-100',
    Split: 'bg-purple-50 text-purple-700 border-purple-100'
};

export const animations = {
    fadeIn: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.3, ease: 'easeOut' }
    },
    slideUp: {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'backOut' }
    },
    stagger: {
        container: {
            animate: { transition: { staggerChildren: 0.05 } }
        },
        item: {
            initial: { opacity: 0, y: 15 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.4, ease: 'easeOut' }
        }
    },
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.2, ease: 'easeOut' }
    }
} as const;
