const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users count:', users.length);

  // Promotes any existing ADMIN to SUPER_ADMIN, or creates a default SUPER_ADMIN if none exists
  const existingSuperAdmin = users.find(u => u.role === 'SUPER_ADMIN');
  if (existingSuperAdmin) {
    console.log(`✅ Super Admin already exists: ${existingSuperAdmin.name} (${existingSuperAdmin.email})`);
    return;
  }

  const existingAdmin = users.find(u => u.role === 'ADMIN');
  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { role: 'SUPER_ADMIN' }
    });
    console.log(`✅ Promoted existing Admin ${updated.name} (${updated.email}) to SUPER_ADMIN!`);
  } else if (users.length > 0) {
    const updated = await prisma.user.update({
      where: { id: users[0].id },
      data: { role: 'SUPER_ADMIN', status: 'ACTIVE' }
    });
    console.log(`✅ Set user ${updated.name} (${updated.email}) role to SUPER_ADMIN!`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
