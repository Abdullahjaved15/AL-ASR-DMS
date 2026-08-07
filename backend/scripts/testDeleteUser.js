const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testUserDeletion() {
  console.log('--- TESTING USER DELETION WITH CONNECTED LEADS & LOGS ---');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin found!');
    return;
  }

  // 1. Create a dummy test user
  const hashedPassword = await bcrypt.hash('Test1234!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Temp Test Salesman',
      email: 'temptest@dealership.com',
      phone: '+92 300 9999999',
      password: hashedPassword,
      role: 'SALESMAN',
      status: 'ACTIVE'
    }
  });
  console.log(`Created test user: ${testUser.name} (${testUser.id})`);

  // 2. Attach some leads, activity logs, etc. to testUser
  const buyer = await prisma.buyer.create({
    data: {
      createdBy: testUser.id,
      assignedTo: testUser.id,
      vehicle: 'Toyota',
      model: 'Corolla Test',
      year: 2023,
      color: 'White',
      mileage: 10000,
      budget: 5000000,
      buyerName: 'Test Buyer',
      buyerPhone: '0300-1111111',
      buyerCity: 'Lahore',
      leadSource: 'Test'
    }
  });
  console.log(`Created connected buyer lead ID: ${buyer.id}`);

  await prisma.activityLog.create({
    data: {
      userId: testUser.id,
      action: 'TEST_ACTION',
      details: 'Test activity log entry'
    }
  });

  // 3. Simulate deleteUser transaction logic
  console.log(`Simulating delete logic for user ID: ${testUser.id}...`);

  await prisma.$transaction(async (tx) => {
    await tx.seller.updateMany({ where: { assignedTo: testUser.id }, data: { assignedTo: null } });
    await tx.buyer.updateMany({ where: { assignedTo: testUser.id }, data: { assignedTo: null } });

    await tx.seller.updateMany({ where: { createdBy: testUser.id }, data: { createdBy: admin.id } });
    await tx.buyer.updateMany({ where: { createdBy: testUser.id }, data: { createdBy: admin.id } });

    await tx.activityLog.deleteMany({ where: { userId: testUser.id } });
    await tx.collaboration.deleteMany({
      where: { OR: [{ primarySalesmanId: testUser.id }, { partnerSalesmanId: testUser.id }] }
    });
    await tx.deal.deleteMany({ where: { salesmanId: testUser.id } });

    await tx.user.delete({ where: { id: testUser.id } });
  });

  console.log('✅ User deletion test completed successfully!');

  // Verify buyer lead was unassigned and createdBy reassigned to admin
  const updatedBuyer = await prisma.buyer.findUnique({ where: { id: buyer.id } });
  console.log(`Updated buyer lead: assignedTo=${updatedBuyer.assignedTo}, createdBy=${updatedBuyer.createdBy}`);

  // Clean up test buyer lead
  await prisma.buyer.delete({ where: { id: buyer.id } });
  console.log('Cleaned up test buyer lead.');
}

testUserDeletion().catch(console.error).finally(() => prisma.$disconnect());
