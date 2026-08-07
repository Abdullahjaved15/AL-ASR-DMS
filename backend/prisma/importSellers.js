const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { PDFParse } = require('pdf-parse');
require('dotenv').config();

const prisma = new PrismaClient();

const pdfPath = 'C:\\Users\\cc\\Desktop\\AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf';

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

function parseRegistrationDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

function extractPhoneAndName(contactStr, fallbackSr) {
  if (!contactStr || contactStr.trim() === '-' || contactStr.trim() === 'Un-Known') {
    return { name: `Seller Lead #${fallbackSr}`, phone: '0300-0000000' };
  }
  const phoneMatch = contactStr.match(/(03\d{2}[-\s]?\d{7}|\d{10,11})/);
  const phone = phoneMatch ? phoneMatch[1] : '0300-0000000';
  let name = contactStr.replace(phoneMatch ? phoneMatch[0] : '', '').trim();
  if (!name || name.toLowerCase() === 'un-known') name = `Seller Lead #${fallbackSr}`;
  return { name, phone };
}

function mapLeadStatus(statusStr) {
  if (!statusStr) return 'Negotiation';
  const s = statusStr.trim().toLowerCase();
  if (s.includes('finished') || s.includes('closed') || s.includes('done') || s.includes('sold')) return 'Deal Closed';
  if (s.includes('ongoing')) return 'Negotiation';
  if (s.includes('incomplete')) return 'Incomplete';
  if (s.includes('contacted')) return 'Contacted';
  if (s.includes('follow')) return 'Follow Up';
  if (s.includes('interested')) return 'Interested';
  if (s.includes('lost')) return 'Lost';
  if (s.includes('cancel')) return 'Cancelled';
  return 'Negotiation';
}

async function main() {
  console.log('🚀 Starting Fast Bulk PDF Sellers Import Process...');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found at path: ${pdfPath}`);
    process.exit(1);
  }

  // Clear existing dummy/partially imported seller data
  console.log('🧹 Purging previous seller records...');
  await prisma.deal.deleteMany();
  await prisma.sellerImage.deleteMany();
  await prisma.seller.deleteMany();

  // Ensure Admin User
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

  // Common Salesmen Mapping
  const salesmenNames = [
    'Mr. Imran', 'Mr. Atif', 'Mr. Humam', 'Mr. Zubair', 
    'Mr. Shehroz', 'Mr. Umar', 'Mr. Ahmad Sajjad', 'Mr. Shaheer', 
    'Mr. Jahanzeb', 'Mr. Haroon', 'Mr. Taimoor', 'Mr. Shayan', 'Mr. Ahsan'
  ];

  const salesmanMap = {};
  const hashedPassword = await bcrypt.hash('Salesman123!', 10);

  for (const sName of salesmenNames) {
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

  const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');

  console.log(`📄 Read ${lines.length} lines from PDF document.`);

  const recordsToInsert = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const srMatch = line.match(/^(\d{1,4})[\t\s]+(\d{2}-\d{2}-\d{4})/);
    if (!srMatch) continue;

    const rowNum = srMatch[1];
    const regDateStr = srMatch[2];

    let parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);

    let vehicle = 'Toyota';
    let model = 'Car';
    let color = 'White';
    let mileage = 0;
    let demandPrice = 0;
    let sellerName = `Seller Lead #${rowNum}`;
    let sellerPhone = '0300-0000000';
    let sellerCity = 'Sahiwal';
    let leadSource = 'Personal Reference';
    let assignedSalesmanId = admin.id;
    let leadStatus = 'Negotiation';
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

      leadSource = parts[10] ? parts[10].trim() : (parts[9] ? parts[9].trim() : 'Personal Reference');

      const assignedCol = parts[11] ? parts[11].trim() : '';
      if (assignedCol && salesmanMap[assignedCol]) {
        assignedSalesmanId = salesmanMap[assignedCol];
      }

      const statusCol = parts[13] ? parts[13].trim() : '';
      leadStatus = mapLeadStatus(statusCol);
      comments = parts[14] ? parts[14].trim() : line;
    } else {
      const rest = line.substring(srMatch[0].length).trim();
      const priceMatch = rest.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:Lac|Lacs|Crore|Cror|Cror|Cr))/i);
      demandPrice = priceMatch ? parseDemandPrice(priceMatch[0]) : 0;

      const phoneMatch = rest.match(/(03\d{2}[-\s]?\d{7})/);
      sellerPhone = phoneMatch ? phoneMatch[1] : '0300-0000000';

      mileage = parseMileageCol(rest);
      leadStatus = mapLeadStatus(rest);
      model = rest.substring(0, 60);
    }

    const yearVal = parseYear(model, vehicle);

    recordsToInsert.push({
      createdBy: admin.id,
      registrationDate: parseRegistrationDate(regDateStr),
      vehicle: vehicle.substring(0, 50) || 'Toyota',
      model: model.substring(0, 100) || 'Vehicle',
      year: yearVal,
      color: color.substring(0, 30) || 'White',
      mileage: Math.min(mileage, 2000000),
      demandPrice,
      sellerName: sellerName.substring(0, 60),
      sellerPhone,
      sellerCity: sellerCity.substring(0, 50),
      leadSource: leadSource.substring(0, 50) || 'Personal Reference',
      assignedTo: assignedSalesmanId,
      leadStatus,
      comments: comments.substring(0, 250)
    });
  }

  console.log(`📦 Inserting ${recordsToInsert.length} records in bulk to database...`);
  const result = await prisma.seller.createMany({
    data: recordsToInsert
  });

  console.log(`\n🎉 SELLER DATA IMPORT COMPLETED SUCCESSFULLY!`);
  console.log(`✅ Total Sellers Successfully Inserted: ${result.count}`);
}

main()
  .catch((e) => {
    console.error('Import error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
