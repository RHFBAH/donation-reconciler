const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'donation.xlsx');
console.log('Reading file:', filePath);

try {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header: 1 gives array of arrays

    if (data.length > 0) {
        console.log('Headers:', data[0]);
        if (data.length > 1) {
            console.log('First Row (Raw):', data[1]);
            // Also try to view as object to see how keys map
            const dataObj = XLSX.utils.sheet_to_json(sheet);
            if (dataObj.length > 0) {
                console.log('First Row (Object):', dataObj[0]);
            }
        }
    } else {
        console.log('File is empty');
    }
} catch (e) {
    console.error('Error reading file:', e);
}
