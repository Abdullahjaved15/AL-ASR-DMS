const prisma = require('../src/config/db');
const { deleteAccount } = require('../src/controllers/accountController');

async function testDeleteWithTransactions() {
  console.log('🧪 Starting Verification: Delete Ledger with Associated Transactions...');

  try {
    // 1. Fetch or create Accounts Head user
    let accountsHead = await prisma.user.findFirst({ where: { role: 'ACCOUNTS_HEAD' } });
    if (!accountsHead) {
      accountsHead = await prisma.user.create({
        data: {
          name: 'Accounts Head Officer',
          email: `accounts_head_${Date.now()}@alasr.com`,
          password: 'hashed_password',
          role: 'ACCOUNTS_HEAD',
          status: 'ACTIVE'
        }
      });
    }

    // 2. Create a test ledger account
    const testCode = `TEST-${Date.now().toString().slice(-6)}`;
    const testAccount = await prisma.account.create({
      data: {
        code: testCode,
        name: `Test Vendor Ledger ${testCode}`,
        type: 'LIABILITY',
        subType: 'VENDOR',
        openingBalance: 50000,
        currentBalance: 50000,
        description: 'Temporary ledger for testing deletion with active transactions',
        createdBy: accountsHead.id
      }
    });

    console.log(`✅ Step 1: Created Test Account "${testAccount.name}" (ID: ${testAccount.id}, Code: ${testAccount.code})`);

    // 3. Create transactions and entries attached to this account
    const txn1 = await prisma.transaction.create({
      data: {
        transactionNumber: `TXN-TEST-1-${Date.now()}`,
        date: new Date(),
        type: 'PAYMENT_VOUCHER',
        amount: 25000,
        description: `Payment to ${testAccount.name}`,
        referenceType: 'MANUAL',
        createdById: accountsHead.id,
        entries: {
          create: [
            {
              accountId: testAccount.id,
              type: 'DEBIT',
              amount: 25000,
              description: 'Payment entry 1'
            }
          ]
        }
      }
    });

    const txn2 = await prisma.transaction.create({
      data: {
        transactionNumber: `TXN-TEST-2-${Date.now()}`,
        date: new Date(),
        type: 'JOURNAL',
        amount: 15000,
        description: `Adjustment for ${testAccount.name}`,
        referenceType: 'MANUAL',
        createdById: accountsHead.id,
        entries: {
          create: [
            {
              accountId: testAccount.id,
              type: 'CREDIT',
              amount: 15000,
              description: 'Adjustment entry 2'
            }
          ]
        }
      }
    });

    // 4. Also link a security cheque and stock item to this account
    const cheque = await prisma.securityCheque.create({
      data: {
        chequeNumber: `CHQ-TEST-${Date.now().toString().slice(-4)}`,
        type: 'ISSUED',
        bankAccountId: testAccount.id,
        bankName: 'Test Bank',
        partyName: 'Test Party',
        amount: 50000,
        dueDate: new Date(Date.now() + 86400000 * 30),
        createdById: accountsHead.id
      }
    });

    const stock = await prisma.accountsStock.create({
      data: {
        vehicle: 'Toyota Corolla',
        model: 'Altis Grande',
        year: '2022',
        color: 'White',
        askingPrice: '4500000',
        purchasePrice: '4000000',
        ledgerAccountId: testAccount.id,
        ledgerAccountName: testAccount.name
      }
    });

    // Verify initial transaction entry count
    const entryCountBefore = await prisma.transactionEntry.count({
      where: { accountId: testAccount.id }
    });
    console.log(`📊 Step 2: Attached ${entryCountBefore} transaction entries, 1 Security Cheque, and 1 Accounts Stock link to the ledger.`);

    if (entryCountBefore !== 2) {
      throw new Error(`Expected 2 entries, found ${entryCountBefore}`);
    }

    // 5. Simulate Accounts Head deleting this ledger via deleteAccount controller
    console.log('🗑️ Step 3: Executing deleteAccount as Accounts Head...');

    const req = {
      params: { id: testAccount.id },
      user: accountsHead
    };

    let responseStatus = 200;
    let responseData = null;

    const res = {
      status: (code) => {
        responseStatus = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return data;
      }
    };

    await deleteAccount(req, res);

    if (responseStatus !== 200) {
      throw new Error(`Deletion failed with status ${responseStatus}: ${JSON.stringify(responseData)}`);
    }

    console.log(`🎉 Step 4: Delete response received: "${responseData.message}"`);

    // 6. Verify that the account is deleted from DB
    const deletedAccountCheck = await prisma.account.findUnique({ where: { id: testAccount.id } });
    if (deletedAccountCheck) {
      throw new Error('❌ Account was NOT deleted from database!');
    }
    console.log('✅ Step 5: Account is confirmed deleted from database.');

    // 7. Verify that all transaction entries for this account are removed
    const remainingEntries = await prisma.transactionEntry.findMany({ where: { accountId: testAccount.id } });
    if (remainingEntries.length > 0) {
      throw new Error(`❌ Found ${remainingEntries.length} remaining transaction entries for deleted account!`);
    }
    console.log('✅ Step 6: All associated transaction entries were cleanly removed.');

    // 8. Verify foreign references are safely unlinked (set to null)
    const updatedCheque = await prisma.securityCheque.findUnique({ where: { id: cheque.id } });
    const updatedStock = await prisma.accountsStock.findUnique({ where: { id: stock.id } });

    if (updatedCheque.bankAccountId !== null) {
      throw new Error('❌ Security Cheque was not unlinked!');
    }
    if (updatedStock.ledgerAccountId !== null) {
      throw new Error('❌ Accounts Stock was not unlinked!');
    }

    console.log('✅ Step 7: Linked Security Cheques and Accounts Stock were safely unlinked without breaking foreign keys.');

    // Clean up temporary test data
    await prisma.securityCheque.delete({ where: { id: cheque.id } });
    await prisma.accountsStock.delete({ where: { id: stock.id } });

    console.log('✨ All Verification Checks Passed! Accounts Head can now delete any ledger with transactions seamlessly.');

  } catch (error) {
    console.error('💥 Test Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteWithTransactions();
