const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const prisma = new PrismaClient();

const pdfFiles = [
  'AL ASR Motors_ Inventory Management Sheet - Main Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
  'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf',
  'Stock.pdf'
];

async function inspect() {
  console.log('=== DATABASE USERS ===');
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));

  const admin = users.find(u => u.role === 'ADMIN');
  const adminId = admin ? admin.id : null;

  console.log('\n=== DB BUYER COUNTS ===');
  const buyersTotal = await prisma.buyer.count();
  const buyersAssignedToAdmin = adminId ? await prisma.buyer.count({ where: { assignedTo: adminId } }) : 0;
  const buyersNull = await prisma.buyer.count({ where: { assignedTo: null } });
  console.log({ total: buyersTotal, assignedToAdmin: buyersAssignedToAdmin, nullAssigned: buyersNull });

  console.log('\n=== DB SELLER COUNTS ===');
  const sellersTotal = await prisma.seller.count();
  const sellersAssignedToAdmin = adminId ? await prisma.seller.count({ where: { assignedTo: adminId } }) : 0;
  const sellersNull = await prisma.seller.count({ where: { assignedTo: null } });
  console.log({ total: sellersTotal, assignedToAdmin: sellersAssignedToAdmin, nullAssigned: sellersNull });

  console.log('\n=== PARSING PDF SALESMEN NAMES ===');
  const allSalesmenInPdfs = new Set();
  const salesmenByPdf = {};

  for (const pdfName of pdfFiles) {
    const pdfPath = path.join(__dirname, '..', '..', pdfName);
    if (!fs.existsSync(pdfPath)) {
      console.log(`File missing: ${pdfPath}`);
      continue;
    }

    const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    const namesFound = new Set();
    lines.forEach(line => {
      // look for salesman column patterns or "Mr." or names in lines
      const mrMatches = line.match(/Mr\.\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/g);
      if (mrMatches) {
        mrMatches.forEach(m => {
          namesFound.add(m.trim());
          allSalesmenInPdfs.add(m.trim());
        });
      }
    });

    salesmenByPdf[pdfName] = Array.from(namesFound);
  }

  console.log('Salesmen per PDF:', salesmenByPdf);
  console.log('\nAll unique Salesmen in PDFs:', Array.from(allSalesmenInPdfs));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
