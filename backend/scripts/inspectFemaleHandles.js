const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
];

async function findFemaleHandles() {
  const maamCounts = {};
  const maamLines = [];

  for (const pdfName of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', pdfName);
    if (!fs.existsSync(pdfPath)) continue;

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const srMatch = trimmed.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (!srMatch) return;

      const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s{2,}/);

      // Check parts for "Ma'am", "Maam", "Mam", "Ms.", "Miss", "Mrs."
      parts.forEach(p => {
        const val = p.trim();
        if (/\b(Ma'?am|Mam|Madam|Ms\.|Miss|Mrs\.)\b/i.test(val)) {
          maamCounts[val] = (maamCounts[val] || 0) + 1;
          maamLines.push({ pdf: pdfName, line: trimmed, match: val });
        }
      });
    });
  }

  console.log('=== FEMALE / MA\'AM COLUMN MATCHES ===');
  console.table(maamCounts);

  console.log('\n=== SAMPLE MATCHING LINES ===');
  maamLines.forEach(l => {
    console.log(`\n[${l.pdf}] Match: "${l.match}"`);
    console.log(`Line: ${l.line}`);
  });
}

findFemaleHandles().catch(console.error);
