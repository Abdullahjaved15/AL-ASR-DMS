const prisma = require('../src/config/db');

async function testInvoice() {
  try {
    console.log('🔍 Testing connection and fetching users...');
    const user = await prisma.user.findFirst();
    console.log('👤 Found user:', user ? user.email : 'None');

    if (!user) {
      console.log('❌ No user found to create invoice.');
      return;
    }

    console.log('📝 Creating test invoice...');
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `TEST-${Date.now()}`,
        date: new Date(),
        registrationNo: 'LEA-2026',
        sellerName: 'Test Seller',
        buyerName: 'Test Buyer',
        vehicleMaker: 'Toyota',
        vehicleModel: 'Corolla',
        totalPrice: 5000000,
        advanceAmount: 1000000,
        remainingAmount: 4000000,
        customerName: 'Test Buyer',
        carVehicle: 'Toyota',
        carModel: 'Corolla',
        saleAmount: 5000000,
        totalAmount: 5000000,
        createdBy: user.id
      }
    });

    console.log('✅ Created invoice successfully:', invoice.invoiceNumber);
  } catch (err) {
    console.error('❌ Failed to create invoice:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testInvoice();
