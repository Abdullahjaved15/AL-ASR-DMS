const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total Users:', users.length);
  console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })));
}

main().finally(() => prisma.$disconnect());
