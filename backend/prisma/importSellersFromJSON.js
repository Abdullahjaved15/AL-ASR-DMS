const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting re-import of sellers with Registration Dates from Excel data...');

  const jsonPath = path.join(__dirname, 'sellers_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('sellers_data.json file not found!');
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const sellersList = JSON.parse(rawData);
  console.log(`📦 Loaded ${sellersList.length} seller records from JSON.`);

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
  const uniqueNames = new Set(sellersList.map(s => s.assignedToName).filter(Boolean));

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

  // Clear previous Excel Import seller records so we can update them with exact registration dates cleanly
  console.log('🧹 Clearing previous Excel import records to re-apply registration dates...');
  await prisma.seller.deleteMany({
    where: { leadSource: 'Excel Import' }
  });

  const prepareData = sellersList.map(s => {
    const rDate = s.registrationDate ? new Date(s.registrationDate) : new Date();
    return {
      createdBy: adminId,
      registrationDate: rDate,
      createdAt: rDate,
      vehicle: s.vehicle || 'Unknown Vehicle',
      model: s.model || '',
      year: s.year || String(new Date().getFullYear()),
      color: s.color || 'White',
      mileage: parseInt(s.mileage) || 0,
      demandPrice: parseFloat(s.demandPrice) || 0,
      carCondition: s.carCondition || 'Used',
      zeroMeterType: s.zeroMeterType || null,
      sellerName: s.sellerName || 'Seller Lead',
      sellerPhone: s.sellerPhone || '0300-0000000',
      sellerCity: s.sellerCity || 'Sahiwal',
      leadSource: s.leadSource || 'Excel Import',
      leadReference: s.leadReference || null,
      leadReferredBy: s.leadReferredBy || null,
      assignedTo: resolveSalesmanId(s.assignedToName),
      leadStatus: s.leadStatus || 'New Lead',
      comments: s.comments || null
    };
  });

  // Perform bulk insert in chunks of 200
  const chunkSize = 200;
  let totalInserted = 0;

  for (let i = 0; i < prepareData.length; i += chunkSize) {
    const chunk = prepareData.slice(i, i + chunkSize);
    const result = await prisma.seller.createMany({
      data: chunk,
      skipDuplicates: true
    });
    totalInserted += result.count;
    console.log(`⚡ Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(prepareData.length / chunkSize)} (${result.count} records)`);
  }

  console.log(`\n🎉 RE-IMPORT WITH REGISTRATION DATES COMPLETED!`);
  console.log(` Total Sellers Inserted into PostgreSQL: ${totalInserted}`);
}

main()
  .catch((e) => {
    console.error('Fatal import error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
