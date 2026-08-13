const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔑 Seeding user role accounts...');

  const usersToCreate = [
    {
      name: 'Super Admin User',
      email: 'superadmin@alasr.com',
      phone: '03000000001',
      password: 'SuperAdmin123!',
      role: 'SUPER_ADMIN'
    },
    {
      name: 'Accounts Head User',
      email: 'accounts@alasr.com',
      phone: '03000000002',
      password: 'Accounts123!',
      role: 'ACCOUNTS_HEAD'
    },
    {
      name: 'Sales Head User',
      email: 'saleshead@alasr.com',
      phone: '03000000003',
      password: 'SalesHead123!',
      role: 'SALES_HEAD'
    },
    {
      name: 'Salesman User',
      email: 'salesman@alasr.com',
      phone: '03000000004',
      password: 'Salesman123!',
      role: 'SALESMAN'
    },
    {
      name: 'Main Admin',
      email: 'admin@dealership.com',
      phone: '03001234567',
      password: 'Admin123!',
      role: 'SUPER_ADMIN'
    }
  ];

  for (const u of usersToCreate) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hashedPassword,
        status: 'ACTIVE'
      },
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: hashedPassword,
        role: u.role,
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Upserted ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
