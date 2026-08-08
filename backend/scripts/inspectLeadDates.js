const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parsePakDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  // Expected formats: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);

    if (p1 > 1000) {
      // YYYY-MM-DD
      return new Date(p1, p2 - 1, p3);
    } else if (p3 > 1000) {
      // DD-MM-YYYY or MM-DD-YYYY
      if (p1 > 12) {
        // p1 is day, p2 is month
        return new Date(p3, p2 - 1, p1);
      } else if (p2 > 12) {
        // p2 is day, p1 is month
        return new Date(p3, p1 - 1, p2);
      } else {
        // default DD-MM-YYYY
        return new Date(p3, p2 - 1, p1);
      }
    }
  }
  return null;
}

async function main() {
  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true, createdAt: true } });
  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true, createdAt: true } });

  let sellerParsed = 0;
  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      const rawDate = parts[1];
      const parsed = parsePakDate(rawDate);
      if (parsed && !isNaN(parsed.getTime())) {
        sellerParsed++;
        await prisma.seller.update({
          where: { id: s.id },
          data: { createdAt: parsed }
        });
      }
    }
  }
  console.log(`✅ Parsed and updated ${sellerParsed} / ${sellers.length} seller lead dates!`);

  let buyerParsed = 0;
  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const rawDate = parts[1];
      const parsed = parsePakDate(rawDate);
      if (parsed && !isNaN(parsed.getTime())) {
        buyerParsed++;
        await prisma.buyer.update({
          where: { id: b.id },
          data: { createdAt: parsed }
        });
      }
    }
  }
  console.log(`✅ Parsed and updated ${buyerParsed} / ${buyers.length} buyer lead dates!`);
}

main().finally(() => prisma.$disconnect());
