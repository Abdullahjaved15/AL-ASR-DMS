const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const pdfFiles = {
  mainBuyer: path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf'),
  dailyBuyer: path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf'),
  mainSeller: path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf'),
  dailySeller: path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf')
};

// Helper to parse price strings like "45 Lac", "1 Crore 10 Lac", "40-41.5 Lac", etc.
function parseDemandPrice(priceStr) {
  if (!priceStr) return 0;
  let str = priceStr.trim().toLowerCase();
  if (str.includes('un-known') || str.includes('applied for') || str === 'any' || str.includes('cash') || str.includes('lease')) return 0;
  
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
  if (str.includes('closed') || str.includes('sold') || str.includes('done') || str.includes('finished')) return 'Deal Closed';
  if (str.includes('follow') || str.includes('pending') || str.includes('call')) return 'Follow Up';
  if (str.includes('contacted') || str.includes('talked')) return 'Contacted';
  if (str.includes('interested')) return 'Interested';
  if (str.includes('negotiat') || str.includes('ongoing') || str.includes('token')) return 'Negotiation';
  if (str.includes('lost') || str.includes('drop') || str.includes('cancel')) return 'Lost';
  if (str.includes('incomplete')) return 'Incomplete';
  return 'New Lead';
}

const { formatPakistaniPhone } = require('../src/utils/phoneFormatter');

function extractPhoneAndName(contactStr, fallbackId, type = 'Lead') {
  if (!contactStr || contactStr.trim() === '-' || contactStr.trim() === 'Un-Known') {
    return { name: `${type} #${fallbackId}`, phone: '03000000000' };
  }
  const phoneMatch = contactStr.match(/(?:\+?92[-\s]?|0)(3\d{2})[-\s]?(\d{7})|\b(03\d{9}|3\d{9})\b/);
  const rawPhone = phoneMatch ? phoneMatch[0] : '';
  const phone = formatPakistaniPhone(rawPhone);
  let name = contactStr.replace(phoneMatch ? phoneMatch[0] : '', '').replace(/[^\w\s.]/gi, '').trim();
  if (!name || name.length < 2 || name.toLowerCase() === 'un-known') {
    name = `${type} #${fallbackId}`;
  }
  return { name, phone };
}

