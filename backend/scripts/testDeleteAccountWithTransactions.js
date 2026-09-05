const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const accountController = require('../src/controllers/accountController');

async function testDeleteAccount() {
  console.log('--- Testing Direct Account Deletion with Transactions ---');
  
  // 1. Get user for transaction createdById
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  // 2. Create a test account
  const testCode = `TEST-${Date.now()}`;
  const testAccount = await prisma.account.create({
    data: {
      code: testCode,
      name: 'Test Account With Entries',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      currentBalance: 5000
    }
  });
  console.log(`✅ Created test account: ID=${testAccount.id}, Code=${testAccount.code}`);

  // 3. Create a transaction with an entry linked to this account
  const testTxn = await prisma.transaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}`,
      date: new Date(),
      type: 'JOURNAL',
      amount: 5000,
      description: 'Test entry for account deletion',
      createdById: user.id,
      entries: {
        create: [
          {
            accountId: testAccount.id,
            type: 'DEBIT',
            amount: 5000,
            description: 'Test debit entry'
          }
        ]
      }
    }
  });
  console.log(`✅ Created test transaction ${testTxn.transactionNumber} with entries linked to test account`);

  // 4. Call deleteAccount controller directly (WITHOUT force flag)
  const req = {
    params: { id: testAccount.id },
    query: {},
    user: { id: user.id, role: 'SUPERADMIN' }
  };

  let statusCode = 200;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  await accountController.deleteAccount(req, res);

  if (statusCode !== 200) {
    throw new Error(`deleteAccount failed with status ${statusCode}: ${JSON.stringify(responseData)}`);
  }

  console.log(`✅ deleteAccount succeeded on first click without force prompt: ${JSON.stringify(responseData)}`);

  // 5. Verify account is gone from DB
  const deletedAccountInDb = await prisma.account.findUnique({ where: { id: testAccount.id } });
  if (deletedAccountInDb === null) {
    console.log('✅ Account confirmed deleted from DB');
  } else {
    throw new Error('Account still exists in DB');
  }

  // 6. Verify entry is gone
  const entriesCount = await prisma.transactionEntry.count({ where: { accountId: testAccount.id } });
  if (entriesCount === 0) {
    console.log('✅ Linked transaction entries cleaned up successfully');
  } else {
    throw new Error('Transaction entries still exist');
  }

  console.log('\n🎉 DIRECT ACCOUNT DELETION TEST PASSED! 🎉');
}

testDeleteAccount()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
