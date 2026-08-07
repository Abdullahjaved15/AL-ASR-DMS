const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Ensure SUPER_ADMIN account exists
  let superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (superAdmin) {
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: hashedPassword, status: 'ACTIVE' }
    });
    console.log(`✅ SUPER ADMIN Account Ready:`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${defaultPassword}`);
  } else {
    superAdmin = await prisma.user.create({
      data: {
        name: 'AL ASR Super Administrator',
        email: 'superadmin@alasrmotors.com',
        phone: '+92 300 1111111',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ SUPER ADMIN Account Created:`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${defaultPassword}`);
  }

  // 2. Ensure regular ADMIN account exists
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, status: 'ACTIVE' }
    });
    console.log(`✅ ADMIN Account Ready:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${defaultPassword}`);
  } else {
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
    console.log(`✅ ADMIN Account Created:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${defaultPassword}`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
