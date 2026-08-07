const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
];

function formatPakistaniPhone(phoneStr) {
  if (!phoneStr) return '03000000000';
  let str = phoneStr.toString().trim();
  
  // Remove non-digit characters
  let digits = str.replace(/[^\d]/g, '');

  // Remove leading country code 92 or 0092 if present
  if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.slice(2);
  }

  // Ensure starts with 0
  if (!digits.startsWith('0') && digits.length === 10 && digits.startsWith('3')) {
    digits = '0' + digits;
  }

  // Return clean 11-digit number or fallback
  if (digits.length === 11 && digits.startsWith('03')) {
    return digits;
  }

  return digits.length > 0 ? digits : '03000000000';
}

function extractPhoneFromLine(line) {
  // Regex to match any Pakistani phone number pattern:
  // e.g. 03xx-xxxxxxx, 03xxxxxxxxx, 03xx xxxxxxx, +923xxxxxxxxx, 923xxxxxxxxx
  const match = line.match(/(?:\+?92[-\s]?|0)(3\d{2})[-\s]?(\d{7})/);
  if (match) {
    return formatPakistaniPhone(match[0]);
  }
  
  // Fallback: look for 11 digits starting with 03 or 10 digits starting with 3
  const anyPhoneMatch = line.match(/\b(03\d{9}|3\d{9})\b/);
  if (anyPhoneMatch) {
    return formatPakistaniPhone(anyPhoneMatch[0]);
  }

  return '03000000000';
}

async function testPdfPhoneExtraction() {
  for (const filename of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', filename);
    if (!fs.existsSync(pdfPath)) continue;

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const lines = (pdfTextResult.text || '').split('\n');

    let totalRows = 0;
    let realPhoneCount = 0;
    let fallbackPhoneCount = 0;

    lines.forEach(lineStr => {
      const line = lineStr.trim();
      if (!line) return;
      const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (!srMatch) return;

      totalRows++;
      const phone = extractPhoneFromLine(line);
      if (phone !== '03000000000') {
        realPhoneCount++;
      } else {
        fallbackPhoneCount++;
      }
    });

    console.log(`[${filename}] Total Rows: ${totalRows} | Real Phones Extracted: ${realPhoneCount} | Fallbacks: ${fallbackPhoneCount}`);
  }
}

testPdfPhoneExtraction().catch(console.error);
