const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
];

async function debugColumns() {
  for (const filename of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', filename);
    if (!fs.existsSync(pdfPath)) continue;

    console.log(`\n========================================`);
    console.log(`DEBUG COLUMNS: ${filename}`);
    console.log(`========================================`);

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const lines = (pdfTextResult.text || '').split('\n');

    let count = 0;
    for (const lineStr of lines) {
      const line = lineStr.trim();
      if (!line) continue;
      const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (!srMatch) continue;

      count++;
      if (count <= 8) {
        console.log(`\nRow #${srMatch[1]} (Line): ${line}`);
        const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
        parts.forEach((p, idx) => {
          console.log(`  col[${idx}]: "${p.trim()}"`);
        });
      }
    }
  }
}

debugColumns().catch(console.error);
