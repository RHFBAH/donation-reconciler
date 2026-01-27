
const { parse, isValid, format } = require('date-fns');

const parseDate = (dateVal) => {
    if (!dateVal) return "Fallback: Empty";

    // If it's already a Date object
    if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
    }

    const dateStr = String(dateVal).trim();
    if (!dateStr) return "Fallback: Empty String";

    // Common formats to try
    const formats = [
        'yyyy-MM-dd',
        'dd-MM-yyyy',
        'dd/MM/yyyy',
        'yyyy/MM/dd',
        'MM/dd/yyyy',
        'd-M-yyyy',
        'd/M/yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd HH:mm',
        'dd-MM-yyyy HH:mm:ss',
        'dd/MM/yyyy HH:mm:ss'
    ];

    for (const fmt of formats) {
        try {
            const parsed = parse(dateStr, fmt, new Date());
            if (isValid(parsed)) {
                return `Matched Format: ${fmt} -> ${format(parsed, 'yyyy-MM-dd')}`;
            }
        } catch (e) {
            // continue
        }
    }

    // Fallback: try Date.parse
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
        return `Matched Date.parse -> ${new Date(timestamp).toISOString().split('T')[0]}`;
    }

    return "Fallback: Failed all";
};

console.log("Test 1: '2026-01-20 07:20:31'");
console.log(parseDate('2026-01-20 07:20:31'));

console.log("Test 2: '2026-01-20T07:20:30.107+00:00'");
console.log(parseDate('2026-01-20T07:20:30.107+00:00'));

console.log("Test 3: Date Object");
console.log(parseDate(new Date('2026-01-20 07:20:31')));
