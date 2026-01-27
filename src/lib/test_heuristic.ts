
import { parse } from 'date-fns';

// Simplified version of the logic to test the heuristic
const detectDateFormat = (dateValues: any[]): 'US' | 'UK' => {
    let usCount = 0;
    let ukCount = 0;
    for (const val of dateValues) {
        if (!val) continue;
        const str = String(val).trim();
        const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) {
            const first = parseInt(match[1]);
            const second = parseInt(match[2]);
            if (first > 12) ukCount++;
            else if (second > 12) usCount++;
        }
    }
    if (usCount > 0 && ukCount === 0) return 'US';
    if (ukCount > 0 && usCount === 0) return 'UK';
    return 'UK';
};

const testDates = [
    '1/14/2026', // Clearly US (Jan 14)
    '1/9/2026',  // Ambiguous (Should be Jan 9 if US, Sep 1 if UK)
];

const pref = detectDateFormat(testDates);
console.log('Detected Preference:', pref);

if (pref === 'US') {
    console.log('SUCCESS: Correctly detected US format from 1/14/2026');
} else {
    console.error('FAILURE: Format not detected correctly');
    process.exit(1);
}
