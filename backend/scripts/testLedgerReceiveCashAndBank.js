require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/config/db');
const accountController = require('../src/controllers/accountController');

async function testLedgerReceiveCashAndBank() {
  console.log('--- Starting Ledger Cash & Bank Posting Test Suite ---');

  // 1. Ensure Cash Safe, Bank Account, Customer Ledger, and Expense Ledger exist
  let cashSafe = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } });
  if (!cashSafe) {
    cashSafe = await prisma.account.create({
      data: {
        code: '1001',
        name: 'Cash in Hand Safe',
        type: 'ASSET',
        subType: 'CASH',
        currentBalance: 500000,
        description: 'Physical showroom cash safe'
      }
    });
  }

  let bankAccount = await prisma.account.findFirst({ where: { subType: 'BANK', isActive: true } });
  if (!bankAccount) {
    bankAccount = await prisma.account.create({
      data: {
        code: '1002',
        name: 'Meezan Bank - Main Account',
        type: 'ASSET',
        subType: 'BANK',
        bankName: 'Meezan Bank',
        accountNumber: 'PK00MEZN0001',
        currentBalance: 1000000,
        description: 'Corporate bank account'
      }
    });
  }

  let customerLedger = await prisma.account.findFirst({ where: { code: 'TEST_CUST_01' } });
  if (!customerLedger) {
    customerLedger = await prisma.account.create({
      data: {
        code: 'TEST_CUST_01',
        name: 'Test Customer Ledger - Mr. Zaid',
        type: 'ASSET',
        subType: 'CUSTOMER',
        currentBalance: 300000,
        description: 'Customer receivables ledger'
      }
    });
  }

  let expenseLedger = await prisma.account.findFirst({ where: { code: 'TEST_EXP_01' } });
  if (!expenseLedger) {
    expenseLedger = await prisma.account.create({
      data: {
        code: 'TEST_EXP_01',
        name: 'Test Expense Ledger - Showroom Repairs',
        type: 'EXPENSE',
        subType: 'EXPENSE',
        currentBalance: 10000,
        description: 'Operational repairs expense'
      }
    });
  }

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('User not found');

  const initialCashBal = cashSafe.currentBalance;
  const initialBankBal = bankAccount.currentBalance;
  const initialCustBal = customerLedger.currentBalance;
  const initialExpBal = expenseLedger.currentBalance;

  console.log(`Initial Balances:
  - Cash in Hand Safe (1001): PKR ${initialCashBal.toLocaleString()}
  - Bank (${bankAccount.name}): PKR ${initialBankBal.toLocaleString()}
  - Customer Ledger: PKR ${initialCustBal.toLocaleString()}
  - Expense Ledger: PKR ${initialExpBal.toLocaleString()}`);

  const createdTxnIds = [];

  // --------------------------------------------------------------------------
  // TEST 1: Receive Rs. 60,000 into Customer Ledger via CASH
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Receiving Rs. 60,000 in Customer Ledger via CASH (Cash in Hand)...');
  const recvCashReq = {
    body: {
      accountId: customerLedger.id,
      amount: 60000,
      receivedFrom: 'Mr. Zaid (Customer)',
      paymentMethod: 'CASH',
      description: 'Vehicle Installment Payment received in cash at showroom'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };
  let res1Data = null;
  const res1 = {
    status: () => res1,
    json: (d) => { res1Data = d; return res1; }
  };
  await accountController.receiveAmountInLedger(recvCashReq, res1);

  if (!res1Data || !res1Data.transaction) {
    throw new Error(`TEST 1 Failed: ${JSON.stringify(res1Data)}`);
  }
  createdTxnIds.push(res1Data.transaction.id);

  const cashAfter1 = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  const custAfter1 = await prisma.account.findUnique({ where: { id: customerLedger.id } });

  console.log(`  -> Cash Safe Balance: PKR ${cashAfter1.currentBalance.toLocaleString()} (Diff: +${cashAfter1.currentBalance - initialCashBal})`);
  console.log(`  -> Customer Ledger Balance: PKR ${custAfter1.currentBalance.toLocaleString()} (Diff: ${custAfter1.currentBalance - initialCustBal})`);

  if (cashAfter1.currentBalance !== initialCashBal + 60000) {
    throw new Error(`TEST 1 Assertion Failed: Cash Safe balance expected ${initialCashBal + 60000}, got ${cashAfter1.currentBalance}`);
  }
  if (custAfter1.currentBalance !== initialCustBal - 60000) {
    throw new Error(`TEST 1 Assertion Failed: Customer balance expected ${initialCustBal - 60000}, got ${custAfter1.currentBalance}`);
  }
  console.log('✅ TEST 1 PASSED: Rs. 60,000 added into Cash in Hand Safe and credited to Customer Ledger!');

  // --------------------------------------------------------------------------
  // TEST 2: Receive Rs. 120,000 into Customer Ledger via BANK TRANSFER
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Receiving Rs. 120,000 in Customer Ledger via BANK_TRANSFER...');
  const recvBankReq = {
    body: {
      accountId: customerLedger.id,
      amount: 120000,
      receivedFrom: 'Mr. Zaid (Customer)',
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: bankAccount.id,
      description: 'Downpayment transfer via Meezan Bank Online App'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };
  let res2Data = null;
  const res2 = {
    status: () => res2,
    json: (d) => { res2Data = d; return res2; }
  };
  await accountController.receiveAmountInLedger(recvBankReq, res2);

  if (!res2Data || !res2Data.transaction) {
    throw new Error(`TEST 2 Failed: ${JSON.stringify(res2Data)}`);
  }
  createdTxnIds.push(res2Data.transaction.id);

  const bankAfter2 = await prisma.account.findUnique({ where: { id: bankAccount.id } });
  const custAfter2 = await prisma.account.findUnique({ where: { id: customerLedger.id } });

  console.log(`  -> Bank Balance: PKR ${bankAfter2.currentBalance.toLocaleString()} (Diff: +${bankAfter2.currentBalance - initialBankBal})`);
  console.log(`  -> Customer Ledger Balance: PKR ${custAfter2.currentBalance.toLocaleString()} (Diff: ${custAfter2.currentBalance - custAfter1.currentBalance})`);

  if (bankAfter2.currentBalance !== initialBankBal + 120000) {
    throw new Error(`TEST 2 Assertion Failed: Bank balance expected ${initialBankBal + 120000}, got ${bankAfter2.currentBalance}`);
  }
  if (custAfter2.currentBalance !== custAfter1.currentBalance - 120000) {
    throw new Error(`TEST 2 Assertion Failed: Customer balance expected ${custAfter1.currentBalance - 120000}, got ${custAfter2.currentBalance}`);
  }
  console.log('✅ TEST 2 PASSED: Rs. 120,000 added into Bank Account and credited to Customer Ledger!');

  // --------------------------------------------------------------------------
  // TEST 3: Pay Rs. 15,000 from Expense Ledger via CASH
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Paying Rs. 15,000 from Expense Ledger via CASH (Cash in Hand)...');
  const payCashReq = {
    body: {
      accountId: expenseLedger.id,
      amount: 15000,
      paidTo: 'Painter & Electrician Staff',
      paymentMethod: 'CASH',
      description: 'Cash payment for showroom gate welding & painting'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };
  let res3Data = null;
  const res3 = {
    status: () => res3,
    json: (d) => { res3Data = d; return res3; }
  };
  await accountController.payAmountFromLedger(payCashReq, res3);

  if (!res3Data || !res3Data.transaction) {
    throw new Error(`TEST 3 Failed: ${JSON.stringify(res3Data)}`);
  }
  createdTxnIds.push(res3Data.transaction.id);

  const cashAfter3 = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  const expAfter3 = await prisma.account.findUnique({ where: { id: expenseLedger.id } });

  console.log(`  -> Cash Safe Balance: PKR ${cashAfter3.currentBalance.toLocaleString()} (Diff: ${cashAfter3.currentBalance - cashAfter1.currentBalance})`);
  console.log(`  -> Expense Ledger Balance: PKR ${expAfter3.currentBalance.toLocaleString()} (Diff: +${expAfter3.currentBalance - initialExpBal})`);

  if (cashAfter3.currentBalance !== cashAfter1.currentBalance - 15000) {
    throw new Error(`TEST 3 Assertion Failed: Cash Safe balance expected ${cashAfter1.currentBalance - 15000}, got ${cashAfter3.currentBalance}`);
  }
  if (expAfter3.currentBalance !== initialExpBal + 15000) {
    throw new Error(`TEST 3 Assertion Failed: Expense balance expected ${initialExpBal + 15000}, got ${expAfter3.currentBalance}`);
  }
  console.log('✅ TEST 3 PASSED: Rs. 15,000 deducted from Cash in Hand Safe and debited to Expense Ledger!');

  // --------------------------------------------------------------------------
  // TEST 4: Pay Rs. 40,000 from Expense Ledger via BANK TRANSFER
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Paying Rs. 40,000 from Expense Ledger via BANK_TRANSFER...');
  const payBankReq = {
    body: {
      accountId: expenseLedger.id,
      amount: 40000,
      paidTo: 'Security Services Pvt Ltd',
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: bankAccount.id,
      description: 'Monthly showroom CCTV & Guard fee paid via online bank transfer'
    },
    user: { id: user.id, role: 'SUPERADMIN' }
  };
  let res4Data = null;
  const res4 = {
    status: () => res4,
    json: (d) => { res4Data = d; return res4; }
  };
  await accountController.payAmountFromLedger(payBankReq, res4);

  if (!res4Data || !res4Data.transaction) {
    throw new Error(`TEST 4 Failed: ${JSON.stringify(res4Data)}`);
  }
  createdTxnIds.push(res4Data.transaction.id);

  const bankAfter4 = await prisma.account.findUnique({ where: { id: bankAccount.id } });
  const expAfter4 = await prisma.account.findUnique({ where: { id: expenseLedger.id } });

  console.log(`  -> Bank Balance: PKR ${bankAfter4.currentBalance.toLocaleString()} (Diff: ${bankAfter4.currentBalance - bankAfter2.currentBalance})`);
  console.log(`  -> Expense Ledger Balance: PKR ${expAfter4.currentBalance.toLocaleString()} (Diff: +${expAfter4.currentBalance - expAfter3.currentBalance})`);

  if (bankAfter4.currentBalance !== bankAfter2.currentBalance - 40000) {
    throw new Error(`TEST 4 Assertion Failed: Bank balance expected ${bankAfter2.currentBalance - 40000}, got ${bankAfter4.currentBalance}`);
  }
  if (expAfter4.currentBalance !== expAfter3.currentBalance + 40000) {
    throw new Error(`TEST 4 Assertion Failed: Expense balance expected ${expAfter3.currentBalance + 40000}, got ${expAfter4.currentBalance}`);
  }
  console.log('✅ TEST 4 PASSED: Rs. 40,000 deducted from Bank Account and debited to Expense Ledger!');

  // Clean up test transactions and restore original account balances
  await prisma.transactionEntry.deleteMany({
    where: { transactionId: { in: createdTxnIds } }
  });
  await prisma.transaction.deleteMany({
    where: { id: { in: createdTxnIds } }
  });
  await prisma.account.update({
    where: { id: cashSafe.id },
    data: { currentBalance: initialCashBal }
  });
  await prisma.account.update({
    where: { id: bankAccount.id },
    data: { currentBalance: initialBankBal }
  });
  await prisma.account.delete({ where: { id: customerLedger.id } });
  await prisma.account.delete({ where: { id: expenseLedger.id } });

  console.log('\n🎉 ALL 4 LEDGER CASH & BANK SYNCHRONIZATION TESTS PASSED PERFECTLY! 🎉');
}

testLedgerReceiveCashAndBank()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
