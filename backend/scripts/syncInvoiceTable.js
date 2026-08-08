const prisma = require('../src/config/db');

async function syncInvoiceTable() {
  console.log('🚀 Synchronizing Invoice table columns with Neon PostgreSQL database...');

  const alterStatements = [
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "registrationNo" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sellerName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sellerFatherName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sellerAddress" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sellerPhone" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "buyerFatherName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "buyerAddress" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "buyerPhone" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "vehicleMaker" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "engineNumber" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "chassisNumber" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "powerCapacity" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "postOffice" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lastToken" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "regName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "regFatherName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "regAddress" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "agreedAmount" DOUBLE PRECISION;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "agreedAmountHalf" DOUBLE PRECISION;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "agreedAmountWords" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "agreementTime" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "agreementDay" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "isImported" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "billOfEntryNo" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "portName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "clearanceDate" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "importerName" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "advanceAmount" DOUBLE PRECISION;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "remainingAmount" DOUBLE PRECISION;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentDuration" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dated" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "witness1Name" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "witness1Cnic" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "witness2Name" TEXT;`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "witness2Cnic" TEXT;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "customerName" DROP NOT NULL;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "carVehicle" DROP NOT NULL;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "carModel" DROP NOT NULL;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "carYear" DROP NOT NULL;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "saleAmount" DROP NOT NULL;`,
    `ALTER TABLE "Invoice" ALTER COLUMN "totalAmount" DROP NOT NULL;`
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✅ Executed:', sql.slice(0, 60) + '...');
    } catch (err) {
      console.warn('⚠️ Notice executing statement:', err.message);
    }
  }

  console.log('🎉 Invoice table columns synchronized successfully!');
  await prisma.$disconnect();
}

syncInvoiceTable();
