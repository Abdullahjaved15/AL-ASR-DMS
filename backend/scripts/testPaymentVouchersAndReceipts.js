const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const accountController = require('../src/controllers/accountController');

async function testPaymentVouchersAndReceipts() {
  console.log('--- Testing Payment Vouchers (Payouts) and Receipts (Cash/Bank Inflows) ---');

  // 1. Get or create Cash in Hand Safe (1001) and an Expense Account
  let cashSafe = await prisma.account.findFirst({ where: { subType: 'CASH' } });
  if (!cashSafe) {
    cashSafe = await prisma.account.create({
      data: {
        code: '1001',
        name: 'Cash in Hand Safe',
        type: 'ASSET',
        subType: 'CASH',
        currentBalance: 1000000,
        description: 'Showroom cash safe'
      }
    });
  }

  let testExpense = await prisma.account.findFirst({ where: { code: '5001' } });
  if (!testExpense) {
    testExpense = await prisma.account.create({
      data: {
        code: '5001',
        name: 'Showroom Utility & Maintenance Expense',
        type: 'EXPENSE',
        subType: 'EXPENSE',
        currentBalance: 0
      }
    });
  }

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('User not found');

  const initialSafeBal = cashSafe.currentBalance;
  console.log(`Initial Cash in Hand Safe Balance: PKR ${initialSafeBal.toLocaleString()}`);

  // 2. Test Payment Voucher Generation (Money Paid Out from Safe)
  console.log('\n1. Testing Payment Voucher (PV) Payout from Safe...');
  const payReq = {
    body: {
      accountId: cashSafe.id,
      amount: 25000,
      paidTo: 'Electric Utility Supply Co',
      targetAccountId: testExpense.id,
      description: 'Electricity Bill Payment for Showroom Main Hall',
      paymentMethod: 'CASH'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };

  let payStatus = 200;
  let payResData = null;
  const payRes = {
    status: (code) => { payStatus = code; return payRes; },
    json: (d) => { payResData = d; return payRes; }
  };

  await accountController.payAmountFromLedger(payReq, payRes);

  if (payStatus !== 201 || !payResData || !payResData.transaction) {
    throw new Error(`payAmountFromLedger failed: ${JSON.stringify(payResData)}`);
  }

  console.log(`✅ Payment Voucher generated: ${payResData.transaction.transactionNumber}`);
  console.log(`   - Type: ${payResData.transaction.type}`);
  console.log(`   - Amount: PKR ${payResData.transaction.amount}`);
  console.log(`   - Double-entry entries count: ${payResData.transaction.entries?.length || 2}`);

  // Verify Safe Balance Decreased
  const postPaySafe = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  console.log(`   - Safe Balance after Payment Voucher: PKR ${postPaySafe.currentBalance.toLocaleString()} (reduced by 25,000)`);
  if (postPaySafe.currentBalance !== initialSafeBal - 25000) {
    throw new Error(`Safe balance calculation mismatch! Expected ${initialSafeBal - 25000}, got ${postPaySafe.currentBalance}`);
  }

  // 3. Test Receiving Payment (Money Inflow into Safe)
  console.log('\n2. Testing Payment Receipt (Inflow) into Cash Safe...');
  const recvReq = {
    body: {
      accountId: cashSafe.id,
      amount: 75000,
      receivedFrom: 'Customer Malik Haris',
      description: 'Vehicle Registration Fee & Service Charges Paid in Cash',
      paymentMethod: 'CASH'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };

  let recvStatus = 200;
  let recvResData = null;
  const recvRes = {
    status: (code) => { recvStatus = code; return recvRes; },
    json: (d) => { recvResData = d; return recvRes; }
  };

  await accountController.receiveAmountInLedger(recvReq, recvRes);

  if (recvStatus !== 201 || !recvResData || !recvResData.transaction) {
    throw new Error(`receiveAmountInLedger failed: ${JSON.stringify(recvResData)}`);
  }

  console.log(`✅ Receipt Voucher generated: ${recvResData.transaction.transactionNumber}`);
  console.log(`   - Type: ${recvResData.transaction.type}`);
  console.log(`   - Amount: PKR ${recvResData.transaction.amount}`);

  // Verify Safe Balance Increased
  const postRecvSafe = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  console.log(`   - Safe Balance after Receipt: PKR ${postRecvSafe.currentBalance.toLocaleString()} (increased by 75,000)`);
  if (postRecvSafe.currentBalance !== postPaySafe.currentBalance + 75000) {
    throw new Error(`Safe balance calculation mismatch on receipt! Expected ${postPaySafe.currentBalance + 75000}, got ${postRecvSafe.currentBalance}`);
  }

  // 4. Clean up test transactions
  await prisma.transactionEntry.deleteMany({
    where: {
      transactionId: { in: [payResData.transaction.id, recvResData.transaction.id] }
    }
  });
  await prisma.transaction.deleteMany({
    where: {
      id: { in: [payResData.transaction.id, recvResData.transaction.id] }
    }
  });

  // Revert safe balance
  await prisma.account.update({
    where: { id: cashSafe.id },
    data: { currentBalance: initialSafeBal }
  });

  console.log('\n🎉 ALL PAYMENT VOUCHER & CASH/BANK RECEIPT TESTS PASSED! 🎉');
}

testPaymentVouchersAndReceipts()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
