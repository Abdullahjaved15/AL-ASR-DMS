const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting bulk import of cleaned Buyers data into PostgreSQL...');

  const jsonPath = path.join(__dirname, 'buyers_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('buyers_data.json file not found!');
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const buyersList = JSON.parse(rawData);
  console.log(`📦 Loaded ${buyersList.length} buyer records from JSON.`);

  // Find Admin account
  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'SUPER_ADMIN' },
        { role: 'ADMIN' }
      ]
    }
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }

  const adminId = adminUser.id;
  console.log(`👤 Primary Import Admin Account: ${adminUser.name} (${adminUser.email})`);

  // Build salesman lookup map
  const salesmen = await prisma.user.findMany();
  const salesmanMap = {};

  for (const u of salesmen) {
    salesmanMap[u.name.toLowerCase().trim()] = u.id;
    const cleanName = u.name.replace(/^(mr\.|ma'am|mrs\.|ms\.)\s+/i, '').toLowerCase().trim();
    salesmanMap[cleanName] = u.id;
  }

  const defaultPassword = await bcrypt.hash('Salesman123!', 10);

  // Pre-resolve all salesman IDs
  const uniqueNames = new Set(buyersList.map(b => b.assignedToName).filter(Boolean));

  for (const rawName of uniqueNames) {
    if (rawName.toLowerCase().includes('un-assigned') || rawName.toLowerCase() === 'unassigned') continue;
    
    const clean = rawName.replace(/^(mr\.|ma'am|mrs\.|ms\.)\s+/i, '').replace(/[\r\n].*$/, '').trim();
    const cleanLower = clean.toLowerCase();

    if (!salesmanMap[cleanLower] && !salesmanMap[rawName.toLowerCase().trim()]) {
      const emailName = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const email = `${emailName || 'salesman'}@dealership.com`;

      let newUser = await prisma.user.findUnique({ where: { email } });
      if (!newUser) {
        newUser = await prisma.user.create({
          data: {
            name: rawName.trim(),
            email,
            phone: '+92 300 0000000',
            password: defaultPassword,
            role: 'SALESMAN',
            status: 'ACTIVE'
          }
        });
        console.log(`✨ Created Salesman Account: ${newUser.name} (${email})`);
      }
      salesmanMap[cleanLower] = newUser.id;
      salesmanMap[rawName.toLowerCase().trim()] = newUser.id;
    }
  }

  function resolveSalesmanId(rawAssignedName) {
    if (!rawAssignedName || rawAssignedName.toLowerCase().includes('un-assigned') || rawAssignedName.toLowerCase() === 'unassigned') {
      return adminId;
    }
    const cleanLower = rawAssignedName.replace(/^(mr\.|ma'am|mrs\.|ms\.)\s+/i, '').replace(/[\r\n].*$/, '').trim().toLowerCase();
    return salesmanMap[cleanLower] || salesmanMap[rawAssignedName.toLowerCase().trim()] || adminId;
  }

  // Clear previous Excel Import buyer records so we replace them with clean, divided specs & dates
  console.log('🧹 Clearing previous Excel import buyer records...');
  await prisma.buyer.deleteMany({
    where: { leadSource: 'Excel Import' }
  });

  const prepareData = buyersList.map(b => {
    const rDate = b.registrationDate ? new Date(b.registrationDate) : new Date();
    return {
      createdBy: adminId,
      registrationDate: rDate,
      createdAt: rDate,
      vehicle: b.vehicle || 'Toyota',
      model: b.model || '',
      year: b.year || String(new Date().getFullYear()),
      color: b.color || 'Any',
      mileage: parseInt(b.mileage) || 0,
      budget: parseFloat(b.budget) || 0,
      carCondition: b.carCondition || 'Used',
      zeroMeterType: b.zeroMeterType || null,
      isBankCase: false,
      buyerName: b.buyerName || 'Buyer Lead',
      buyerPhone: b.buyerPhone || '0300-0000000',
      buyerCity: b.buyerCity || 'Sahiwal',
      leadSource: b.leadSource || 'Excel Import',
      leadReference: b.leadReference || null,
      leadReferredBy: b.leadReferredBy || null,
      assignedTo: resolveSalesmanId(b.assignedToName),
      leadStatus: b.leadStatus || 'New Lead',
      comments: b.comments || null
    };
  });

  // Perform bulk insert in chunks of 200
  const chunkSize = 200;
  let totalInserted = 0;

  for (let i = 0; i < prepareData.length; i += chunkSize) {
    const chunk = prepareData.slice(i, i + chunkSize);
    const result = await prisma.buyer.createMany({
      data: chunk,
      skipDuplicates: true
    });
    totalInserted += result.count;
    console.log(`⚡ Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(prepareData.length / chunkSize)} (${result.count} records)`);
  }

  console.log(`\n🎉 BULK BUYER IMPORT COMPLETED SUCCESSFULLY!`);
  console.log(` Total Cleaned Buyers Inserted into PostgreSQL: ${totalInserted}`);
}

main()
  .catch((e) => {
    console.error('Fatal import error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
