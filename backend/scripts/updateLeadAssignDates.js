const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parsePakDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'un-assigned') return null;
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
  console.log('Parsing Lead Assign Dates (Column [13]) from raw PDF dataset...');

  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true } });
  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true } });

  const sellerUpdates = [];
  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      // Column [13] is Lead Assign Date, Column [1] is Lead Entry Date
      const assignDateRaw = parts[13] || parts[1];
      const parsedAssignDate = parsePakDate(assignDateRaw) || parsePakDate(parts[1]);

      if (parsedAssignDate && !isNaN(parsedAssignDate.getTime())) {
        sellerUpdates.push(
          prisma.seller.update({
            where: { id: s.id },
            data: { createdAt: parsedAssignDate }
          })
        );
      }
    }
  }

  const buyerUpdates = [];
  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const assignDateRaw = parts[13] || parts[1];
      const parsedAssignDate = parsePakDate(assignDateRaw) || parsePakDate(parts[1]);

      if (parsedAssignDate && !isNaN(parsedAssignDate.getTime())) {
        buyerUpdates.push(
          prisma.buyer.update({
            where: { id: b.id },
            data: { createdAt: parsedAssignDate }
          })
        );
      }
    }
  }

  console.log(`Executing ${sellerUpdates.length} seller assign date updates...`);
  if (sellerUpdates.length > 0) {
    await prisma.$transaction(sellerUpdates);
  }

  console.log(`Executing ${buyerUpdates.length} buyer assign date updates...`);
  if (buyerUpdates.length > 0) {
    await prisma.$transaction(buyerUpdates);
  }

  console.log('✅ ALL LEAD ASSIGN DATES SUCCESSFULLY UPDATED IN DATABASE!');
}

main().finally(() => prisma.$disconnect());
