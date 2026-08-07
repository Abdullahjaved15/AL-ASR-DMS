const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function smartParseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'un-assigned') return null;
  const parts = dateStr.split(/[-/.]/).map(p => p.trim());
  if (parts.length !== 3) return null;

  let p1 = parseInt(parts[0], 10);
  let p2 = parseInt(parts[1], 10);
  let p3 = parseInt(parts[2], 10);

  if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;

  let year, month, day;

  if (p1 > 1000) {
    // YYYY-MM-DD or YYYY-DD-MM
    year = p1;
    if (p2 > 12) { day = p2; month = p3; }
    else { month = p2; day = p3; }
  } else if (p3 > 1000) {
    year = p3;
    if (p1 > 12) {
      // p1 is day (e.g. 22-10-2025 -> Day: 22, Month: 10)
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      // p2 is day (e.g. 05-18-2026 -> Month: 5, Day: 18)
      month = p1;
      day = p2;
    } else {
      // Both p1 <= 12 and p2 <= 12 (e.g., 08-11-2025 or 03-07-2026)
      // In Pakistani sheets with DD-MM-YYYY preference: p1 = Day, p2 = Month
      day = p1;
      month = p2;
    }
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  console.log('--- RECHECKING & RE-PARSING ALL SELLER & BUYER DATES ---');

  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true } });
  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true } });

  const sellerUpdates = [];
  let sellerFixed = 0;
  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      // Prefer Column [13] (Assign Date) if valid date, fallback to Column [1] (Creation Date)
      const rawAssignDate = parts[13];
      const rawCreateDate = parts[1];

      const parsedDate = smartParseDate(rawAssignDate) || smartParseDate(rawCreateDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        sellerFixed++;
        sellerUpdates.push(
          prisma.seller.update({
            where: { id: s.id },
            data: { createdAt: parsedDate }
          })
        );
      }
    }
  }

  console.log(`Executing ${sellerUpdates.length} seller date corrections (Out of ${sellers.length} total sellers)...`);
  if (sellerUpdates.length > 0) {
    await prisma.$transaction(sellerUpdates);
  }

  const buyerUpdates = [];
  let buyerFixed = 0;
  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const rawAssignDate = parts[13];
      const rawCreateDate = parts[1];

      const parsedDate = smartParseDate(rawAssignDate) || smartParseDate(rawCreateDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        buyerFixed++;
        buyerUpdates.push(
          prisma.buyer.update({
            where: { id: b.id },
            data: { createdAt: parsedDate }
          })
        );
      }
    }
  }

  console.log(`Executing ${buyerUpdates.length} buyer date corrections (Out of ${buyers.length} total buyers)...`);
  if (buyerUpdates.length > 0) {
    await prisma.$transaction(buyerUpdates);
  }

  console.log(`🎉 SUCCESS: Fixed dates for ${sellerFixed} sellers and ${buyerFixed} buyers!`);
}

main().finally(() => prisma.$disconnect());
