const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanName(raw) {
  if (!raw || raw === '-' || raw.toLowerCase() === 'un-known' || raw.toLowerCase() === 'null') return null;
  let name = raw.trim();
  if (!name.toLowerCase().startsWith('mr.') && !name.toLowerCase().startsWith('ma\'am') && !name.toLowerCase().startsWith('mrs.')) {
    // Normalize names like "Atif", "AHSAN", "subhan" -> "Mr. Atif", "Mr. Ahsan", "Mr. Subhan"
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    name = `Mr. ${capitalized}`;
  }
  return name;
}

async function main() {
  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true } });
  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true } });

  const uniqueSharedBy = new Set();
  const uniqueHandledBy = new Set();

  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      if (parts.length >= 11) {
        const sharedBy = cleanName(parts[10]);
        if (sharedBy) uniqueSharedBy.add(sharedBy);
      }
      if (parts.length >= 13) {
        const handledBy = cleanName(parts[12]);
        if (handledBy) uniqueHandledBy.add(handledBy);
      }
    }
  }

  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      if (parts.length >= 11) {
        const sharedBy = cleanName(parts[10]);
        if (sharedBy) uniqueSharedBy.add(sharedBy);
      }
      if (parts.length >= 13) {
        const handledBy = cleanName(parts[12]);
        if (handledBy) uniqueHandledBy.add(handledBy);
      }
    }
  }

  console.log('Unique Shared By Persons:', Array.from(uniqueSharedBy));
  console.log('Unique Handled By Persons:', Array.from(uniqueHandledBy));
}

main().finally(() => prisma.$disconnect());
