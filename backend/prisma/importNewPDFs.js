const { PrismaClient } = require('@prisma/client');
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const mainBuyerPdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf');
const dailyBuyerPdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf');
const dailySellerPdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf');

function parseDemandPrice(priceStr) {
  if (!priceStr) return 0;
  let str = priceStr.trim().toLowerCase();
  if (str.includes('un-known') || str.includes('applied for') || str === 'any') return 0;
  
  if (str.includes('-')) {
    const parts = str.split('-');
    const val = parseDemandPrice(parts[0]);
    if (val > 0) return val;
  }
  
  const croreMatch = str.match(/([\d.]+)\s*(?:crore|cror|cr)/i);
  const lacMatch = str.match(/([\d.]+)\s*(?:lac|lacs|l)/i);
  
  let total = 0;
  if (croreMatch) {
    total += parseFloat(croreMatch[1]) * 10000000;
  }
  if (lacMatch) {
    total += parseFloat(lacMatch[1]) * 100000;
  } else if (!croreMatch && !lacMatch) {
    const numStr = str.replace(/[^\d.]/g, '');
    const val = parseFloat(numStr);
    if (!isNaN(val)) {
      if (val < 500) total = val * 100000;
      else total = val;
    }
  }
  return total;
}

function parseYear(modelStr, vehicleStr) {
  const text = (modelStr || '') + ' ' + (vehicleStr || '');
  const match = text.match(/(20\d\d|19\d\d)/);
  if (match) return parseInt(match[1]);
  return new Date().getFullYear();
}

function parseMileageCol(colVal) {
  if (!colVal) return 0;
  let str = colVal.trim().toLowerCase();
  if (str.includes('un-known') || str.includes('applied') || str.includes('any') || str.includes('-')) return 0;
  if (str.endsWith('k')) {
    const kVal = parseFloat(str.replace('k', ''));
    if (!isNaN(kVal)) return Math.round(kVal * 1000);
  }
  const num = parseInt(str.replace(/[^\d]/g, ''), 10);
  if (isNaN(num) || num > 2000000) return 0;
  return num;
}

function mapLeadStatus(colVal) {
  if (!colVal) return 'New Lead';
  let str = colVal.trim().toLowerCase();
  if (str.includes('closed') || str.includes('sold') || str.includes('done')) return 'Deal Closed';
  if (str.includes('follow') || str.includes('pending') || str.includes('call')) return 'Follow Up';
  if (str.includes('contacted') || str.includes('talked')) return 'Contacted';
  if (str.includes('interested')) return 'Interested';
  if (str.includes('negotiat') || str.includes('token')) return 'Negotiation';
  if (str.includes('lost') || str.includes('drop') || str.includes('cancel')) return 'Lost';
  return 'New Lead';
}

function extractPhoneAndName(contactStr, fallbackId) {
  if (!contactStr) return { name: `Contact #${fallbackId}`, phone: '0300-0000000' };
  const phoneMatch = contactStr.match(/(03\d{2}[-\s]?\d{7})/);
  const phone = phoneMatch ? phoneMatch[1] : '0300-0000000';
  let name = contactStr.replace(/(03\d{2}[-\s]?\d{7})/, '').replace(/[^\w\s.]/gi, '').trim();
  if (!name || name.length < 2) name = `Client #${fallbackId}`;
  return { name, phone };
}

async function getOrCreateSalesmenMap(adminId) {
  const defaultSalesmen = [
    'Mr. Imran', 'Mr. Atif', 'Mr. Humam', 'Mr. Zubair', 
    'Mr. Shehroz', 'Mr. Umar', 'Mr. Ahmad Sajjad', 'Mr. Shaheer', 
    'Mr. Jahanzeb', 'Mr. Haroon', 'Mr. Taimoor', 'Mr. Shayan', 'Mr. Ahsan'
  ];

  const salesmanMap = {};
  const hashedPassword = await bcrypt.hash('Salesman123!', 10);

  for (const sName of defaultSalesmen) {
    const cleanName = sName.replace('Mr. ', '').trim();
    const email = `${cleanName.toLowerCase().replace(/\s+/g, '')}@dealership.com`;
    
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: sName,
          email,
          phone: '+92 300 0000000',
          password: hashedPassword,
          role: 'SALESMAN',
          status: 'ACTIVE'
        }
      });
    }
    salesmanMap[sName] = user.id;
    salesmanMap[cleanName] = user.id;
    salesmanMap[cleanName.toUpperCase()] = user.id;
  }
  return salesmanMap;
}

