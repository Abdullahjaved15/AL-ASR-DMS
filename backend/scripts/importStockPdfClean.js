const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parsePriceToPkr(priceStr) {
  if (!priceStr) return 0;
  let clean = priceStr.toLowerCase().trim();

  // e.g. "2.10 cr" or "2 c" or "108 cr"
  if (clean.includes('cr') || clean.includes('c ')) {
    const numMatch = clean.match(/([\d.]+)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      if (val < 10) return Math.round(val * 10000000); // 2.10 Cr -> 21,000,000
      return Math.round(val * 100000); // 108 Cr -> 10,800,000 (108 Lac)
    }
  }

  // e.g. "52", "49", "54.5", "29.5", "102"
  const numMatch = clean.match(/([\d.]+)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (val > 1000) return val; // raw PKR
    if (val < 5) return Math.round(val * 10000000); // e.g. 2 -> 20,000,000
    return Math.round(val * 100000); // 52 -> 5,200,000 PKR
  }

  return 0;
}

function parseMileage(mileageStr) {
  if (!mileageStr) return 0;
  let clean = mileageStr.toLowerCase().trim();
  if (clean.includes('zero') || clean.includes('zm') || clean.includes('new')) return 0;
  const numMatch = clean.match(/([\d.]+)\s*k/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]) * 1000);
  const rawNum = clean.replace(/[^\d]/g, '');
  return parseInt(rawNum, 10) || 0;
}

async function importStockPdf() {
  const stockPdfPath = path.join(__dirname, '..', '..', 'Stock.pdf');
  if (!fs.existsSync(stockPdfPath)) {
    console.log('Stock.pdf not found in workspace root!');
    return;
  }

  console.log('==============================================');
  console.log('IMPORTING SHOWROOM CURRENT STOCK FROM STOCK.PDF');
  console.log('==============================================');

  const fileBuf = new Uint8Array(fs.readFileSync(stockPdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');

  // Clear previous CurrentStock items
  await prisma.currentStock.deleteMany({});
  console.log('Cleared existing CurrentStock items in PostgreSQL.');

  const createdItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('Sr ') || line.startsWith('SrVEHICLES')) continue;

    // Pattern: SrNum VehicleName Year Color Mileage Price RegNum CareOf
    const match = line.match(/^(\d{1,3})\s+(.+)$/);
    if (!match) continue;

    const rowContent = match[2].trim();

    // Extract Care Of (e.g. "Umair Sab", "Ahsan Sab", "AL Asr", "Rana saleem", "Azam sab", "Imran Sab")
    let careOf = 'AL Asr';
    let contentWithoutCareOf = rowContent;

    const careOfMatch = rowContent.match(/(Umair\s*Sab|Ahsan\s*Sab|Rana\s*saleem|Azam\s*sab|Imran\s*Sab|AL\s*Asr|Amir\s*Sab|Sehroz\s*Sab|Shahzaib\s*Sab)$/i);
    if (careOfMatch) {
      careOf = careOfMatch[1].trim();
      contentWithoutCareOf = rowContent.substring(0, careOfMatch.index).trim();
    }

    // Extract Reg Number at end of content (e.g. "ATG 081", "APL-4", "BMG-280", "ATC 987", "BCF-016", "BDF 053", "BFG-945", "BF 0242", "AWD 525", "Dbp-583", "APH-234", "BTL 229")
    let regNumber = '-';
    const regMatch = contentWithoutCareOf.match(/\s+([A-Z]{2,4}[-\s]?\d{2,4})\s*$/i);
    if (regMatch) {
      regNumber = regMatch[1].trim();
      contentWithoutCareOf = contentWithoutCareOf.substring(0, regMatch.index).trim();
    }

    // Extract Model Year (e.g. "2024", "2016/21", "2020", "2026", "2018/23", "20/23", "2003/24", "2001/7", "23/26")
    let modelYear = new Date().getFullYear();
    let yearStr = '2024';
    const yearMatch = contentWithoutCareOf.match(/\b(20\d{2}|19\d{2}|\d{2}\/\d{2}|\d{4}\/\d{2})\b/);
    if (yearMatch) {
      yearStr = yearMatch[1];
      const yNum = parseInt(yearStr.split('/')[0], 10);
      modelYear = yNum > 100 ? yNum : (2000 + yNum);
    }

    // Split vehicle specs, color, mileage, price
    const tokens = contentWithoutCareOf.split(/\s+/);
    
    // Find color index
    const colors = ['white', 'black', 'silver', 'grey', 'gray', 'red', 'blue', 'brown', 'golden', 'wine', 'pearl'];
    let colorIdx = -1;
    let colorVal = 'White';
    for (let t = 0; t < tokens.length; t++) {
      if (colors.includes(tokens[t].toLowerCase())) {
        colorIdx = t;
        colorVal = tokens[t];
        break;
      }
    }

    let vehicleName = 'Vehicle';
    if (colorIdx > 0) {
      vehicleName = tokens.slice(0, colorIdx).join(' ').replace(/\s*\b(20\d{2}|19\d{2}|\d{2}\/\d{2})\b.*$/, '').trim();
    } else {
      vehicleName = tokens.slice(0, 3).join(' ');
    }

    // Extract mileage and price tokens
    let mileageVal = 0;
    let askingPricePkr = 0;

    const remainingText = tokens.slice(colorIdx > -1 ? colorIdx + 1 : 3).join(' ');
    
    // Mileage
    const mileageMatch = remainingText.match(/\b(\d+k|\d+\s*k|zero\s*meter|zm|low)\b/i);
    if (mileageMatch) {
      mileageVal = parseMileage(mileageMatch[1]);
    }

    // Price
    const priceMatch = remainingText.match(/\b(\d+\.?\d*\s*(?:cr|c|lac)?)\b/i);
    if (priceMatch) {
      askingPricePkr = parsePriceToPkr(priceMatch[1]);
    }

    if (askingPricePkr === 0) {
      askingPricePkr = 4500000; // fallback 45 Lac
    }

    const created = await prisma.currentStock.create({
      data: {
        vehicle: vehicleName || 'Showroom Vehicle',
        model: yearStr || '2024',
        year: modelYear,
        color: colorVal,
        mileage: mileageVal,
        askingPrice: askingPricePkr,
        purchasePrice: Math.round(askingPricePkr * 0.92),
        status: 'AVAILABLE',
        location: 'Main Showroom Floor',
        careOf: careOf,
        regNumber: regNumber,
        notes: null
      }
    });

    createdItems.push(created);
    console.log(`[${createdItems.length}] Added: ${created.vehicle} (${created.model}) - Rs. ${created.askingPrice.toLocaleString()} - Care Of: ${created.careOf} - Reg: ${created.regNumber}`);
  }

  console.log(`\n🎉 SUCCESSFULLY IMPORTED ${createdItems.length} SHOWROOM STOCK VEHICLES TO DATABASE!`);
}

importStockPdf().finally(() => prisma.$disconnect());
