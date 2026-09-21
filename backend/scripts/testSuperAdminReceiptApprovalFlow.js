const prisma = require('../src/config/db');
const { createInvoice, updateInvoice, approveInvoice, getInvoices } = require('../src/controllers/invoiceController');

async function testSuperAdminReceiptApprovalFlow() {
  console.log('🧪 Starting Super Admin Receipt Approval Flow & Bank Case Checklist Test...\n');

  // 1. Get users
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const accountsHead = await prisma.user.findFirst({ where: { role: 'ACCOUNTS_HEAD' } });

  if (!superAdmin) throw new Error('SUPER_ADMIN user not found in DB');
  if (!accountsHead) throw new Error('ACCOUNTS_HEAD user not found in DB');

  console.log(`Found Users:
  - Super Admin: ${superAdmin.name} (${superAdmin.email})
  - Accounts Head: ${accountsHead.name} (${accountsHead.email})
  `);

  // 2. Check initial balances
  const feeAccountBefore = await prisma.account.findUnique({ where: { code: '4003' } });
  const cashAccountBefore = await prisma.account.findUnique({ where: { code: '1001' } });

  const initialFeeBal = feeAccountBefore?.currentBalance || 0;
  const initialCashBal = cashAccountBefore?.currentBalance || 0;

  console.log(`Initial Balances Before Creation:
  - 4003 Fee Revenue: Rs. ${initialFeeBal.toLocaleString()}
  - 1001 Cash Safe: Rs. ${initialCashBal.toLocaleString()}
  `);

  // 3. Step 1: Super Admin creates a Booking Receipt with Bank Financing Checklist
  console.log('--- Step 1: Super Admin creates Booking Receipt with Bank Financing & PKR 75,000 Fee ---');
  const createReq = {
    user: superAdmin,
    body: {
      category: 'BOOKING_RECEIPT',
      dated: new Date().toISOString().slice(0, 10),
      buyerName: 'Rana Tariq Bank Case Client',
      buyerPhone: '0321-7788990',
      vehicleMaker: 'Honda',
      vehicleModel: 'Civic RS Turbo',
      carYear: '2024',
      registrationNo: 'LHR-24-5544',
      chassisNumber: 'FC1-9988771',
      color: 'Crystal Black',
      totalPrice: '9500000', // 95 lac
      advanceAmount: '1500000', // 15 lac
      remainingAmount: '8000000', // 80 lac
      paymentMethod: 'CASH',
      // Bank Financing Checklist Fields
      isBankCase: true,
      bankName: 'Bank Alfalah Car Finance',
      processingFees: '75000',
      processingFeePaymentMethod: 'CASH'
    }
  };

  let createdReceipt = null;
  const createRes = {
    status: (code) => ({
      json: (data) => {
        if (code >= 400) throw new Error(data.message || 'Creation failed');
        createdReceipt = data;
        return data;
      }
    }),
    json: (data) => {
      createdReceipt = data;
      return data;
    }
  };

  await createInvoice(createReq, createRes);

  if (!createdReceipt) throw new Error('Failed to create receipt');

  console.log(`✅ Receipt #${createdReceipt.invoiceNumber} created!`);
  console.log(`- approvalStatus: ${createdReceipt.approvalStatus} (EXPECTED: PENDING)`);
  console.log(`- isBankCase: ${createdReceipt.isBankCase} (EXPECTED: true)`);
  console.log(`- bankName: ${createdReceipt.bankName}`);
  console.log(`- processingFees: Rs. ${createdReceipt.processingFees}`);

  if (createdReceipt.approvalStatus !== 'PENDING') {
    throw new Error(`Assertion Failed: approvalStatus should be PENDING for Super Admin creation, got: ${createdReceipt.approvalStatus}`);
  }

  // Verify that NO ledger transactions were posted yet
  const txnsAfterCreation = await prisma.transaction.findMany({
    where: { referenceId: createdReceipt.id }
  });
  console.log(`- Transactions posted in DB: ${txnsAfterCreation.length} (EXPECTED: 0)`);
  if (txnsAfterCreation.length !== 0) {
    throw new Error('Assertion Failed: Transactions should NOT be posted while PENDING');
  }

  const feeAccountAfterCreation = await prisma.account.findUnique({ where: { code: '4003' } });
  const cashAccountAfterCreation = await prisma.account.findUnique({ where: { code: '1001' } });
  if (feeAccountAfterCreation.currentBalance !== initialFeeBal || cashAccountAfterCreation.currentBalance !== initialCashBal) {
    throw new Error('Assertion Failed: Account balances must NOT change while PENDING');
  }
  console.log('✅ Verified: Zero ledger/cash changes occurred upon Super Admin creation.\n');

  // 4. Step 2: Super Admin edits the receipt (e.g. changes fee to 80,000 and color)
  console.log('--- Step 2: Super Admin edits receipt (verifying isBankCase persistence) ---');
  const updateReq = {
    user: superAdmin,
    params: { id: createdReceipt.id },
    body: {
      isBankCase: true,
      bankName: 'Bank Alfalah Car Finance - Premium',
      processingFees: '80000',
      processingFeePaymentMethod: 'CASH',
      color: 'Midnight Black'
    }
  };

  let updatedReceipt = null;
  const updateRes = {
    status: (code) => ({
      json: (data) => {
        if (code >= 400) throw new Error(data.message || 'Update failed');
        updatedReceipt = data;
        return data;
      }
    }),
    json: (data) => {
      updatedReceipt = data;
      return data;
    }
  };

  await updateInvoice(updateReq, updateRes);

  console.log(`✅ Receipt updated!`);
  console.log(`- isBankCase: ${updatedReceipt.isBankCase} (EXPECTED: true)`);
  console.log(`- bankName: ${updatedReceipt.bankName}`);
  console.log(`- processingFees: Rs. ${updatedReceipt.processingFees}`);
  console.log(`- approvalStatus: ${updatedReceipt.approvalStatus}`);

  if (!updatedReceipt.isBankCase) {
    throw new Error('Assertion Failed: isBankCase became false after edit!');
  }

  // 5. Step 3: Accounts Head reviews and approves the receipt
  console.log('\n--- Step 3: Accounts Head approves receipt & posts funds into ledgers ---');
  const approveReq = {
    user: accountsHead,
    params: { id: createdReceipt.id },
    body: {
      approvalNotes: 'Approved by Accounts Head - Bank case verified'
    }
  };

  let approveResult = null;
  const approveRes = {
    status: (code) => ({
      json: (data) => {
        if (code >= 400) throw new Error(data.message || 'Approve failed');
        approveResult = data;
        return data;
      }
    }),
    json: (data) => {
      approveResult = data;
      return data;
    }
  };

  await approveInvoice(approveReq, approveRes);

  console.log(`✅ Approved result message: ${approveResult.message}`);
  console.log(`- Updated status: ${approveResult.invoice.approvalStatus} (EXPECTED: APPROVED)`);

  // Verify Double-Entry Transactions
  const txnsAfterApproval = await prisma.transaction.findMany({
    where: { referenceId: createdReceipt.id },
    include: { entries: { include: { account: true } } }
  });

  console.log(`\nTransactions posted after approval: ${txnsAfterApproval.length}`);
  txnsAfterApproval.forEach((txn, idx) => {
    console.log(`  [Txn ${idx + 1}] #${txn.transactionNumber} - ${txn.type} - Rs. ${txn.amount.toLocaleString()}`);
    console.log(`   Description: ${txn.description}`);
    txn.entries.forEach(entry => {
      console.log(`     -> ${entry.type}: [${entry.account.code}] ${entry.account.name} (Rs. ${entry.amount.toLocaleString()})`);
    });
  });

  const feeAccountFinal = await prisma.account.findUnique({ where: { code: '4003' } });
  const cashAccountFinal = await prisma.account.findUnique({ where: { code: '1001' } });

  console.log(`\nFinal Balances After Accounts Head Approval:
  - 4003 Fee Revenue: Rs. ${feeAccountFinal.currentBalance.toLocaleString()} (Grew by Rs. ${(feeAccountFinal.currentBalance - initialFeeBal).toLocaleString()})
  - 1001 Cash Safe: Rs. ${cashAccountFinal.currentBalance.toLocaleString()} (Grew by Rs. ${(cashAccountFinal.currentBalance - initialCashBal).toLocaleString()})
  `);

  if (feeAccountFinal.currentBalance - initialFeeBal !== 80000) {
    throw new Error(`Assertion Failed: 4003 Fee should have increased by 80,000, got: ${feeAccountFinal.currentBalance - initialFeeBal}`);
  }

  // Advance (15 lac) + Processing Fee (80k) = 15,80,000 in Cash Safe
  if (cashAccountFinal.currentBalance - initialCashBal !== 1580000) {
    throw new Error(`Assertion Failed: Cash Safe should have increased by 1,580,000, got: ${cashAccountFinal.currentBalance - initialCashBal}`);
  }

  console.log('🎉 ALL SUPER ADMIN APPROVAL FLOW & BANK CASE CHECKLIST TESTS PASSED PERFECTLY!\n');
}

testSuperAdminReceiptApprovalFlow()
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
