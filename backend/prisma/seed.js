const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all dummy data and initializing clean database...');

  // Reset all data
  await prisma.activityLog.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.sellerImage.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.user.deleteMany();

  const adminName = process.env.ADMIN_NAME || 'AL ASR Administrator';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dealership.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminPhone = process.env.ADMIN_PHONE || '+92 300 1234567';

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  // Create single clean Admin user
  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: hashedAdminPassword,
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  // Log system initialization
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_CLEAN_INIT',
      details: `Initialized clean AL ASR Dealership system. Default Admin created (${admin.email}).`
    }
  });

  console.log(`✅ Admin account created: ${admin.email}`);
  console.log('🎉 Database is completely clean! All dummy sellers, buyers, deals, and salesmen purged.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
