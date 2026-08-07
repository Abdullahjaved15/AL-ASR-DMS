const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function smartParseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'un-assigned') return null;
  const parts = dateStr.split(/[-/.]/).map(p => p.trim());
  if (parts.length !== 3) return null;

  let p1 = parseInt(parts[0], 10);
  let p2 = parseInt(parts[1], 10);
  let p3 = parseInt(parts[2], 10);

  if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;

  let year, month, day;

  if (p1 > 1000) {
    year = p1;
    if (p2 > 12) { day = p2; month = p3; }
    else { month = p2; day = p3; }
  } else if (p3 > 1000) {
    year = p3;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      // Default DD-MM-YYYY in Pakistani dealership sheets
      day = p1;
      month = p2;
    }
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

async function processDailyPdfsOnly() {
  console.log('====================================================');
  console.log('READING EXCLUSIVELY DAILY SELLER & DAILY BUYER PDFS');
  console.log('====================================================');

  // 1. Process Daily Seller PDF
  const sellerPdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf');
  if (fs.existsSync(sellerPdfPath)) {
    console.log('\n📄 Extracting dates from: Daily Seller PDF...');
    const fileBuf = new Uint8Array(fs.readFileSync(sellerPdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    const sellerDb = await prisma.seller.findMany({ select: { id: true, sellerPhone: true, vehicle: true, comments: true } });
    const sellerUpdates = [];
    let matchedSellers = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split('\t').map(p => p.trim());

      if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
        const rawRegDate = parts[1];
        const parsedDate = smartParseDate(rawRegDate);

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          // Find matching seller in DB by phone or vehicle or comments
          const phonePart = parts.find(p => /03\d{2}[-\s]?\d{7}/.test(p)) || '';
          const cleanPhone = phonePart.replace(/[^\d]/g, '');

          let match = null;
          if (cleanPhone.length >= 10) {
            match = sellerDb.find(s => s.sellerPhone && s.sellerPhone.replace(/[^\d]/g, '').includes(cleanPhone.slice(-10)));
          }

          if (!match && parts[2] && parts[2] !== '-') {
            const veh = parts[2].toLowerCase();
            match = sellerDb.find(s => s.vehicle && s.vehicle.toLowerCase().includes(veh));
          }

          if (!match) {
            match = sellerDb.find(s => s.comments && s.comments.includes(trimmed.substring(0, 30)));
          }

          if (match) {
            matchedSellers++;
            sellerUpdates.push(
              prisma.seller.update({
                where: { id: match.id },
                data: { createdAt: parsedDate }
              })
            );
          }
        }
      }
    }

    console.log(`Matched and prepared ${sellerUpdates.length} daily seller date updates...`);
    if (sellerUpdates.length > 0) {
      await prisma.$transaction(sellerUpdates);
    }
    console.log(`✅ Daily Seller PDF dates applied to ${matchedSellers} records!`);
  }

  // 2. Process Daily Buyer PDF
  const buyerPdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf');
  if (fs.existsSync(buyerPdfPath)) {
    console.log('\n📄 Extracting dates from: Daily Buyer PDF...');
    const fileBuf = new Uint8Array(fs.readFileSync(buyerPdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    const buyerDb = await prisma.buyer.findMany({ select: { id: true, buyerPhone: true, vehicle: true, comments: true } });
    const buyerUpdates = [];
    let matchedBuyers = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split('\t').map(p => p.trim());

      if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
        const rawRegDate = parts[1];
        const parsedDate = smartParseDate(rawRegDate);

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const phonePart = parts.find(p => /03\d{2}[-\s]?\d{7}/.test(p)) || '';
          const cleanPhone = phonePart.replace(/[^\d]/g, '');

          let match = null;
          if (cleanPhone.length >= 10) {
            match = buyerDb.find(b => b.buyerPhone && b.buyerPhone.replace(/[^\d]/g, '').includes(cleanPhone.slice(-10)));
          }

          if (!match && parts[2] && parts[2] !== '-') {
            const veh = parts[2].toLowerCase();
            match = buyerDb.find(b => b.vehicle && b.vehicle.toLowerCase().includes(veh));
          }

          if (!match) {
            match = buyerDb.find(b => b.comments && b.comments.includes(trimmed.substring(0, 30)));
          }

          if (match) {
            matchedBuyers++;
            buyerUpdates.push(
              prisma.buyer.update({
                where: { id: match.id },
                data: { createdAt: parsedDate }
              })
            );
          }
        }
      }
    }

    console.log(`Matched and prepared ${buyerUpdates.length} daily buyer date updates...`);
    if (buyerUpdates.length > 0) {
      await prisma.$transaction(buyerUpdates);
    }
    console.log(`✅ Daily Buyer PDF dates applied to ${matchedBuyers} records!`);
  }

  console.log('\n🎉 ALL DAILY SELLER & DAILY BUYER LEAD DATES UPDATED SUCCESSFULLY!');
}

processDailyPdfsOnly().finally(() => prisma.$disconnect());
