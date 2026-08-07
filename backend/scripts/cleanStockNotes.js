const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanStockNotes() {
  console.log('Clearing "Imported from" text from CurrentStock notes in database...');
  const updated = await prisma.currentStock.updateMany({
    where: {
      notes: { contains: 'Imported from' }
    },
    data: {
      notes: null
    }
  });

  console.log(`✅ Cleared notes for ${updated.count} showroom stock items!`);
}

cleanStockNotes().finally(() => prisma.$disconnect());
