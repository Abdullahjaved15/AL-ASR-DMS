const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
];

async function scanForFemaleNames() {
  const femaleMatches = new Set();
  const femaleLines = [];

  for (const pdfName of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', pdfName);
    if (!fs.existsSync(pdfPath)) continue;

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    lines.forEach((line, i) => {
      // Look for Ms., Miss, Mrs., Ma'am, Mam, or female prefixes/titles
      const matches = line.match(/(Ms\.|Miss|Mrs\.|Ma'am|Mam|Ms\s)[A-Za-z\s.]+/gi);
      if (matches) {
        matches.forEach(m => femaleMatches.add(m.trim()));
        femaleLines.push({ pdf: pdfName, line: line.trim() });
      }

      // Also check if any common female Pakistani names appear near assigned columns
      // e.g. "Fatima", "Ayesha", "Sana", "Iqra", "Zainab", "Sidra", "Maryam", "Laiba", "Khadija", "Sadia", "Rabia", "Anum", "Mahnoor"
      const femaleNameMatch = line.match(/\b(Ms\w*|Ma'?am|Miss|Mrs\w*|Fatima|Ayesha|Sana|Iqra|Zainab|Sidra|Maryam|Laiba|Khadija|Sadia|Rabia|Anum|Mahnoor|Bushra|Nida|Nimra|Samina|Saima|Farah|Fouzia|Kinza|Hira|Alina|Amna|Sundas|Aleena)\b/gi);
      if (femaleNameMatch) {
        femaleNameMatch.forEach(m => femaleMatches.add(m.trim()));
        femaleLines.push({ pdf: pdfName, line: line.trim() });
      }
    });
  }

  console.log('=== DETECTED FEMALE / MA\'AM PATTERNS ===');
  console.log(Array.from(femaleMatches));

  console.log('\n=== SAMPLE MATCHING LINES ===');
  femaleLines.slice(0, 30).forEach(l => console.log(`[${l.pdf}] ${l.line}`));
}

scanForFemaleNames().catch(console.error);
