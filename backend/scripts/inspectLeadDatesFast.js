const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parsePakDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);

    if (p1 > 1000) {
      return new Date(Date.UTC(p1, p2 - 1, p3));
    } else if (p3 > 1000) {
      if (p1 > 12) {
        return new Date(Date.UTC(p3, p2 - 1, p1));
      } else if (p2 > 12) {
        return new Date(Date.UTC(p3, p1 - 1, p2));
      } else {
        return new Date(Date.UTC(p3, p2 - 1, p1));
      }
    }
  }
  return null;
}

async function main() {
  console.log('Starting fast batch lead date updates...');
  const sellers = await prisma.seller.findMany({
    select: { id: true, comments: true }
  });
  const buyers = await prisma.buyer.findMany({
    select: { id: true, comments: true }
  });

  const sellerUpdates = [];
  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      const rawDate = parts[1];
      const parsed = parsePakDate(rawDate);
      if (parsed && !isNaN(parsed.getTime())) {
        sellerUpdates.push(
          prisma.seller.update({
            where: { id: s.id },
            data: { createdAt: parsed }
          })
        );
      }
    }
  }

  const buyerUpdates = [];
  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const rawDate = parts[1];
      const parsed = parsePakDate(rawDate);
      if (parsed && !isNaN(parsed.getTime())) {
        buyerUpdates.push(
          prisma.buyer.update({
            where: { id: b.id },
            data: { createdAt: parsed }
          })
        );
      }
    }
  }

  console.log(`Executing ${sellerUpdates.length} seller date updates...`);
  await prisma.$transaction(sellerUpdates);

  console.log(`Executing ${buyerUpdates.length} buyer date updates...`);
  await prisma.$transaction(buyerUpdates);

  console.log('✅ ALL LEAD DATES BATCH UPDATED SUCCESSFULLY!');
}

main().finally(() => prisma.$disconnect());
