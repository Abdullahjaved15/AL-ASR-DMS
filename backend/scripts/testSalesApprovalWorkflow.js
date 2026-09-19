const prisma = require('../src/config/db');
const { syncInvoiceLedgerTransactions } = require('../src/controllers/invoiceController');
const { parsePakistaniPrice } = require('../src/utils/priceParser');

async function testWorkflow() {
  console.log('🧪 Starting Sales & Invoices Accounts Head Approval Workflow Verification...');

  try {
    // 1. Fetch or create users: Super Admin and Accounts Head
    let superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          name: 'Super Administrator',
          email: `superadmin_test_${Date.now()}@alasr.com`,
          password: 'hashed_password',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });
    }

    let accountsHead = await prisma.user.findFirst({ where: { role: 'ACCOUNTS_HEAD' } });
    if (!accountsHead) {
      accountsHead = await prisma.user.create({
        data: {
          name: 'Chief Accounts Officer',
          email: `accounts_head_${Date.now()}@alasr.com`,
          password: 'hashed_password',
          role: 'ACCOUNTS_HEAD',
          status: 'ACTIVE'
        }
      });
    }

    // 2. Fetch or create Cash in Hand and a Test Bank Account
    let cashSafe = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } });
    if (!cashSafe) {
      cashSafe = await prisma.account.create({
        data: {
          code: '1001',
          name: 'Cash in Hand Safe',
          type: 'ASSET',
          subType: 'CASH',
          currentBalance: 0,
          description: 'Showroom cash safe'
        }
      });
    }

    let testBank = await prisma.account.findFirst({ where: { subType: 'BANK', isActive: true } });
    if (!testBank) {
      testBank = await prisma.account.create({
        data: {
          code: '1002',
          name: 'Meezan Bank Ltd (A/C 0101)',
          type: 'ASSET',
          subType: 'BANK',
          bankName: 'Meezan Bank',
          accountNumber: '0101010101',
          currentBalance: 0,
          description: 'Official dealership bank account'
        }
      });
    }

    const initialCashBalance = cashSafe.currentBalance;
    const initialBankBalance = testBank.currentBalance;

    console.log(`📊 Initial Balances -> Cash in Hand Safe: PKR ${initialCashBalance.toLocaleString()} | Bank: PKR ${initialBankBalance.toLocaleString()}`);

    // 3. Super Admin creates a new Sales Receipt for Rs. 5,000,000 (Split: 2,000,000 Cash + 3,000,000 Bank)
    const testInvNumber = `REC-TEST-${Date.now()}`;
    const testCashAmt = 2000000;
    const testBankAmt = 3000000;
    const testTotalAmt = testCashAmt + testBankAmt;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: testInvNumber,
        category: 'SALES_RECEIPT',
        date: new Date(),
        buyerName: 'Test Buyer Ahmed Khan',
        buyerPhone: '03001234567',
        sellerName: 'Test Seller Al Asr',
        vehicleMaker: 'Toyota',
        vehicleModel: 'Fortuner Legender',
        carYear: '2023',
        chassisNumber: 'GUN156-9998887',
        totalPrice: String(testTotalAmt),
        saleAmount: String(testTotalAmt),
        paymentMethod: 'SPLIT',
        bankAccountId: testBank.id,
        cashAmountReceived: String(testCashAmt),
        bankAmountReceived: String(testBankAmt),
        approvalStatus: 'PENDING', // Super Admin created it -> Pending
        createdBy: superAdmin.id
      }
    });

    console.log(`✅ Step 1: Super Admin generated Sales Receipt #${newInvoice.invoiceNumber} for PKR ${testTotalAmt.toLocaleString()}. Approval Status: ${newInvoice.approvalStatus}`);

    // Call syncInvoiceLedgerTransactions (simulating post-create sync for PENDING invoice)
    await syncInvoiceLedgerTransactions(newInvoice.id, superAdmin.id);

    // 4. Verify that NO transactions were created and balances DID NOT CHANGE!
    const txnsPending = await prisma.transaction.findMany({
      where: { referenceId: newInvoice.id }
    });

    const cashAfterPending = (await prisma.account.findUnique({ where: { id: cashSafe.id } })).currentBalance;
    const bankAfterPending = (await prisma.account.findUnique({ where: { id: testBank.id } })).currentBalance;

    if (txnsPending.length === 0 && cashAfterPending === initialCashBalance && bankAfterPending === initialBankBalance) {
      console.log('🛡️ Step 2 Passed: Gating active! 0 transactions posted. Cash & Bank balances unchanged while PENDING.');
    } else {
      throw new Error(`❌ Financial Gate Failure: Found ${txnsPending.length} transactions or balances changed before approval! Cash diff: ${cashAfterPending - initialCashBalance}, Bank diff: ${bankAfterPending - initialBankBalance}`);
    }

    // 5. Accounts Head reviews and approves the sale!
    console.log('📝 Step 3: Accounts Head reviewing and approving the sale...');
    const approvedInvoice = await prisma.invoice.update({
      where: { id: newInvoice.id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: accountsHead.id,
        approvedAt: new Date(),
        approvalNotes: 'Verified with physical cash safe voucher and Meezan Bank online deposit confirmation.'
      }
    });

    // Execute sync now that approvalStatus is APPROVED
    await syncInvoiceLedgerTransactions(approvedInvoice.id, accountsHead.id);

    // 6. Verify that transactions ARE created and Cash & Bank accounts ARE credited!
    const txnsApproved = await prisma.transaction.findMany({
      where: { referenceId: newInvoice.id },
      include: { entries: true }
    });

    const cashAfterApproved = (await prisma.account.findUnique({ where: { id: cashSafe.id } })).currentBalance;
    const bankAfterApproved = (await prisma.account.findUnique({ where: { id: testBank.id } })).currentBalance;

    console.log(`📊 Balances After Approval -> Cash in Hand: PKR ${cashAfterApproved.toLocaleString()} (+${(cashAfterApproved - initialCashBalance).toLocaleString()}) | Bank: PKR ${bankAfterApproved.toLocaleString()} (+${(bankAfterApproved - initialBankBalance).toLocaleString()})`);

    if (
      txnsApproved.length > 0 &&
      cashAfterApproved === initialCashBalance + testCashAmt &&
      bankAfterApproved === initialBankBalance + testBankAmt
    ) {
      console.log('🎉 Step 4 Passed: Upon Accounts Head approval, exact amounts posted to Cash Safe (+20 Lac) and Bank Account (+30 Lac)!');
    } else {
      throw new Error(`❌ Balance Credit Failure: Expected Cash +${testCashAmt}, Bank +${testBankAmt}. Got Cash +${cashAfterApproved - initialCashBalance}, Bank +${bankAfterApproved - initialBankBalance}`);
    }

    // 7. Test Rejection / Reversal workflow
    console.log('🔄 Step 5: Testing rejection and ledger reversal...');
    const rejectedInvoice = await prisma.invoice.update({
      where: { id: newInvoice.id },
      data: {
        approvalStatus: 'REJECTED',
        approvedById: accountsHead.id,
        approvedAt: new Date(),
        approvalNotes: 'Reversing test voucher.'
      }
    });

    await syncInvoiceLedgerTransactions(rejectedInvoice.id, accountsHead.id);

    const txnsAfterReject = await prisma.transaction.findMany({
      where: { referenceId: newInvoice.id }
    });

    const cashAfterReject = (await prisma.account.findUnique({ where: { id: cashSafe.id } })).currentBalance;
    const bankAfterReject = (await prisma.account.findUnique({ where: { id: testBank.id } })).currentBalance;

    if (
      txnsAfterReject.length === 0 &&
      cashAfterReject === initialCashBalance &&
      bankAfterReject === initialBankBalance
    ) {
      console.log('✅ Step 6 Passed: Rejection successfully rolled back ledger transactions and restored original balances.');
    } else {
      throw new Error('❌ Rejection rollback failure!');
    }

    // Clean up test invoice
    await prisma.invoice.delete({ where: { id: newInvoice.id } });
    console.log('✨ All workflow tests passed successfully! 100% verification complete.');

  } catch (error) {
    console.error('💥 Test Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflow();
