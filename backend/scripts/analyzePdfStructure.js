const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf',
  'Stock.pdf'
];

async function analyze() {
  for (const pdfName of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', pdfName);
    if (!fs.existsSync(pdfPath)) continue;

    console.log(`\n========================================`);
    console.log(`ANALYZING PDF: ${pdfName}`);
    console.log(`========================================`);

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    console.log(`Total lines: ${lines.length}`);
    
    // Sample lines with Sr#
    let srLines = 0;
    const salesmanFoundInLines = new Map();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Print first 5 data lines
      const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (srMatch) {
        srLines++;
        if (srLines <= 10) {
          console.log(`\n[Line ${i}] ${line}`);
          const tabParts = line.split('\t');
          const spaceParts = line.split(/\s{2,}/);
          console.log(`  Tab parts (${tabParts.length}):`, tabParts);
          console.log(`  Space parts (${spaceParts.length}):`, spaceParts);
        }

        // Try to find any salesman name in the line
        // Common Pakistani names or "Mr." prefix
        const words = line.split(/[\t\s]+/);
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          if (word.startsWith('Mr.') || word.startsWith('Mr')) {
            const fullSalesman = (word + ' ' + (words[w+1] || '')).trim();
            salesmanFoundInLines.set(fullSalesman, (salesmanFoundInLines.get(fullSalesman) || 0) + 1);
          }
        }
      }
    }

    console.log(`\nFound ${srLines} data rows in ${pdfName}.`);
    console.log(`Salesman frequencies found via Mr. prefix:`, Object.fromEntries(salesmanFoundInLines));
  }
}

analyze().catch(console.error);
