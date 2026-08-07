const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const pdfFiles = [
  { name: 'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf', type: 'buyer' },
  { name: 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf', type: 'buyer' },
  { name: 'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf', type: 'seller' },
  { name: 'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf', type: 'seller' }
];

function cleanSalesmanName(raw) {
  if (!raw) return null;
  let str = raw.trim();
  // Remove trailing tab/extra text like "Personal", "Branch", "Social", "Whatsapp", "via", "on", "about", "for", "regarding", "and", "but", "in"
  str = str.replace(/[\t\r\n].*$/, ''); // keep before tab
  str = str.replace(/\s+(Personal|Branch|Social|Whatsapp|Official|Pics|MISSING|Walk-In|Reference|Inquiry|via|on|about|for|regarding|and|but|in|by|via).*$/i, '');
  str = str.trim();

  // Handle "Mr." prefix
  if (!str.startsWith('Mr.') && !str.startsWith('Mr ')) {
    // If it's just "Atif" or "Imran", add "Mr. " prefix or standardize
    if (/^(Imran|Atif|Humam|Zubair|Shehroz|Umar|Ahmad Sajjad|Shaheer|Jahanzeb|Haroon|Taimoor|Shayan|Ahsan|Ali|Mudassar|Umair|Ahmad|Azam|Rehan|Nadeem|Hamid|Abdullah|Mubashar|Mohsin|Shahzaib|Amir|Mubashir)$/i.test(str)) {
      str = 'Mr. ' + str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  // Normalize spaces
  str = str.replace(/\s+/g, ' ').trim();
  if (str.startsWith('Mr.') && !str.startsWith('Mr. ')) {
    str = str.replace(/^Mr\./, 'Mr. ');
  }

  return str;
}

async function testExtraction() {
  const existingUsers = await prisma.user.findMany();
  console.log('Existing Users in DB:', existingUsers.map(u => u.name));

  const allSalesmenDetected = new Map(); // name -> count

  for (const pdfItem of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', pdfItem.name);
    if (!fs.existsSync(pdfPath)) {
      console.log(`File not found: ${pdfPath}`);
      continue;
    }

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    let rowCount = 0;
    let assignedCount = 0;

    for (const lineStr of lines) {
      const line = lineStr.trim();
      if (!line) continue;
      const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
      if (!srMatch) continue;

      rowCount++;

      const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
      
      // Let's check potential salesman column positions:
      // In buyers and sellers tables in PDF, columns are typically:
      // 0: Sr#, 1: Date, 2: Vehicle, 3: Model, 4: Color, 5: Mileage/Budget, 6: Demand/Budget, 7: Contact Name, 8: Phone, 9: City, 10: Assigned Salesman / Reference, 11: Lead Source, 12: Salesman / Status
      
      let candidate = null;
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed.startsWith('Mr.') || trimmed.startsWith('Mr ')) {
          candidate = trimmed;
          break; // take first Mr. occurrence in the row
        }
      }

      if (candidate) {
        const cleaned = cleanSalesmanName(candidate);
        if (cleaned) {
          assignedCount++;
          allSalesmenDetected.set(cleaned, (allSalesmenDetected.get(cleaned) || 0) + 1);
        }
      }
    }

    console.log(`\nPDF: ${pdfItem.name}`);
    console.log(`Total Rows: ${rowCount}, Salesman Assigned Rows: ${assignedCount}`);
  }

  console.log('\n========================================');
  console.log('ALL DETECTED SALESMEN NAMES & FREQUENCIES:');
  console.log('========================================');
  console.dir(Object.fromEntries(allSalesmenDetected));
}

testExtraction().catch(console.error).finally(() => prisma.$disconnect());
