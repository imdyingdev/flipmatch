const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Read the HTML file
const htmlPath = path.join(__dirname, 'public', 'sheet.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Parse HTML
const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// Find all rows in the sheet
const rows = document.querySelectorAll('.waffle tbody tr');

// Prepare CSV content
let csvContent = 'Column B,Column D\n';

// Process each row
rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 5) { // Make sure we have at least 5 columns (A-E)
        const colB = (cells[1]?.textContent || '').trim().replace(/,/g, ';'); // Column B (index 1)
        const colD = (cells[3]?.textContent || '').trim().replace(/,/g, ';'); // Column D (index 3)
        
        // Only add row if at least one column has data
        if (colB || colD) {
            csvContent += `"${colB}","${colD}"\n`;
        }
    }
});

// Write to CSV file
const outputPath = path.join(__dirname, 'extracted_data.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`Data has been extracted and saved to: ${outputPath}`);
