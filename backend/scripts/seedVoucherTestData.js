const prisma = require('../src/config/db');

async function seedVoucherTestData() {
  try {
    console.log('🔍 Locating Super Admin user to associate vouchers...');
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    }) || await prisma.user.findFirst();

    if (!adminUser) {
      console.error('❌ No user found in database. Run database setup first.');
      return;
    }

    console.log(`👤 Using user: ${adminUser.name || adminUser.email} (ID: ${adminUser.id})`);

    const vouchersToCreate = [
      // 1. Sales Receipt (سیل رسید)
      {
        invoiceNumber: `REC-20260808-7102`,
        category: 'SALES_RECEIPT',
        date: new Date(),
        dated: '2026-08-08',
        registrationNo: 'LEC-23-9988',
        sellerName: 'Chaudhry Muhammad Aslam',
        sellerFatherName: 'Abdul Rehman',
        sellerCnic: '35501-1234567-1',
        sellerPhone: '0300-4567891',
        sellerAddress: 'House #14, St 3, Model Town, Sahiwal',
        buyerName: 'Rana Tariq Mehmood',
        buyerFatherName: 'Rana Akhtar',
        buyerCnic: '35501-9876543-2',
        buyerPhone: '0302-8877665',
        buyerAddress: 'Farooq-e-Azam Road, Sahiwal',
        vehicleMaker: 'Toyota',
        vehicleModel: 'Fortuner Legender',
        carYear: '2023',
        color: 'Super White',
        engineNumber: '1GD-8472910',
        chassisNumber: 'NUN155-7039281',
        powerCapacity: '2800 CC',
        postOffice: 'Sahiwal Head Post Office',
        lastToken: 'Paid up to June 2026',
        regName: 'Chaudhry Muhammad Aslam',
        regFatherName: 'Abdul Rehman',
        regAddress: 'Model Town, Sahiwal',
        totalPrice: 17500000,
        advanceAmount: 2500000,
        remainingAmount: 15000000,
        paymentDuration: '15 Days / 15 دن',
        agreedAmount: 17500000,
        agreedAmountHalf: 8750000,
        agreedAmountWords: 'One Crore Seventy Five Lakh Rupees Only / ایک کروڑ پچھتر لاکھ روپے',
        agreementTime: '04:30 PM',
        agreementDay: 'Saturday / ہفتہ',
        witness1Name: 'Malik Usman Ali',
        witness1Cnic: '35501-1122334-5',
        witness2Name: 'Sheikh Zafar Iqbal',
        witness2Cnic: '35501-5566778-9',
        customerName: 'Rana Tariq Mehmood',
        customerPhone: '0302-8877665',
        customerCity: 'Sahiwal',
        carVehicle: 'Toyota',
        carModel: 'Fortuner Legender',
        carRegNumber: 'LEC-23-9988',
        saleAmount: 17500000,
        totalAmount: 17500000,
        createdBy: adminUser.id
      },

      // 2. Delivery Letter (ڈیلیوری لیٹر)
      {
        invoiceNumber: `DL-20260808-4821`,
        category: 'DELIVERY_LETTER',
        date: new Date(),
        dated: '2026-08-08',
        registrationNo: 'LEA-22-3142',
        buyerName: 'Hafiz Muhammad Sajid',
        buyerFatherName: 'Muhammad Din',
        buyerCnic: '35501-4455667-8',
        buyerPhone: '0313-7766554',
        buyerAddress: 'Farid Town, Block B, Sahiwal',
        vehicleMaker: 'Honda',
        vehicleModel: 'Civic Oriel Turbo',
        carYear: '2022',
        color: 'Crystal Black Silica',
        engineNumber: 'L15B7-1092834',
        chassisNumber: 'FE1-4029182',
        powerCapacity: '1500 CC Turbo',
        accountOf: 'Direct Customer Handover',
        time: '02:15 PM',
        witness1Name: 'Chaudhry Bilal Gujjar',
        witness1Cnic: '35501-9988776-1',
        witness2Name: 'Muhammad Kamran',
        witness2Cnic: '35501-3322114-5',
        totalPrice: 7800000,
        advanceAmount: 7800000,
        remainingAmount: 0,
        customerName: 'Hafiz Muhammad Sajid',
        customerPhone: '0313-7766554',
        customerCity: 'Sahiwal',
        carVehicle: 'Honda',
        carModel: 'Civic Oriel Turbo',
        carRegNumber: 'LEA-22-3142',
        saleAmount: 7800000,
        totalAmount: 7800000,
        createdBy: adminUser.id
      },

      // 3. Payment Voucher (P.V. / ادائیگی واؤچر)
      {
        invoiceNumber: `PV-20260808-1194`,
        category: 'PAYMENT_VOUCHER',
        date: new Date(),
        dated: '2026-08-08',
        payeeName: 'Mian Tanveer Ahmed (Vendor)',
        headOfAccount: 'Vehicle Inventory Settlement / Suzuki Cultus VXL',
        remarks: 'Full cash settlement payment issued for purchase of Suzuki Cultus VXL 2021 (Reg # SL-21-7049). Verified by Accounts.',
        totalPrice: 2850000,
        advanceAmount: 2850000,
        remainingAmount: 0,
        inWords: 'Twenty Eight Lakh Fifty Thousand Rupees Only / اٹھائیس لاکھ پچاس ہزار روپے',
        registrationNo: 'SL-21-7049',
        vehicleMaker: 'Suzuki',
        vehicleModel: 'Cultus VXL',
        carYear: '2021',
        saleAmount: 2850000,
        totalAmount: 2850000,
        createdBy: adminUser.id
      },

      // 4. Booking Receipt (رسید / Booking Receipt)
      {
        invoiceNumber: `BK-20260808-9530`,
        category: 'BOOKING_RECEIPT',
        date: new Date(),
        dated: '2026-08-08',
        buyerName: 'Zubair Hassan',
        buyerPhone: '0301-9988112',
        buyerAddress: 'College Road, Sahiwal',
        vehicleMaker: 'Kia',
        vehicleModel: 'Sportage AWD',
        carYear: '2024',
        color: 'Panthera Metal',
        registrationNo: 'UNREGISTERED',
        engineNumber: 'G4NC-5582910',
        chassisNumber: 'NQ5-1029482',
        totalPrice: 8200000,
        advanceAmount: 1000000,
        remainingAmount: 7200000,
        inWords: 'Eighty Two Lakh Rupees Only (Advance Ten Lakh Paid)',
        bankStatus: 'Online Bank Transfer Cleared (Meezan Bank)',
        chequeNo: 'FT-2026-MB-94021',
        dueDate: '2026-08-25',
        onAccount: 'Advance Booking for Kia Sportage AWD',
        customerName: 'Zubair Hassan',
        customerPhone: '0301-9988112',
        customerCity: 'Sahiwal',
        carVehicle: 'Kia',
        carModel: 'Sportage AWD',
        carRegNumber: 'UNREGISTERED',
        saleAmount: 8200000,
        totalAmount: 8200000,
        createdBy: adminUser.id
      }
    ];

    console.log('🚀 Seeding 4 voucher categories into database...');
    for (const data of vouchersToCreate) {
      const created = await prisma.invoice.create({ data });
      console.log(`  ✅ [${created.category}] Created: ${created.invoiceNumber}`);
    }

    console.log('\n🎉 Successfully seeded test voucher data for all 4 categories!');
  } catch (err) {
    console.error('❌ Error seeding voucher test data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedVoucherTestData();
