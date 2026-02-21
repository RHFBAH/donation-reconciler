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
    Zakat: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    InsulinPumps: 'bg-sky-100 text-sky-800 border-sky-300',
    General: 'bg-slate-100 text-slate-700 border-slate-300',
    Debtors: 'bg-rose-100 text-rose-800 border-rose-300',
    Health: 'bg-red-100 text-red-800 border-red-300',
    ProductiveFamilies: 'bg-teal-100 text-teal-800 border-teal-300',
    Social: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    Furniture: 'bg-orange-100 text-orange-800 border-orange-300',
    Education: 'bg-amber-100 text-amber-800 border-amber-300',
    Humanitarian: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    Orphans: 'bg-pink-100 text-pink-800 border-pink-300',
    OrphansDinar: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    HealingAndHope: 'bg-rose-100 text-rose-800 border-rose-300',
    AutismCenter: 'bg-blue-100 text-blue-800 border-blue-300',
    Split: 'bg-purple-100 text-purple-800 border-purple-300'
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
