require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/config/db');

async function inspectDetails() {
  const txns = await prisma.transaction.findMany({
    where: {
      transactionNumber: { in: ['RV-20260922-0006', 'OB-20260922-0005', 'OB-20260922-0004', 'RV-20260922-0003'] }
    },
    include: {
      entries: {
        include: { account: true }
      }
    }
  });

  for (const t of txns) {
    console.log(`\n==================================================`);
    console.log(`Txn: ${t.transactionNumber} (${t.type}) | Amount: PKR ${t.amount.toLocaleString()} | Date: ${t.date}`);
    console.log(`Desc: ${t.description}`);
    for (const e of t.entries) {
      console.log(`  Entry: [${e.type}] PKR ${e.amount.toLocaleString()} | Account: ${e.account?.name} (${e.account?.code}, ${e.account?.type}/${e.account?.subType}) | CurrentBal: PKR ${e.account?.currentBalance?.toLocaleString()}`);
    }
  }
}

inspectDetails()
  .catch(err => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
