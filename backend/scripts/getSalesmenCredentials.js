const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Super Admin Account
  let superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        name: 'AL ASR Super Administrator',
        email: 'admin@dealership.com',
        phone: '+92 300 1111111',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
  } else {
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: hashedPassword, status: 'ACTIVE' }
    });
  }

  // 2. Standard Admin Account
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'AL ASR Standard Admin',
        email: 'admin@alasrmotors.com',
        phone: '+92 300 2222222',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, status: 'ACTIVE' }
    });
  }

  // 3. Salesmen Accounts
  let salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN' }
  });

  if (salesmen.length === 0) {
    const demoSalesman = await prisma.user.create({
      data: {
        name: 'Tariq Mehmood (Sales Executive)',
        email: 'salesman@alasrmotors.com',
        phone: '+92 300 3333333',
        password: hashedPassword,
        role: 'SALESMAN',
        status: 'ACTIVE'
      }
    });
    salesmen = [demoSalesman];
  } else {
    // Reset passwords for existing active salesmen to defaultPassword for user convenience
    for (const sm of salesmen) {
      await prisma.user.update({
        where: { id: sm.id },
        data: { password: hashedPassword, status: 'ACTIVE' }
      });
    }
  }

  console.log('=== ACCOUNT CREDENTIALS SUMMARY ===');
  console.log(`👑 SUPER ADMIN: ${superAdmin.email} | Password: ${defaultPassword}`);
  console.log(`🛡️ ADMIN: ${admin.email} | Password: ${defaultPassword}`);
  console.log('💼 SALESMEN:');
  salesmen.forEach(sm => {
    console.log(`   - Name: ${sm.name} | Email: ${sm.email} | Password: ${defaultPassword}`);
  });
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
