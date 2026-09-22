require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/config/db');

async function inspectLatestTransactions() {
  const txns = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      entries: {
        include: {
          account: true
        }
      }
    }
  });

  console.log(`Found ${txns.length} latest transactions:`);
  txns.forEach((t, i) => {
    console.log(`\n#${i + 1} ID: ${t.id}`);
    console.log(`  Txn Number: ${t.transactionNumber}`);
    console.log(`  Type: ${t.type} | Date: ${t.date} | Amount: PKR ${t.amount.toLocaleString()}`);
    console.log(`  Description: ${t.description}`);
    console.log(`  Entries:`);
    t.entries.forEach(e => {
      console.log(`    - [${e.type}] PKR ${e.amount.toLocaleString()} -> ${e.account?.name} (${e.account?.code})`);
    });
  });
}

inspectLatestTransactions()
  .catch(err => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
