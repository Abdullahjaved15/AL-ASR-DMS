const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function seedAccountsStaff() {
  console.log('👤 Seeding Accounts Staff Credentials...');

  const passwordHash = await bcrypt.hash('Accounts123!', 10);

  // 1. Accounts Head
  const accountsHead = await prisma.user.upsert({
    where: { email: 'accountshead@alasr.com' },
    update: {
      role: 'ACCOUNTS_HEAD',
      status: 'ACTIVE',
      password: passwordHash
    },
    create: {
      name: 'Accounts Head (Finance Manager)',
      email: 'accountshead@alasr.com',
      phone: '0300-1122334',
      password: passwordHash,
      role: 'ACCOUNTS_HEAD',
      status: 'ACTIVE'
    }
  });

  // 2. Accountant
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@alasr.com' },
    update: {
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
      password: passwordHash
    },
    create: {
      name: 'Showroom Accountant (Accounts Officer)',
      email: 'accountant@alasr.com',
      phone: '0300-5566778',
      password: passwordHash,
      role: 'ACCOUNTANT',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Accounts Staff Accounts Created:');
  console.log(`  1. ACCOUNTS HEAD:`);
  console.log(`     Email:    accountshead@alasr.com`);
  console.log(`     Password: Accounts123!`);
  console.log(`     Role:     ${accountsHead.role}`);
  console.log(`  2. ACCOUNTANT:`);
  console.log(`     Email:    accountant@alasr.com`);
  console.log(`     Password: Accounts123!`);
  console.log(`     Role:     ${accountant.role}`);
}

seedAccountsStaff()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
