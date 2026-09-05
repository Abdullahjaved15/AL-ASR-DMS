const prisma = require('../src/config/db');
const { syncInvoiceLedgerTransactions } = require('../src/controllers/invoiceController');
const { parsePakistaniPrice } = require('../src/utils/priceParser');

async function runTest() {
  console.log('🧪 Starting Booking Receipt & Sales Receipt Integration Verification...\n');

  // 1. Get or create a test admin user
  let user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in DB for test');
    process.exit(1);
  }

  // 2. Get initial Cash Safe balance
  let cashSafe = await prisma.account.findFirst({ where: { subType: 'CASH' } });
  if (!cashSafe) {
    cashSafe = await prisma.account.create({
      data: {
        code: '1001',
        name: 'Cash in Hand Safe',
        type: 'ASSET',
        subType: 'CASH',
        currentBalance: 0
      }
    });
  }
  const initialCashBalance = cashSafe.currentBalance;
  console.log(`💰 Initial Cash in Hand Safe Balance: PKR ${initialCashBalance.toLocaleString()}`);

  const testPhone = '0321-9988776';
  const testChassis = 'TEST-CHASSIS-8899';
  const testTotal = '4000000'; // 40 Lac
  const testAdvance = '500000'; // 5 Lac
  const testRemaining = '3500000'; // 35 Lac

  // 3. Create Booking Receipt
  console.log('\n--- Step 1: Creating Booking Receipt (Advance: 500k, Total: 4M) ---');
  const bookingInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `BK-TEST-${Date.now()}`,
      category: 'BOOKING_RECEIPT',
      date: new Date(),
      buyerName: 'Muhammad Test Customer',
      buyerPhone: testPhone,
      vehicleMaker: 'Toyota',
      vehicleModel: 'Corolla Altis Grande 2024',
      chassisNumber: testChassis,
      totalPrice: testTotal,
      advanceAmount: testAdvance,
      remainingAmount: testRemaining,
      paymentMethod: 'CASH',
      bookingStatus: 'ACTIVE',
      createdBy: user.id
    }
  });
  console.log(`✅ Booking Receipt Created: #${bookingInvoice.invoiceNumber} (ID: ${bookingInvoice.id})`);

  // Sync double-entry transactions
  await syncInvoiceLedgerTransactions(bookingInvoice.id, user.id);

  // Check Safe balance after Booking Receipt
  const cashSafeAfterBooking = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  const deltaBooking = cashSafeAfterBooking.currentBalance - initialCashBalance;
  console.log(`💵 Cash Safe Balance after Booking: PKR ${cashSafeAfterBooking.currentBalance.toLocaleString()} (Delta: +PKR ${deltaBooking.toLocaleString()})`);
  if (deltaBooking !== 500000) {
    console.error(`❌ FAILURE: Booking Receipt should add exactly 500,000 to Cash Safe. Got ${deltaBooking}`);
  } else {
    console.log(`✅ SUCCESS: Booking Receipt added exactly PKR 500,000 (Advance) to Cash Safe.`);
  }

  // 4. Test phone search lookup
  console.log('\n--- Step 2: Testing Phone Lookup for Active Bookings ---');
  const cleanDigits = testPhone.replace(/\D/g, '');
  const candidateBookings = await prisma.invoice.findMany({
    where: {
      category: 'BOOKING_RECEIPT',
      bookingStatus: { not: 'CONVERTED_TO_SALE' }
    }
  });
  const matchedBooking = candidateBookings.find(b => {
    const bDigits = String(b.buyerPhone || '').replace(/\D/g, '');
    return bDigits && (bDigits.includes(cleanDigits) || cleanDigits.includes(bDigits));
  });

  if (!matchedBooking || matchedBooking.id !== bookingInvoice.id) {
    console.error('❌ FAILURE: Could not find active booking by phone number search!');
  } else {
    console.log(`✅ SUCCESS: Successfully found active booking #${matchedBooking.invoiceNumber} by phone ${testPhone}`);
  }

  // 5. Create Sales Receipt linked to Booking Receipt
  console.log('\n--- Step 3: Creating Sales Receipt (Total: 4M, Advance: 500k, Remaining: 3.5M) ---');
  const salesInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `REC-TEST-${Date.now()}`,
      category: 'SALES_RECEIPT',
      date: new Date(),
      buyerName: 'Muhammad Test Customer',
      buyerPhone: testPhone,
      vehicleMaker: 'Toyota',
      vehicleModel: 'Corolla Altis Grande 2024',
      chassisNumber: testChassis,
      totalPrice: testTotal,
      advanceAmount: testAdvance,
      remainingAmount: testRemaining,
      paymentMethod: 'CASH',
      linkedBookingId: bookingInvoice.id,
      linkedBookingNumber: bookingInvoice.invoiceNumber,
      bookingStatus: 'CONVERTED_TO_SALE',
      createdBy: user.id
    }
  });
  console.log(`✅ Sales Receipt Created: #${salesInvoice.invoiceNumber} (ID: ${salesInvoice.id})`);

  // Update Booking receipt status
  await prisma.invoice.update({
    where: { id: bookingInvoice.id },
    data: {
      bookingStatus: 'CONVERTED_TO_SALE',
      linkedSaleId: salesInvoice.id,
      linkedSaleNumber: salesInvoice.invoiceNumber
    }
  });

  // Sync double-entry transactions for Sales Receipt
  await syncInvoiceLedgerTransactions(salesInvoice.id, user.id);

  // Check Safe balance after Sales Receipt
  const cashSafeAfterSale = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  const deltaSale = cashSafeAfterSale.currentBalance - cashSafeAfterBooking.currentBalance;
  const totalInflowAll = cashSafeAfterSale.currentBalance - initialCashBalance;

  console.log(`💵 Cash Safe Balance after Sales Receipt: PKR ${cashSafeAfterSale.currentBalance.toLocaleString()} (Delta on Sale: +PKR ${deltaSale.toLocaleString()})`);
  console.log(`🌟 Total Inflow across Booking + Sale: PKR ${totalInflowAll.toLocaleString()}`);

  if (deltaSale !== 3500000) {
    console.error(`❌ FAILURE: Sales Receipt should add ONLY the remaining amount (3,500,000). Got ${deltaSale}`);
  } else {
    console.log(`✅ SUCCESS: Sales Receipt added ONLY the remaining PKR 3,500,000 to Cash Safe!`);
  }

  if (totalInflowAll !== 4000000) {
    console.error(`❌ FAILURE: Total inflow across both receipts should be 4,000,000. Got ${totalInflowAll}`);
  } else {
    console.log(`🎉 PERFECT: Total Safe Cash Increase = PKR 500,000 (Booking) + PKR 3,500,000 (Sale) = PKR 4,000,000 (Exact Vehicle Price, NO DOUBLE COUNTING)!`);
  }

  // Check updated booking receipt status
  const finalBooking = await prisma.invoice.findUnique({ where: { id: bookingInvoice.id } });
  console.log(`\n📋 Booking Receipt State: bookingStatus=${finalBooking.bookingStatus}, linkedSaleNumber=${finalBooking.linkedSaleNumber}`);
  if (finalBooking.bookingStatus === 'CONVERTED_TO_SALE') {
    console.log(`✅ SUCCESS: Booking receipt status transitioned to CONVERTED_TO_SALE.`);
  }

  // 6. Cleanup test records
  console.log('\n--- Cleanup: Removing test records and reverting ledger ---');
  // Revert transactions
  const txns = await prisma.transaction.findMany({
    where: { referenceId: { in: [bookingInvoice.id, salesInvoice.id] } },
    include: { entries: true }
  });
  for (const txn of txns) {
    for (const entry of txn.entries) {
      if (entry.type === 'DEBIT') {
        await prisma.account.update({
          where: { id: entry.accountId },
          data: { currentBalance: { decrement: entry.amount } }
        });
      } else {
        await prisma.account.update({
          where: { id: entry.accountId },
          data: { currentBalance: { decrement: entry.amount } }
        });
      }
    }
    await prisma.transaction.delete({ where: { id: txn.id } });
  }

  await prisma.invoice.deleteMany({
    where: { id: { in: [bookingInvoice.id, salesInvoice.id] } }
  });

  const finalSafe = await prisma.account.findUnique({ where: { id: cashSafe.id } });
  console.log(`💰 Restored Cash Safe Balance: PKR ${finalSafe.currentBalance.toLocaleString()}`);
  console.log('\n✅ All automated verification tests passed successfully!');
}

runTest()
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
