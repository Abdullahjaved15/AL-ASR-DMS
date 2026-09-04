const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Deleting all accounts from Chart of Accounts ---');
  
  // 1. Check existing accounts
  const accounts = await prisma.account.findMany();
  console.log(`Found ${accounts.length} accounts to delete.`);

  // 2. Unlink any SecurityCheques bankAccountId
  const updatedCheques = await prisma.securityCheque.updateMany({
    data: { bankAccountId: null }
  });
  console.log(`Unlinked ${updatedCheques.count} security cheques.`);

  // 3. Delete transaction entries associated with accounts
  const deletedEntries = await prisma.transactionEntry.deleteMany({});
  console.log(`Deleted ${deletedEntries.count} transaction entries.`);

  // 4. Delete transactions
  const deletedTx = await prisma.transaction.deleteMany({});
  console.log(`Deleted ${deletedTx.count} transactions.`);

  // 5. Delete all accounts
  const deletedAccounts = await prisma.account.deleteMany({});
  console.log(`Successfully deleted ${deletedAccounts.count} accounts from Chart of Accounts!`);
  
  const remaining = await prisma.account.count();
  console.log(`Remaining accounts in DB: ${remaining}`);
}

main()
  .catch(err => {
    console.error('Error deleting accounts:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
