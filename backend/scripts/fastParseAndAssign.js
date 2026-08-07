const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function matchSalesman(rawName, salesmenList) {
  if (!rawName) return null;
  const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['branchwalkin', 'personalreference', 'socialmedia', 'website', '-'].includes(cleaned)) return null;

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
  const salesmen = await prisma.user.findMany({ where: { role: 'SALESMAN' } });
  console.log(`Loaded ${salesmen.length} salesmen.`);

  const sellers = await prisma.seller.findMany({ select: { id: true, comments: true } });
  const sellerUpdates = {};

  for (const s of sellers) {
    if (s.comments && s.comments.includes('\t')) {
      const parts = s.comments.split('\t').map(p => p.trim());
      const sharedByName = parts[10];
      const handledByName = parts[12];
      
      const targetName = (sharedByName && !['branch walk-in', 'personal reference', 'social media', 'website', '-'].includes(sharedByName.toLowerCase()))
        ? sharedByName
        : handledByName;

      const matchedSM = matchSalesman(targetName, salesmen);
      if (matchedSM) {
        if (!sellerUpdates[matchedSM.id]) sellerUpdates[matchedSM.id] = { ids: [], refName: targetName || matchedSM.name };
        sellerUpdates[matchedSM.id].ids.push(s.id);
      }
    }
  }

  for (const [smId, obj] of Object.entries(sellerUpdates)) {
    await prisma.seller.updateMany({
      where: { id: { in: obj.ids } },
      data: { assignedTo: smId, createdBy: smId, leadReference: obj.refName }
    });
  }
  console.log('✅ Bulk updated sellers by shared by!');

  const buyers = await prisma.buyer.findMany({ select: { id: true, comments: true } });
  const buyerUpdates = {};

  for (const b of buyers) {
    if (b.comments && b.comments.includes('\t')) {
      const parts = b.comments.split('\t').map(p => p.trim());
      const sharedByName = parts[10];
      const handledByName = parts[12];

      const targetName = (sharedByName && !['branch walk-in', 'personal reference', 'social media', 'website', '-'].includes(sharedByName.toLowerCase()))
        ? sharedByName
        : handledByName;

      const matchedSM = matchSalesman(targetName, salesmen);
      if (matchedSM) {
        if (!buyerUpdates[matchedSM.id]) buyerUpdates[matchedSM.id] = { ids: [], refName: targetName || matchedSM.name };
        buyerUpdates[matchedSM.id].ids.push(b.id);
      }
    }
  }

  for (const [smId, obj] of Object.entries(buyerUpdates)) {
    await prisma.buyer.updateMany({
      where: { id: { in: obj.ids } },
      data: { assignedTo: smId, createdBy: smId, leadReference: obj.refName }
    });
  }
  console.log('✅ Bulk updated buyers by shared by!');
}

main().finally(() => prisma.$disconnect());
