const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: { createdByUser: true, images: true }
  });

  console.log(`Total Invoice/Receipt records in DB: ${invoices.length}`);
  invoices.forEach((inv, idx) => {
    console.log(`${idx + 1}. ID: ${inv.id} | Invoice#: ${inv.invoiceNumber} | Category: ${inv.category} | CreatedBy: ${inv.createdByUser?.name || inv.createdBy}`);
  });
}

main().finally(() => prisma.$disconnect());
