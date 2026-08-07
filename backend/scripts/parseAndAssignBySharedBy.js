const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function matchSalesman(rawName, salesmenList) {
  if (!rawName) return null;
  const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const sm of salesmenList) {
    const smCleaned = sm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const smEmailCleaned = sm.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleaned.includes(smCleaned) || smCleaned.includes(cleaned) || cleaned.includes(smEmailCleaned)) {
      return sm;
    }
  }
  return null;
}

async function main() {
  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN' }
  });

  console.log(`Loaded ${salesmen.length} salesmen from database.`);

  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true } });
  let sellerMatchCount = 0;

  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      // Shared By person is at parts[10]
      const sharedByName = parts[10];
      const handledByName = parts[12];
      
      const targetName = sharedByName && !['branch walk-in', 'personal reference', 'social media', 'website', '-'].includes(sharedByName.toLowerCase())
        ? sharedByName
        : handledByName;

      const matchedSM = matchSalesman(targetName, salesmen);
      if (matchedSM) {
        await prisma.seller.update({
          where: { id: s.id },
          data: {
            assignedTo: matchedSM.id,
            createdBy: matchedSM.id,
            leadReference: targetName || matchedSM.name
          }
        });
        sellerMatchCount++;
      }
    }
  }

  console.log(`✅ Updated ${sellerMatchCount} / ${sellers.length} sellers to exact Lead Shared By salesmen!`);

  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true } });
  let buyerMatchCount = 0;

  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const sharedByName = parts[10];
      const handledByName = parts[12];

      const targetName = sharedByName && !['branch walk-in', 'personal reference', 'social media', 'website', '-'].includes(sharedByName.toLowerCase())
        ? sharedByName
        : handledByName;

      const matchedSM = matchSalesman(targetName, salesmen);
      if (matchedSM) {
        await prisma.buyer.update({
          where: { id: b.id },
          data: {
            assignedTo: matchedSM.id,
            createdBy: matchedSM.id,
            leadReference: targetName || matchedSM.name
          }
        });
        buyerMatchCount++;
      }
    }
  }

  console.log(`✅ Updated ${buyerMatchCount} / ${buyers.length} buyers to exact Lead Shared By salesmen!`);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