function normalizeSalesmanName(rawName) {
  if (!rawName) return null;
  let str = rawName.trim();

  // Strip anything after tab or newline
  str = str.replace(/[\t\r\n].*$/, '');

  // Strip common trailing keywords/suffixes
  str = str.replace(/\s+(Personal|Branch|Social|Whatsapp|Official|Pics|MISSING|Walk-In|Reference|Inquiry|via|on|about|for|regarding|and|but|in|by|via|Replied).*$/i, '');
  str = str.trim();

  // Female sales staff (Ma'am, Ms., Miss, Mrs.)
  const maamMatch = str.match(/^(Ma'?am|Mam|Madam|Ms\.?|Miss|Mrs\.?)\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (maamMatch) {
    const title = maamMatch[1].toLowerCase().includes('ms') ? 'Ms.' : 'Ma\'am';
    const nameStr = maamMatch[2].charAt(0).toUpperCase() + maamMatch[2].slice(1);
    if (/^maria$/i.test(nameStr)) return 'Ma\'am Maria';
    if (/^sidra$/i.test(nameStr)) return 'Ma\'am Sidra';
    if (/^unaiza$/i.test(nameStr)) return 'Ma\'am Unaiza';
    return `${title} ${nameStr}`;
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
  
  // Check column locations
  for (let idx of [10, 12, 11, 13, 9, 8, 7, 14, 15]) {
    if (parts[idx]) {
      const norm = normalizeSalesmanName(parts[idx]);
      if (norm) return norm;
    }
  }

  for (const p of parts) {
    const norm = normalizeSalesmanName(p);
    if (norm) return norm;
  }

  const match = line.match(/((?:Mr\.|Ma'?am|Mam|Madam|Ms\.|Miss|Mrs\.)\s*[A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (match) {
    return normalizeSalesmanName(match[1]);
  }

  return null;
}

async function getOrCreateAllSalesmen(adminId) {
  const salesmanMap = {};
  const defaultPassword = await bcrypt.hash('Salesman123!', 10);

  const defaultList = [
    'Mr. Imran', 'Mr. Atif', 'Mr. Humam', 'Mr. Zubair', 
    'Mr. Shehroz', 'Mr. Umar', 'Mr. Ahmad Sajjad', 'Mr. Shaheer', 
    'Mr. Jahanzeb', 'Mr. Haroon', 'Mr. Taimoor', 'Mr. Shayan', 'Mr. Ahsan',
    'Mr. Mudassar', 'Mr. Rehan', 'Mr. Nadeem', 'Mr. Hamid', 'Mr. Mubashir',
    'Mr. Abdullah', 'Mr. Mohsin', 'Mr. Umair', 'Mr. Shahzaib', 'Mr. Ali',
    'Mr. Amir', 'Mr. Ahmad Jameel', 'Mr. Ahmad', 'Mr. Azam',
    'Ma\'am Maria', 'Ma\'am Sidra', 'Ma\'am Unaiza'
  ];

  for (const name of defaultList) {
    const cleanName = name.replace(/^(Mr\.|Ma'am|Ms\.)\s*/i, '').trim();
    const email = `${cleanName.toLowerCase().replace(/\s+/g, '')}@dealership.com`;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { name: { equals: name } },
          { name: { equals: cleanName } }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone: '+92 300 0000000',
          password: defaultPassword,
          role: 'SALESMAN',
          status: 'ACTIVE'
        }
      });
      console.log(`✨ Created User Account: ${name} (${email})`);
    }

    salesmanMap[name] = user.id;
    salesmanMap[cleanName] = user.id;
    salesmanMap[cleanName.toUpperCase()] = user.id;
  }

  return { salesmanMap, adminId };
}

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
      break;
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

  // 3. Extract City (Must NOT be a phone number or salesman name)
  let city = 'Sahiwal';
  if (phoneColIndex !== -1 && parts[phoneColIndex + 1]) {
    const rawCity = parts[phoneColIndex + 1].trim();
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

async function parseBuyerPdf(filePath, adminId, salesmanMap) {
  if (!fs.existsSync(filePath)) return [];

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
      leadStatus = mapLeadStatus(parts[12] || line);
    } else {
      const priceMatch = line.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:Lac|Lacs|Crore|Cror|Cr))/i);
      budget = priceMatch ? parseDemandPrice(priceMatch[0]) : 0;
      leadStatus = mapLeadStatus(line);
      model = line.substring(0, 60);
    }

    const { name: buyerName, phone: buyerPhone, city: buyerCity } = parseRowSmart(line, rowNum, 'Buyer');

    const salesmanName = extractSalesmanFromLine(line);
    if (salesmanName && salesmanMap[salesmanName]) {
      assignedSalesmanId = salesmanMap[salesmanName];
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
  if (!fs.existsSync(filePath)) return [];

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
      leadStatus = mapLeadStatus(parts[13] || line);
    } else {
      const priceMatch = line.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:Lac|Lacs|Crore|Cror|Cr))/i);
      demandPrice = priceMatch ? parseDemandPrice(priceMatch[0]) : 0;
      leadStatus = mapLeadStatus(line);
      model = line.substring(0, 60);
    }

    const { name: sellerName, phone: sellerPhone, city: sellerCity } = parseRowSmart(line, rowNum, 'Seller');

    const salesmanName = extractSalesmanFromLine(line);
    if (salesmanName && salesmanMap[salesmanName]) {
      assignedSalesmanId = salesmanMap[salesmanName];
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

async function main() {
  console.log('🚀 STARTING COMPREHENSIVE RE-IMPORT & LEAD ASSIGNMENT (PDF -> DB)...');

  // 1. Ensure Admin Account
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

  // 2. Ensure all male and female sales accounts exist
  const { salesmanMap } = await getOrCreateAllSalesmen(admin.id);

  // 3. Clear existing buyer and seller records to avoid duplicates
  console.log('🧹 Purging existing Buyer and Seller lead records...');
  await prisma.deal.deleteMany();
  await prisma.collaboration.deleteMany();
  await prisma.sellerImage.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.seller.deleteMany();

  // 4. Parse PDFs
  console.log('📖 Parsing Main Buyer PDF...');
  const mainBuyerRecords = await parseBuyerPdf(pdfFiles.mainBuyer, admin.id, salesmanMap);
  console.log(`Parsed ${mainBuyerRecords.length} records from Main Buyer PDF.`);

  console.log('📖 Parsing Daily Buyer PDF...');
  const dailyBuyerRecords = await parseBuyerPdf(pdfFiles.dailyBuyer, admin.id, salesmanMap);
  console.log(`Parsed ${dailyBuyerRecords.length} records from Daily Buyer PDF.`);

  console.log('📖 Parsing Main Seller PDF...');
  const mainSellerRecords = await parseSellerPdf(pdfFiles.mainSeller, admin.id, salesmanMap);
  console.log(`Parsed ${mainSellerRecords.length} records from Main Seller PDF.`);

  console.log('📖 Parsing Daily Seller PDF...');
  const dailySellerRecords = await parseSellerPdf(pdfFiles.dailySeller, admin.id, salesmanMap);
  console.log(`Parsed ${dailySellerRecords.length} records from Daily Seller PDF.`);

  // 5. Bulk insert clean records
  const allBuyerRecords = [...mainBuyerRecords, ...dailyBuyerRecords];
  if (allBuyerRecords.length > 0) {
    await prisma.buyer.createMany({ data: allBuyerRecords });
    console.log(`✅ Bulk inserted ${allBuyerRecords.length} Buyer records into DB.`);
  }

  const allSellerRecords = [...mainSellerRecords, ...dailySellerRecords];
  if (allSellerRecords.length > 0) {
    await prisma.seller.createMany({ data: allSellerRecords });
    console.log(`✅ Bulk inserted ${allSellerRecords.length} Seller records into DB.`);
  }

  console.log('\n🎉 ALL LEAD RE-IMPORTS & SALES STAFF ASSIGNMENTS COMPLETED SUCCESSFULLY!');
}

main()
  .catch((err) => {
    console.error('❌ Error during import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