async function parseBuyerPdf(filePath, adminId, salesmanMap) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return [];
  }

  const fileBuf = new Uint8Array(fs.readFileSync(filePath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
    if (!srMatch) continue;

    const rowNum = srMatch[1];
    let parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);

    let vehicle = 'Toyota';
    let model = 'Required Vehicle';
    let color = 'Any';
    let mileage = 0;
    let budget = 0;
    let buyerName = `Buyer Lead #${rowNum}`;
    let buyerPhone = '0300-0000000';
    let buyerCity = 'Sahiwal';
    let leadSource = 'Direct Inquiry';
    let assignedSalesmanId = adminId;
    let leadStatus = 'New Lead';
    let comments = line;

    if (parts.length >= 6) {
      vehicle = parts[2] ? parts[2].trim() : 'Toyota';
      const modelCol = parts[3] ? parts[3].trim() : '';
      model = (vehicle + ' ' + modelCol).trim();
      color = parts[4] ? parts[4].trim() : 'Any';
      budget = parseDemandPrice(parts[5] || parts[6]);

      const contactCol = parts[6] || parts[7] || '';
      const contactObj = extractPhoneAndName(contactCol, rowNum);
      buyerName = contactObj.name;
      buyerPhone = contactObj.phone;

      buyerCity = parts[8] ? parts[8].trim() : 'Sahiwal';
      if (!buyerCity || buyerCity === '-') buyerCity = 'Sahiwal';

      const assignedCol = parts[10] || parts[11] || '';
      if (assignedCol && salesmanMap[assignedCol]) {
        assignedSalesmanId = salesmanMap[assignedCol];
      }

      leadStatus = mapLeadStatus(parts[12] || line);
    } else {
      const priceMatch = line.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:Lac|Lacs|Crore|Cror|Cr))/i);
      budget = priceMatch ? parseDemandPrice(priceMatch[0]) : 0;

      const phoneMatch = line.match(/(03\d{2}[-\s]?\d{7})/);
      buyerPhone = phoneMatch ? phoneMatch[1] : '0300-0000000';
      leadStatus = mapLeadStatus(line);
      model = line.substring(0, 60);
    }

    records.push({
      createdBy: adminId,
      vehicle: vehicle.substring(0, 50) || 'Toyota',
      model: model.substring(0, 100) || 'Required Vehicle',
      year: parseYear(model, vehicle),
      color: color.substring(0, 30) || 'Any',
      mileage: Math.min(mileage, 2000000),
      budget,
      buyerName: buyerName.substring(0, 60),
      buyerPhone,
      buyerCity: buyerCity.substring(0, 50),
      leadSource: leadSource.substring(0, 50),
      assignedTo: assignedSalesmanId,
      leadStatus,
      comments: comments.substring(0, 250)
    });
  }

  return records;
}

