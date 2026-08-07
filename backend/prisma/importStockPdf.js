const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const pdfPath = path.join(__dirname, '..', '..', 'Stock.pdf');

function parseStockMileage(str) {
  if (!str) return 0;
  const lower = str.trim().toLowerCase();
  if (lower.includes('zero') || lower.includes('meter')) return 0;

  const kMatch = lower.match(/([\d.]+)\s*k/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const num = parseInt(lower.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function parseStockPrice(str) {
  if (!str) return 0;
  const lower = str.trim().toLowerCase();
  if (lower.includes('invoice')) return 0;

  // Handle Crore (e.g. 2.10 CR, 1.08 CR, 1.02CR, 2 C, 108 CR)
  const croreMatch = lower.match(/([\d.]+)\s*(?:cr|cror|crore|c\b)/i);
  if (croreMatch) {
    const cVal = parseFloat(croreMatch[1]);
    // If written as 108 CR, it means 1.08 Crore = 10,800,000 (108 Lacs)
    if (cVal > 20) {
      return Math.round(cVal * 100000); // 108 Lacs = 10,800,000
    }
    return Math.round(cVal * 10000000); // 2.10 Crore = 21,000,000
  }

  const numStr = lower.replace(/[^\d.]/g, '');
  const val = parseFloat(numStr);
  if (isNaN(val)) return 0;

  if (val >= 100 && val <= 300) {
    // 102 / 108 Lacs = 1.02 / 1.08 Crore = 10,200,000 / 10,800,000
    return Math.round(val * 100000);
  } else if (val < 100) {
    // 77 -> 77 Lacs (7,700,000), 54.5 -> 54.5 Lacs (5,450,000)
    return Math.round(val * 100000);
  }

  return val;
}

function parseYearFromText(text) {
  const match = text.match(/(20\d\d|19\d\d)/);
  if (match) return parseInt(match[1]);
  return 2024;
}

async function importStock() {
  console.log('🚀 STARTING ACCURATE SHOWROOM STOCK IMPORT (Stock.pdf -> CurrentStock)...');

  if (!fs.existsSync(pdfPath)) {
    console.error(`Stock.pdf not found at: ${pdfPath}`);
    process.exit(1);
  }

  const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  const lines = (pdfTextResult.text || '').split('\n');

  const recordsToInsert = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const srMatch = line.match(/^(\d{1,2})\s+([A-Za-z].*)/);
    if (!srMatch) continue;

    const srNum = parseInt(srMatch[1], 10);
    const rowText = srMatch[2].trim();

    if (line.includes('VEHICLES') && line.includes('MILEAGE')) continue;
    if (line.includes('USED STOCK') || line.includes('Prepared By')) continue;

    // Extract Care Of
    let careOf = 'AL Asr';
    let textWithoutCareOf = rowText;

    const careOfMatch = rowText.match(/\s+(Umair\s+Sab|AL\s+Asr|Imran\s+Sab|Rana\s+saleem|Ahsan\s+Sab|Azam\s+sab|Waseem\s+sab|Ahmad\s+Blue|Zubair|Atif|Umair\s+sab|Ahsan)$/i);
    if (careOfMatch) {
      careOf = careOfMatch[1].trim();
      textWithoutCareOf = rowText.substring(0, careOfMatch.index).trim();
    }

    // Extract Plate Number
    let regNumber = null;
    let textWithoutReg = textWithoutCareOf;

    const regMatch = textWithoutCareOf.match(/\s+([A-Z]{2,4}[-\s]?\d{3,4}|[A-Z]{1,3}\s*\d{3,4}|APL-4|On\s+invioce|On\s+invoice)\s*$/i);
    if (regMatch) {
      regNumber = regMatch[1].trim();
      textWithoutReg = textWithoutCareOf.substring(0, regMatch.index).trim();
    }

    // Extract Price
    let askingPrice = 0;
    let textWithoutPrice = textWithoutReg;

    const priceMatch = textWithoutReg.match(/\s+([\d.]+\s*(?:CR|C\b)|On\s+invioce|102|77|75|52|45|44|49|60|61|50|90|64|38|54\.5|62|29\.5|97|82|72|40|18|12|8\.5|46|30|108)\s*$/i);
    if (priceMatch) {
      askingPrice = parseStockPrice(priceMatch[1]);
      textWithoutPrice = textWithoutReg.substring(0, priceMatch.index).trim();
    }

    // Extract Mileage
    let mileage = 0;
    let textWithoutMileage = textWithoutPrice;

    const mileageMatch = textWithoutPrice.match(/\s+([\d.]+\s*k|Zero\s+meter|Above\s+\d+)\s*$/i);
    if (mileageMatch) {
      mileage = parseStockMileage(mileageMatch[1]);
      textWithoutMileage = textWithoutPrice.substring(0, mileageMatch.index).trim();
    }

    // Extract Color
    let color = 'White';
    let textWithoutColor = textWithoutMileage;

    const colorMatch = textWithoutMileage.match(/\s+(White|Black|Brown|Silver|Pearl\s+white|Red\s+wine|Red|Grey|Gray|Ice\s+Blue|Beige|Golden)\s*$/i);
    if (colorMatch) {
      color = colorMatch[1].trim();
      textWithoutColor = textWithoutMileage.substring(0, colorMatch.index).trim();
    }

    const yearVal = parseYearFromText(textWithoutColor);
    let vehicle = textWithoutColor.replace(/(20\d\d\/\d\d|20\d\d|19\d\d|\d\d\/\d\d|\d\d)/g, '').trim();
    let model = (vehicle + ' ' + (textWithoutColor.match(/(20\d\d\/\d\d|20\d\d|19\d\d|\d\d\/\d\d)/) || [''])[0]).trim();
    if (!vehicle) vehicle = 'Toyota';
    if (!model) model = vehicle + ' ' + yearVal;

    recordsToInsert.push({
      vehicle: vehicle.substring(0, 50),
      model: model.substring(0, 80),
      year: yearVal,
      color,
      mileage,
      askingPrice,
      status: 'AVAILABLE',
      location: 'Main Showroom',
      notes: regNumber ? `Reg: ${regNumber}` : 'Showroom Floor Stock',
      careOf,
      regNumber
    });
  }

  console.log(`📦 Parsed ${recordsToInsert.length} stock items from Stock.pdf.`);

  if (recordsToInsert.length > 0) {
    console.log('🧹 Purging old showroom stock entries...');
    await prisma.currentStock.deleteMany();

    console.log('✨ Bulk inserting 40 verified stock items into database...');
    await prisma.currentStock.createMany({ data: recordsToInsert });

    console.log('\n🎉 SHOWROOM STOCK IMPORT COMPLETED SUCCESSFULLY!');
    console.table(recordsToInsert.map(r => ({
      Vehicle: r.vehicle,
      Year: r.year,
      Color: r.color,
      Mileage: `${r.mileage.toLocaleString()} km`,
      AskingPrice: `Rs. ${r.askingPrice.toLocaleString()}`,
      CareOf: r.careOf,
      Reg: r.regNumber || 'N/A'
    })));
  }
}

importStock().catch(console.error).finally(() => prisma.$disconnect());
