const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'SALESMAN' }
  });

  console.log(`Found ${users.length} salesman user accounts.`);

  for (const u of users) {
    const firstName = u.name.replace(/^(mr\.|ma'am|mrs\.)\s+/i, '').trim().split(' ')[0];
    if (!firstName || firstName.length < 3) continue;

    console.log(`Linking leads for salesman: ${u.name} (Search term: "${firstName}") [ID: ${u.id}]`);

    // Update sellers matching name or leadReference
    const sellerResult = await prisma.seller.updateMany({
      where: {
        OR: [
          { leadReference: { contains: firstName, mode: 'insensitive' } },
          { comments: { contains: firstName, mode: 'insensitive' } }
        ]
      },
      data: {
        assignedTo: u.id,
        createdBy: u.id
      }
    });

    // Update buyers matching name or leadReference
    const buyerResult = await prisma.buyer.updateMany({
      where: {
        OR: [
          { leadReference: { contains: firstName, mode: 'insensitive' } },
          { comments: { contains: firstName, mode: 'insensitive' } }
        ]
      },
      data: {
        assignedTo: u.id,
        createdBy: u.id
      }
    });

    console.log(`  -> Linked ${sellerResult.count} sellers & ${buyerResult.count} buyers to ${u.name}`);
  }

  console.log('✅ Salesman account linking complete!');
}

main().finally(() => prisma.$disconnect());