async function parseSellerPdf(filePath, adminId, salesmanMap) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return [];
  }

  const fileBuf = new Uint8Array(fs.readFileSync(filePath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
    if (!srMatch) continue;

    const rowNum = srMatch[1];
    let parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);

    let vehicle = 'Toyota';
    let model = 'Vehicle';
    let color = 'White';
    let mileage = 0;
    let demandPrice = 0;
    let sellerName = `Seller Lead #${rowNum}`;
    let sellerPhone = '0300-0000000';
    let sellerCity = 'Sahiwal';
    let leadSource = 'Daily Seller Import';
    let assignedSalesmanId = adminId;
    let leadStatus = 'New Lead';
    let comments = line;

    if (parts.length >= 7) {
      vehicle = parts[2] ? parts[2].trim() : 'Toyota';
      const modelYearCol = parts[3] ? parts[3].trim() : '';
      model = (vehicle + ' ' + modelYearCol).trim();
      color = parts[4] ? parts[4].trim() : 'White';
      mileage = parseMileageCol(parts[5]);
      demandPrice = parseDemandPrice(parts[6]);

      const contactCol = parts[7] ? parts[7].trim() : '';
      const contactObj = extractPhoneAndName(contactCol, rowNum);
      sellerName = contactObj.name;
      sellerPhone = contactObj.phone;

      sellerCity = parts[8] ? parts[8].trim() : 'Sahiwal';
      if (!sellerCity || sellerCity === '-') sellerCity = 'Sahiwal';

      const assignedCol = parts[11] ? parts[11].trim() : '';
      if (assignedCol && salesmanMap[assignedCol]) {
        assignedSalesmanId = salesmanMap[assignedCol];
      }

      leadStatus = mapLeadStatus(parts[13] || line);
    } else {
      const priceMatch = line.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:Lac|Lacs|Crore|Cror|Cr))/i);
      demandPrice = priceMatch ? parseDemandPrice(priceMatch[0]) : 0;

      const phoneMatch = line.match(/(03\d{2}[-\s]?\d{7})/);
      sellerPhone = phoneMatch ? phoneMatch[1] : '0300-0000000';
      leadStatus = mapLeadStatus(line);
      model = line.substring(0, 60);
    }

    records.push({
      createdBy: adminId,
      vehicle: vehicle.substring(0, 50) || 'Toyota',
      model: model.substring(0, 100) || 'Vehicle',
      year: parseYear(model, vehicle),
      color: color.substring(0, 30) || 'White',
      mileage: Math.min(mileage, 2000000),
      demandPrice,
      sellerName: sellerName.substring(0, 60),
      sellerPhone,
      sellerCity: sellerCity.substring(0, 50),
      leadSource: leadSource.substring(0, 50),
      assignedTo: assignedSalesmanId,
      leadStatus,
      comments: comments.substring(0, 250)
    });
  }

  return records;
}

async function runImport() {
  console.log('🚀 Starting New PDF Imports (Main Buyer, Daily Buyer, Daily Seller)...');

  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    admin = await prisma.user.create({
      data: {
        name: 'AL ASR Administrator',
        email: 'admin@dealership.com',
        phone: '+92 300 1234567',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
  }

  const salesmanMap = await getOrCreateSalesmenMap(admin.id);

  console.log('📖 Parsing Main Buyer PDF...');
  const mainBuyerRecords = await parseBuyerPdf(mainBuyerPdfPath, admin.id, salesmanMap);
  console.log(`Parsed ${mainBuyerRecords.length} records from Main Buyer PDF.`);

  console.log('📖 Parsing Daily Buyer PDF...');
  const dailyBuyerRecords = await parseBuyerPdf(dailyBuyerPdfPath, admin.id, salesmanMap);
  console.log(`Parsed ${dailyBuyerRecords.length} records from Daily Buyer PDF.`);

  console.log('📖 Parsing Daily Seller PDF...');
  const dailySellerRecords = await parseSellerPdf(dailySellerPdfPath, admin.id, salesmanMap);
  console.log(`Parsed ${dailySellerRecords.length} records from Daily Seller PDF.`);

  if (mainBuyerRecords.length > 0) {
    await prisma.buyer.createMany({ data: mainBuyerRecords });
    console.log(`✅ Bulk inserted ${mainBuyerRecords.length} Main Buyer records.`);
  }

  if (dailyBuyerRecords.length > 0) {
    await prisma.buyer.createMany({ data: dailyBuyerRecords });
    console.log(`✅ Bulk inserted ${dailyBuyerRecords.length} Daily Buyer records.`);
  }

  if (dailySellerRecords.length > 0) {
    await prisma.seller.createMany({ data: dailySellerRecords });
    console.log(`✅ Bulk inserted ${dailySellerRecords.length} Daily Seller records.`);
  }

  console.log('🎉 ALL PDF IMPORTS COMPLETED SUCCESSFULLY!');
}

runImport().catch(console.error).finally(() => prisma.$disconnect());
