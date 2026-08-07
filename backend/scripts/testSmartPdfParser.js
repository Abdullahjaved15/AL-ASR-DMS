const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { formatPakistaniPhone } = require('../src/utils/phoneFormatter');

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
];

function parseRowSmart(line, rowNum, defaultType = 'Lead') {
  const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);

  // 1. Extract Real Phone Number
  let phone = '03000000000';
  let phoneColIndex = -1;

  for (let idx = 0; idx < parts.length; idx++) {
    const p = parts[idx].trim();
    const phoneMatch = p.match(/(?:\+?92[-\s]?|0)(3\d{2})[-\s]?(\d{7})|\b(03\d{9}|3\d{9})\b/);
    if (phoneMatch) {
      phone = formatPakistaniPhone(phoneMatch[0]);
      phoneColIndex = idx;
      break; // found real phone
    }
  }

  // 2. Extract Contact Name
  let name = `${defaultType} #${rowNum}`;
  if (phoneColIndex > 0 && parts[phoneColIndex - 1]) {
    const rawName = parts[phoneColIndex - 1].trim();
    const clean = rawName.replace(/[\d\-_]+/g, '').replace(/[^\w\s.()]/gi, '').trim();
    if (clean && clean.length >= 2 && !/^(Un-Known|Unknown|-)$/i.test(clean)) {
      name = clean;
    }
  } else if (parts[7]) {
    const rawName = parts[7].trim();
    const clean = rawName.replace(/[\d\-_]+/g, '').replace(/[^\w\s.()]/gi, '').trim();
    if (clean && clean.length >= 2 && !/^(Un-Known|Unknown|-)$/i.test(clean)) {
      name = clean;
    }
  }

  // 3. Extract City (Look at column immediately following phone number if it exists and isn't a salesman/status)
  let city = 'Sahiwal';
  if (phoneColIndex !== -1 && parts[phoneColIndex + 1]) {
    const rawCity = parts[phoneColIndex + 1].trim();
    // Check if rawCity is not a phone number, not a salesman ("Mr.", "Ma'am"), not a date
    if (rawCity && !/\d{5,}/.test(rawCity) && !/^(Mr\.|Ma'?am|Ms\.|Miss|Mrs\.|Personal|Branch|Walk-In|Whatsapp|Social|Deal|Incomplete|New|Contacted|Follow)/i.test(rawCity)) {
      const cleanCity = rawCity.replace(/[^\w\s]/gi, '').trim();
      if (cleanCity && cleanCity !== '-' && cleanCity.toLowerCase() !== 'un-known') {
        city = cleanCity;
      }
    }
  } else if (parts[9]) {
    const rawCity = parts[9].trim();
    if (rawCity && !/\d{5,}/.test(rawCity) && !/^(Mr\.|Ma'?am|Ms\.|Miss|Mrs\.|Personal|Branch|Walk-In)/i.test(rawCity)) {
      const cleanCity = rawCity.replace(/[^\w\s]/gi, '').trim();
      if (cleanCity && cleanCity !== '-' && cleanCity.toLowerCase() !== 'un-known') {
        city = cleanCity;
      }
    }
  }

  return { name, phone, city };
}

async function testSmartParser() {
  for (const filename of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', filename);
    if (!fs.existsSync(pdfPath)) continue;

    console.log(`\n========================================`);
    console.log(`SMART PARSER TEST: ${filename}`);
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
      if (count <= 6) {
        const parsed = parseRowSmart(line, srMatch[1], 'Seller');
        console.log(`Row #${srMatch[1]}:`);
        console.log(`  Name: "${parsed.name}"`);
        console.log(`  Phone: "${parsed.phone}"`);
        console.log(`  City: "${parsed.city}"`);
      }
    }
  }
}

testSmartParser().catch(console.error);
