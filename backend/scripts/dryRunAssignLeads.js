const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const pdfFiles = {
  mainBuyer: 'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  dailyBuyer: 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  mainSeller: 'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  dailySeller: 'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
};

function normalizeSalesmanName(rawName) {
  if (!rawName) return null;
  let str = rawName.trim();

  // Strip anything after tab or newline
  str = str.replace(/[\t\r\n].*$/, '');

  // Strip suffixes like "Personal", "Branch", "Social", "Whatsapp", "Walk-In", "Reference", "Inquiry", etc.
  str = str.replace(/\s+(Personal|Branch|Social|Whatsapp|Official|Pics|MISSING|Walk-In|Reference|Inquiry|via|on|about|for|regarding|and|but|in|by|via|Replied).*$/i, '');
  str = str.trim();

  // Handle Ma'am / Ms / Miss / Mrs
  const maamMatch = str.match(/^(Ma'?am|Mam|Madam|Ms\.?|Miss|Mrs\.?)\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (maamMatch) {
    const title = maamMatch[1].toLowerCase().includes('ms') ? 'Ms.' : 'Ma\'am';
    const name = maamMatch[2].charAt(0).toUpperCase() + maamMatch[2].slice(1);
    return `${title} ${name}`;
  }

  // Standardize male name variations
  if (/^Imran(\s+Anees)?$/i.test(str) || /^Mr\.?\s*Imran(\s+Anees)?$/i.test(str)) return 'Mr. Imran';
  if (/^Atif$/i.test(str) || /^Mr\.?\s*Atif$/i.test(str)) return 'Mr. Atif';
  if (/^Humam$/i.test(str) || /^Mr\.?\s*Humam$/i.test(str)) return 'Mr. Humam';
  if (/^Zubair$/i.test(str) || /^Mr\.?\s*Zubair$/i.test(str)) return 'Mr. Zubair';
  if (/^Shehroz$/i.test(str) || /^Mr\.?\s*Shehroz$/i.test(str)) return 'Mr. Shehroz';
  if (/^Umar$/i.test(str) || /^Umer$/i.test(str) || /^Mr\.?\s*Um[ae]r$/i.test(str)) return 'Mr. Umar';
  if (/^Ahmad\s+Sajjad$/i.test(str) || /^Mr\.?\s*Ahmad\s+Sajjad$/i.test(str)) return 'Mr. Ahmad Sajjad';
  if (/^Shaheer$/i.test(str) || /^Mr\.?\s*Shaheer$/i.test(str)) return 'Mr. Shaheer';
  if (/^Jahanzeb$/i.test(str) || /^Mr\.?\s*Jahanzeb$/i.test(str)) return 'Mr. Jahanzeb';
  if (/^Haroon$/i.test(str) || /^Mr\.?\s*Haroon$/i.test(str)) return 'Mr. Haroon';
  if (/^Taimoor$/i.test(str) || /^Mr\.?\s*Taimoor$/i.test(str)) return 'Mr. Taimoor';
  if (/^Shayan$/i.test(str) || /^Mr\.?\s*Shayan$/i.test(str)) return 'Mr. Shayan';
  if (/^Ahsan$/i.test(str) || /^Mr\.?\s*Ahsan$/i.test(str)) return 'Mr. Ahsan';
  
  if (/^Mudassar$/i.test(str) || /^Mr\.?\s*Mudassar$/i.test(str)) return 'Mr. Mudassar';
  if (/^Rehan$/i.test(str) || /^Mr\.?\s*Rehan$/i.test(str)) return 'Mr. Rehan';
  if (/^Nadeem$/i.test(str) || /^Mr\.?\s*Nadeem$/i.test(str)) return 'Mr. Nadeem';
  if (/^Hamid$/i.test(str) || /^Mr\.?\s*Hamid$/i.test(str)) return 'Mr. Hamid';
  if (/^Mubash[ia]r(\s+Usman)?$/i.test(str) || /^Mr\.?\s*Mubash[ia]r(\s+Usman)?$/i.test(str)) return 'Mr. Mubashir';
  if (/^Abdullah$/i.test(str) || /^Mr\.?\s*Abdullah$/i.test(str)) return 'Mr. Abdullah';
  if (/^Mohsin$/i.test(str) || /^Mr\.?\s*Mohsin$/i.test(str)) return 'Mr. Mohsin';
  if (/^Ali$/i.test(str) || /^Mr\.?\s*Ali$/i.test(str)) return 'Mr. Ali';
  if (/^Umair$/i.test(str) || /^Mr\.?\s*Umair$/i.test(str)) return 'Mr. Umair';
  if (/^Ahmad\s+Jameel$/i.test(str) || /^Mr\.?\s*Ahmad\s+Jameel$/i.test(str)) return 'Mr. Ahmad Jameel';
  if (/^Ahmad$/i.test(str) || /^Mr\.?\s*Ahmad$/i.test(str)) return 'Mr. Ahmad';
  if (/^Amir$/i.test(str) || /^Mr\.?\s*Amir$/i.test(str)) return 'Mr. Amir';
  if (/^Shahzaib/i.test(str) || /^Mr\.?\s*Shahzaib/i.test(str)) return 'Mr. Shahzaib';
  if (/^Azam$/i.test(str) || /^Mr\.?\s*Azam$/i.test(str)) return 'Mr. Azam';

  if (str.startsWith('Mr.') || str.startsWith('Mr ')) {
    return str.replace(/^Mr\.\s*/, 'Mr. ');
  }

  return null;
}

function extractSalesmanFromLine(line) {
  const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
  
  // Check specific column indexes
  for (let idx of [10, 12, 11, 13, 9, 8, 7, 14, 15]) {
    if (parts[idx]) {
      const norm = normalizeSalesmanName(parts[idx]);
      if (norm) return norm;
    }
  }

  // Fallback scan through all parts
  for (const p of parts) {
    const norm = normalizeSalesmanName(p);
    if (norm) return norm;
  }

  // Regex fallback for Mr. / Ma'am / Ms. / Miss / Mrs.
  const match = line.match(/((?:Mr\.|Ma'?am|Mam|Madam|Ms\.|Miss|Mrs\.)\s*[A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (match) {
    return normalizeSalesmanName(match[1]);
  }

  return null;
}

async function dryRun() {
  console.log('=== DRY RUN: PARSING ALL PDFS & MATCHING MALE + FEMALE HANDLES ===');

  const existingUsers = await prisma.user.findMany();
  const userMap = new Map();
  existingUsers.forEach(u => {
    userMap.set(u.name.trim(), u);
  });

  const salesmanCounts = {};
  const missingSalesmenToCreate = new Set();

  for (const [key, filename] of Object.entries(pdfFiles)) {
    const pdfPath = path.join(__dirname, '..', '..', filename);
    if (!fs.existsSync(pdfPath)) continue;

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const lines = (pdfTextResult.text || '').split('\n');

    let rows = 0;
    let assigned = 0;

    for (const lineStr of lines) {
      const line = lineStr.trim();
      if (!line) continue;
      const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (!srMatch) continue;

      rows++;
      const salesmanName = extractSalesmanFromLine(line);
      if (salesmanName) {
        assigned++;
        salesmanCounts[salesmanName] = (salesmanCounts[salesmanName] || 0) + 1;
        if (!userMap.has(salesmanName)) {
          missingSalesmenToCreate.add(salesmanName);
        }
      }
    }

    console.log(`[${key}] File: ${filename} | Rows: ${rows} | Assigned Rows: ${assigned}`);
  }

  console.log('\n=== TOTAL LEADS PER SALESPERSON / HANDLE ===');
  console.table(salesmanCounts);

  console.log('\n=== MISSING ACCOUNTS TO CREATE ===');
  console.log(Array.from(missingSalesmenToCreate));
}

dryRun().catch(console.error).finally(() => prisma.$disconnect());
