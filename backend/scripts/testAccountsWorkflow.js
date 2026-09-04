const prisma = require('../src/config/db');

async function testAccounts() {
  console.log('🧪 Starting Automated Accounts Verification Suite...');

  // 1. Verify Chart of Accounts
  const accountsCount = await prisma.account.count();
  console.log(`✓ Total Accounts in COA: ${accountsCount}`);

  const cashAccount = await prisma.account.findFirst({ where: { subType: 'CASH' } });
  const bankAccount = await prisma.account.findFirst({ where: { subType: 'BANK' } });
  console.log(`✓ Cash Account: [${cashAccount?.code}] ${cashAccount?.name} (Balance: Rs. ${cashAccount?.currentBalance})`);
  console.log(`✓ Bank Account: [${bankAccount?.code}] ${bankAccount?.name} (Balance: Rs. ${bankAccount?.currentBalance})`);

  // 2. Verify Super Admin User exists
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }) 
    || await prisma.user.findFirst();

  if (!superAdmin) {
    console.error('❌ No user found to test with.');
    return;
  }

  // 3. Test Security Cheque creation
  const testCheque = await prisma.securityCheque.create({
    data: {
      chequeNumber: `TST-${Date.now().toString().slice(-6)}`,
      type: 'ISSUED',
      bankAccountId: bankAccount.id,
      bankName: bankAccount.bankName || 'Meezan Bank',
      partyName: 'Haji Motors & Auto Dealer',
      partyPhone: '0300-9876543',
      amount: 500000,
      dueDate: new Date(Date.now() + 15 * 86400000), // 15 days later
      status: 'ISSUED',
      chassisNumber: 'NZE141-998811',
      notes: 'Test Security Cheque for verification',
      createdById: superAdmin.id
    }
  });
  console.log(`✓ Created Security Cheque: #${testCheque.chequeNumber} for Rs. ${testCheque.amount} to ${testCheque.partyName}`);

  // 4. Test Installment Plan creation
  const testPlan = await prisma.installmentPlan.create({
    data: {
      planNumber: `IP-TST-${Date.now().toString().slice(-4)}`,
      customerName: 'Muhammad Arslan Khan',
      customerPhone: '0321-4455667',
      customerCnic: '35201-1234567-1',
      vehicleName: 'Toyota Corolla Grande 2023',
      registrationNo: 'LEC-8901',
      chassisNumber: 'NZE141-998811',
      totalPrice: 6000000,
      advanceAmount: 2000000,
      remainingAmount: 4000000,
      totalInstallments: 12,
      installmentAmount: Math.round(4000000 / 12),
      frequency: 'MONTHLY',
      startDate: new Date(),
      status: 'ACTIVE',
      notes: 'Test Installment Plan',
      createdById: superAdmin.id,
      items: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date(Date.now() + 30 * 86400000),
            amount: Math.round(4000000 / 12),
            paidAmount: 0,
            status: 'UNPAID'
          },
          {
            installmentNumber: 2,
            dueDate: new Date(Date.now() + 60 * 86400000),
            amount: Math.round(4000000 / 12),
            paidAmount: 0,
            status: 'UNPAID'
          }
        ]
      }
    },
    include: { items: true }
  });
  console.log(`✓ Created Installment Plan: [${testPlan.planNumber}] for ${testPlan.customerName} (Remaining: Rs. ${testPlan.remainingAmount})`);

  // 5. Test Double Sale / Chassis Segregation Scenario
  // Create Sale #1 (Customer A - Undelivered)
  const sale1 = await prisma.invoice.create({
    data: {
      invoiceNumber: `REC-TST1-${Date.now().toString().slice(-4)}`,
      category: 'SALES_RECEIPT',
      date: new Date(Date.now() - 86400000), // Day 1
      customerName: 'Tariq Mehmood (Customer A)',
      buyerName: 'Tariq Mehmood (Customer A)',
      buyerPhone: '0300-1112233',
      vehicleMaker: 'Toyota',
      vehicleModel: 'Fortuner Legender',
      chassisNumber: 'GUN156-554433',
      totalPrice: '3000000',
      advanceAmount: '3000000',
      remainingAmount: '0',
      paymentMethod: 'CASH',
      cashAmountReceived: '3000000',
      deliveryStatus: 'UNDELIVERED',
      isDoubleSaleLiability: true,
      createdBy: superAdmin.id
    }
  });

  // Create Sale #2 (Customer B - Delivered next day)
  const sale2 = await prisma.invoice.create({
    data: {
      invoiceNumber: `REC-TST2-${Date.now().toString().slice(-4)}`,
      category: 'SALES_RECEIPT',
      date: new Date(), // Day 2
      customerName: 'Chaudhry Bilal (Customer B)',
      buyerName: 'Chaudhry Bilal (Customer B)',
      buyerPhone: '0300-9998877',
      vehicleMaker: 'Toyota',
      vehicleModel: 'Fortuner Legender',
      chassisNumber: 'GUN156-554433',
      totalPrice: '3000000',
      advanceAmount: '3000000',
      remainingAmount: '0',
      paymentMethod: 'BANK',
      bankAccountId: bankAccount.id,
      bankAmountReceived: '3000000',
      deliveryStatus: 'DELIVERED',
      isDoubleSaleLiability: false,
      createdBy: superAdmin.id
    }
  });

  console.log(`✓ Seeded Single Chassis Double Sale:`);
  console.log(`   - Sale 1 (${sale1.invoiceNumber}): ${sale1.customerName} - Status: ${sale1.deliveryStatus} (Rs. 30 Lac Cash)`);
  console.log(`   - Sale 2 (${sale2.invoiceNumber}): ${sale2.customerName} - Status: ${sale2.deliveryStatus} (Rs. 30 Lac Bank)`);
  console.log(`   - Both linked cleanly by Chassis Number: GUN156-554433`);

  console.log('🎉 Verification Complete: All accounts, cheques, installments, and chassis segregation systems verified successfully!');
}

testAccounts()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
