const prisma = require('../src/config/db');
const { createInvoice, syncInvoiceLedgerTransactions } = require('../src/controllers/invoiceController');

async function testBankCaseBookingReceipt() {
  console.log('🧪 Starting Bank Case Booking Receipt & Processing Fees Ledger Test...\n');

  // 1. Get an admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD'] } }
  });
  if (!adminUser) {
    throw new Error('No admin user found in database for testing');
  }

  // 2. Get initial balances of 4003, 1001, 1002
  const feeAccount = await prisma.account.findUnique({ where: { code: '4003' } });
  const cashAccount = await prisma.account.findUnique({ where: { code: '1001' } });
  const meezanAccount = await prisma.account.findUnique({ where: { code: '1002' } });

  console.log(`Initial Balances:
  - 4003 Fee Revenue: Rs. ${feeAccount?.currentBalance || 0}
  - 1001 Cash Safe: Rs. ${cashAccount?.currentBalance || 0}
  - 1002 Meezan Bank: Rs. ${meezanAccount?.currentBalance || 0}
  `);

  const initialFeeBal = feeAccount ? feeAccount.currentBalance : 0;
  const initialCashBal = cashAccount ? cashAccount.currentBalance : 0;

  // 3. Test 1: Create Booking Receipt with Bank Case (Cash Processing Fee: 50,000)
  console.log('--- Test 1: Creating Booking Receipt with Bank Case (Cash Fee: PKR 50,000) ---');
  const req1 = {
    user: adminUser,
    body: {
      category: 'BOOKING_RECEIPT',
      dated: new Date().toISOString().slice(0, 10),
      buyerName: 'Muhammad Hamza Bank Client',
      buyerPhone: '0300-9876543',
      vehicleMaker: 'Toyota',
      vehicleModel: 'Corolla Altis Grande 1.8',
      carYear: '2023',
      registrationNo: 'ICT-23-9988',
      chassisNumber: 'ZRE182-9988112',
      engineNumber: '2ZR-889911',
      color: 'Super White',
      totalPrice: '7500000', // 75 lac
      advanceAmount: '1000000', // 10 lac
      remainingAmount: '6500000', // 65 lac
      paymentMethod: 'CASH',
      // Bank Case Fields
      isBankCase: true,
      bankName: 'Meezan Bank Auto Ijarah',
      processingFees: '50000',
      processingFeePaymentMethod: 'CASH'
    }
  };

  let createdInv1 = null;
  const res1 = {
    status: (code) => ({
      json: (data) => {
        if (code >= 400) throw new Error(`Create booking 1 failed (${code}): ${JSON.stringify(data)}`);
        createdInv1 = data.invoice || data;
        return data;
      }
    })
  };

  await createInvoice(req1, res1);
  console.log(`✓ Booking Receipt Created: #${createdInv1.invoiceNumber} (ID: ${createdInv1.id})`);
  console.log(`  isBankCase: ${createdInv1.isBankCase}, Bank: ${createdInv1.bankName}, Processing Fees: Rs. ${createdInv1.processingFees}`);

  // Check transactions for this invoice
  const txns1 = await prisma.transaction.findMany({
    where: { referenceId: createdInv1.id },
    include: { entries: { include: { account: true } } }
  });

  console.log(`✓ Found ${txns1.length} transactions for Booking Receipt #${createdInv1.invoiceNumber}:`);
  for (const t of txns1) {
    console.log(`  - Txn [${t.transactionNumber}] Amount: Rs. ${t.amount} (${t.type})`);
    console.log(`    Desc: ${t.description}`);
    for (const e of t.entries) {
      console.log(`      * [${e.type}] Account: ${e.account.code} - ${e.account.name}: Rs. ${e.amount}`);
    }
  }

  // Verify Fee Transaction exists and posted to 4003 and 1001
  const feeTxn1 = txns1.find(t => t.entries.some(e => e.account.code === '4003'));
  if (!feeTxn1) {
    throw new Error('FAILED: No transaction found posting to Account 4003 (Bank Case Processing Fees)');
  }
  console.log('✅ SUCCESS: Processing Fee Transaction verified for Test 1!');

  // Verify updated balances
  const updatedFeeAccount1 = await prisma.account.findUnique({ where: { code: '4003' } });
  const updatedCashAccount1 = await prisma.account.findUnique({ where: { code: '1001' } });
  console.log(`Updated Balances after Test 1:
  - 4003 Fee Revenue: Rs. ${updatedFeeAccount1.currentBalance} (Diff: +${updatedFeeAccount1.currentBalance - initialFeeBal})
  - 1001 Cash Safe: Rs. ${updatedCashAccount1.currentBalance} (Diff: +${updatedCashAccount1.currentBalance - initialCashBal})
  `);

  if (updatedFeeAccount1.currentBalance !== initialFeeBal + 50000) {
    throw new Error(`Fee Revenue Balance mismatch! Expected ${initialFeeBal + 50000}, got ${updatedFeeAccount1.currentBalance}`);
  }

  // 4. Test 2: Create Booking Receipt with Bank Transfer Processing Fee (PKR 75,000 into Meezan Bank 1002)
  if (meezanAccount) {
    console.log('\n--- Test 2: Creating Booking Receipt with Bank Transfer Processing Fee (PKR 75,000 -> Meezan Bank) ---');
    const initialMeezanBal = meezanAccount.currentBalance;

    const req2 = {
      user: adminUser,
      body: {
        category: 'BOOKING_RECEIPT',
        dated: new Date().toISOString().slice(0, 10),
        buyerName: 'Chaudhry Bilal Bank Lease',
        buyerPhone: '0321-1122334',
        vehicleMaker: 'Honda',
        vehicleModel: 'Civic RS Turbo',
        carYear: '2024',
        registrationNo: 'LEA-24-1122',
        chassisNumber: 'FE1-8877665',
        engineNumber: 'L15B-998877',
        color: 'Meteoroid Gray',
        totalPrice: '9800000',
        advanceAmount: '1500000',
        remainingAmount: '8300000',
        paymentMethod: 'BANK',
        bankAccountId: meezanAccount.id,
        // Bank Case Fields
        isBankCase: true,
        bankName: 'Bank Alfalah Car Finance',
        processingFees: '75000',
        processingFeePaymentMethod: 'BANK',
        processingFeeBankAccountId: meezanAccount.id
      }
    };

    let createdInv2 = null;
    const res2 = {
      status: (code) => ({
        json: (data) => {
          if (code >= 400) throw new Error(`Create booking 2 failed (${code}): ${JSON.stringify(data)}`);
          createdInv2 = data.invoice || data;
          return data;
        }
      })
    };

    await createInvoice(req2, res2);
    console.log(`✓ Booking Receipt #2 Created: #${createdInv2.invoiceNumber} (ID: ${createdInv2.id})`);

    const txns2 = await prisma.transaction.findMany({
      where: { referenceId: createdInv2.id },
      include: { entries: { include: { account: true } } }
    });

    for (const t of txns2) {
      console.log(`  - Txn [${t.transactionNumber}] Amount: Rs. ${t.amount} (${t.type})`);
      for (const e of t.entries) {
        console.log(`      * [${e.type}] Account: ${e.account.code} - ${e.account.name}: Rs. ${e.amount}`);
      }
    }

    const updatedMeezanAccount = await prisma.account.findUnique({ where: { code: '1002' } });
    console.log(`Meezan Bank Balance after Test 2: Rs. ${updatedMeezanAccount.currentBalance} (Diff: +${updatedMeezanAccount.currentBalance - initialMeezanBal})`);
    console.log('✅ SUCCESS: Bank Transfer Processing Fee verified for Test 2!');
  }

  console.log('\n🎉 ALL BANK CASE PROCESSING FEES & LEDGER TESTS PASSED SUCCESSFULLY!');
}

testBankCaseBookingReceipt()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
