const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📄 Seeding official receipts and vouchers...');

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }
  });

  const createdById = admin?.id;

  const sampleInvoices = [
    {
      invoiceNumber: 'SR-20260813-0001',
      category: 'SALES_RECEIPT',
      registrationNo: 'LEC-22-9842',
      sellerName: 'Muhammad Tariq',
      sellerFatherName: 'Choudhry Tariq',
      sellerCnic: '35501-1234567-1',
      sellerPhone: '0300-1234567',
      sellerAddress: 'Farooqabad, Sahiwal',
      buyerName: 'Ali Raza',
      buyerFatherName: 'Raza Hussain',
      buyerCnic: '35501-7654321-3',
      buyerPhone: '0321-9876543',
      buyerAddress: 'Gulberg III, Lahore',
      vehicleMaker: 'Toyota',
      vehicleModel: 'Corolla Altis Grande 1.8',
      carYear: '2022',
      engineNumber: '2ZR-984210',
      chassisNumber: 'NZE170-49102',
      powerCapacity: '1800 CC',
      color: 'Super White',
      postOffice: 'Sahiwal Head PO',
      lastToken: '30-JUN-2026',
      totalPrice: 4500000,
      advanceAmount: 1000000,
      remainingAmount: 3500000,
      paymentDuration: '15 Days',
      dated: '2026-08-13'
    },
    {
      invoiceNumber: 'DL-20260813-0002',
      category: 'DELIVERY_LETTER',
      registrationNo: 'ICT-21-4102',
      sellerName: 'Faisal Abbas',
      sellerFatherName: 'Abbas Ali',
      sellerCnic: '35501-4455667-9',
      sellerPhone: '0312-4455667',
      sellerAddress: 'Scheme 3, Rawalpindi',
      buyerName: 'Kamran Khan',
      buyerFatherName: 'Subhan Khan',
      buyerCnic: '35501-9988776-5',
      buyerPhone: '0301-9988776',
      buyerAddress: 'F-8/2, Islamabad',
      vehicleMaker: 'Honda',
      vehicleModel: 'Civic Oriel 1.8 i-VTEC',
      carYear: '2021',
      engineNumber: 'R18Z1-440129',
      chassisNumber: 'FC1-889102',
      powerCapacity: '1800 CC',
      color: 'Crystal Black Pearl',
      postOffice: 'Islamabad GPO',
      lastToken: '30-JUN-2026',
      totalPrice: 5200000,
      advanceAmount: 5200000,
      remainingAmount: 0,
      paymentDuration: 'Full Cash Paid',
      dated: '2026-08-13',
      witness1Name: 'Subhan Ahmed',
      witness1Cnic: '35501-1112223-4',
      witness2Name: 'Bilal Hassan',
      witness2Cnic: '35501-3334445-6'
    },
    {
      invoiceNumber: 'PV-20260813-0003',
      category: 'PAYMENT_VOUCHER',
      payeeName: 'Media Team Vendor (Digital Marketing)',
      headOfAccount: 'Media Team Expenses',
      totalPrice: 150000,
      inWords: 'One Hundred Fifty Thousand Rupees Only',
      bankStatus: 'Cash',
      dated: '2026-08-13'
    }
  ];

  for (const inv of sampleInvoices) {
    const data = { ...inv };
    if (createdById) {
      data.createdByUser = { connect: { id: createdById } };
    }

    const existing = await prisma.invoice.findFirst({ where: { invoiceNumber: inv.invoiceNumber } });
    if (existing) {
      await prisma.invoice.update({ where: { id: existing.id }, data });
    } else {
      await prisma.invoice.create({ data });
    }
    console.log(`✅ Seeded receipt (${inv.category}): ${inv.invoiceNumber}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
