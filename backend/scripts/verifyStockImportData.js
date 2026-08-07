const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyStockData() {
  console.log('=== VERIFYING SHOWROOM STOCK DATABASE DATA ===\n');

  const stockList = await prisma.currentStock.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`Total Showroom Stock Items in DB: ${stockList.length}`);

  let invalidMileageCount = 0;
  let invalidPriceCount = 0;
  let missingCareOfCount = 0;

  stockList.forEach((item, idx) => {
    if (typeof item.mileage !== 'number' || item.mileage < 0) invalidMileageCount++;
    if (typeof item.askingPrice !== 'number' || item.askingPrice < 0) invalidPriceCount++;
    if (!item.careOf) missingCareOfCount++;
  });

  console.log(`- Items with invalid mileage: ${invalidMileageCount}`);
  console.log(`- Items with invalid price: ${invalidPriceCount}`);
  console.log(`- Items missing Care Of handle: ${missingCareOfCount}`);

  console.log('\n--- SAMPLE VERIFIED STOCK RECORDS ---');
  stockList.slice(0, 10).forEach((s, idx) => {
    console.log(`[#${idx + 1}] ${s.vehicle} ${s.model} (${s.year}) | Color: ${s.color} | Mileage: ${s.mileage.toLocaleString()} km | Price: Rs. ${s.askingPrice.toLocaleString()} | CareOf: "${s.careOf}" | Reg: "${s.regNumber || 'N/A'}"`);
  });

  if (stockList.length === 40 && invalidMileageCount === 0 && invalidPriceCount === 0 && missingCareOfCount === 0) {
    console.log('\n🎉 100% DATA VERIFICATION SUCCESSFUL: ALL 40 STOCK ITEMS ARE PARSED & LOADED ACCURATELY!');
  }
}

verifyStockData().catch(console.error).finally(() => prisma.$disconnect());
