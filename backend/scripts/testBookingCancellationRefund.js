const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const invoiceController = require('../src/controllers/invoiceController');

async function testWorkflow() {
  console.log('--- Starting Automated Booking Cancellation & Refund Test ---');
  const testPhone = '03009998877';
  const testBuyer = 'Test Buyer Tariq';

  // 1. Get an existing user
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found in database for testing');
  }

  // 2. Clean up any existing test records
  await prisma.invoice.deleteMany({
    where: {
      OR: [
        { buyerPhone: testPhone },
        { customerPhone: testPhone }
      ]
    }
  });

  // 3. Create test booking receipt
  console.log('1. Creating Test Booking Receipt...');
  const bookingData = {
    category: 'BOOKING_RECEIPT',
    invoiceNumber: `BK-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    buyerName: testBuyer,
    buyerFatherName: 'Tariq Mehmood',
    buyerPhone: testPhone,
    buyerCnic: '35202-1234567-1',
    buyerAddress: 'Gulberg III, Lahore',
    vehicleMaker: 'Toyota',
    vehicleModel: 'Corolla Altis Grande 1.8',
    carYear: '2023',
    registrationNo: 'LEA-23-9988',
    chassisNumber: 'NZE140-9988776',
    engineNumber: '2ZR-8877665',
    totalPrice: '5000000',
    advanceAmount: '600000',
    remainingAmount: '4400000',
    paymentMethod: 'CASH',
    bookingStatus: 'ACTIVE',
    isDeleted: false,
    createdByUser: { connect: { id: user.id } }
  };

  const createdBooking = await prisma.invoice.create({
    data: bookingData
  });
  console.log(`✅ Booking created: ID=${createdBooking.id}, InvoiceNumber=${createdBooking.invoiceNumber}, Advance=PKR ${createdBooking.advanceAmount}`);

  // 4. Verify active booking phone lookup
  const activeBookings = await prisma.invoice.findMany({
    where: {
      category: 'BOOKING_RECEIPT',
      isDeleted: false,
      bookingStatus: 'ACTIVE',
      OR: [
        { buyerPhone: { contains: '9998877' } },
        { customerPhone: { contains: '9998877' } }
      ]
    }
  });
  if (activeBookings.length === 1 && activeBookings[0].id === createdBooking.id) {
    console.log('✅ Active booking lookup by phone verified successfully');
  } else {
    throw new Error('Active booking lookup failed');
  }

  // 5. Test cancelBookingAndIssueRefund via mock req/res
  console.log('2. Executing cancelBookingAndIssueRefund...');
  const req = {
    params: { id: createdBooking.id },
    body: {
      refundPaymentMethod: 'CASH',
      cancellationReason: 'Customer decided not to proceed with purchase. Full advance refunded in cash.'
    },
    user: { id: user.id, name: user.name || 'Test Administrator', role: user.role || 'SUPERADMIN' }
  };

  let responseData = null;
  let statusCode = 200;
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (payload) => {
      responseData = payload;
      return res;
    }
  };

  await invoiceController.cancelBookingAndIssueRefund(req, res);

  if (statusCode !== 200 || !responseData || !responseData.paymentVoucher) {
    throw new Error(`Cancellation controller failed with status ${statusCode}: ${JSON.stringify(responseData)}`);
  }

  const refundVoucher = responseData.paymentVoucher;
  const cancelledBooking = responseData.bookingReceipt;

  console.log(`✅ Cancellation succeeded! Generated Refund Payment Voucher: ${refundVoucher.invoiceNumber}`);
  console.log(`   - Voucher Category: ${refundVoucher.category}`);
  console.log(`   - Voucher Payee: ${refundVoucher.payeeName}`);
  console.log(`   - Voucher Amount: PKR ${refundVoucher.totalPrice || refundVoucher.cashAmount}`);
  console.log(`   - Linked Booking #: ${refundVoucher.linkedBookingNumber}`);
  console.log(`   - Cancelled Booking Status: ${cancelledBooking.bookingStatus}, isDeleted: ${cancelledBooking.isDeleted}`);

  // 6. Verify Phone lookup now returns NO active bookings
  const postCancelActiveBookings = await prisma.invoice.findMany({
    where: {
      category: 'BOOKING_RECEIPT',
      isDeleted: false,
      bookingStatus: 'ACTIVE',
      OR: [
        { buyerPhone: { contains: '9998877' } },
        { customerPhone: { contains: '9998877' } }
      ]
    }
  });
  if (postCancelActiveBookings.length === 0) {
    console.log('✅ Phone lookup isolation verified: Zero active bookings found (no conflict for future bookings)');
  } else {
    throw new Error('Phone lookup isolation failed! Cancelled booking still returned as active.');
  }

  // 7. Test getInvoices CANCELLED_BOOKINGS category
  console.log('3. Testing getInvoices CANCELLED_BOOKINGS filter...');
  const invReq = {
    query: { category: 'CANCELLED_BOOKINGS' }
  };
  let listData = null;
  const invRes = {
    status: () => invRes,
    json: (payload) => { listData = payload; return invRes; }
  };
  await invoiceController.getInvoices(invReq, invRes);

  const foundCancelledInList = listData?.invoices?.find(i => i.id === createdBooking.id);
  if (foundCancelledInList) {
    console.log(`✅ CANCELLED_BOOKINGS filter returned cancelled booking with linked voucher: ${foundCancelledInList.linkedVoucherNumber}`);
  } else {
    throw new Error('CANCELLED_BOOKINGS filter failed to find the cancelled booking');
  }

  // 8. Test Customer Trade History
  console.log('4. Testing getCustomerTradeHistory...');
  const histReq = { query: { search: 'Tariq' } };
  let histData = null;
  const histRes = {
    status: () => histRes,
    json: (payload) => { histData = payload; return histRes; }
  };
  await invoiceController.getCustomerTradeHistory(histReq, histRes);

  const tariqBuyer = histData?.buyers?.find(b => b.phone === testPhone);
  if (!tariqBuyer) {
    throw new Error('Buyer not found in trade history');
  }

  const tariqBooking = tariqBuyer.bookingHistory?.find(bk => bk.id === createdBooking.id);
  if (tariqBooking && tariqBooking.bookingStatus === 'CANCELLED' && tariqBooking.linkedVoucherNumber) {
    console.log(`✅ Customer trade history verified:`);
    console.log(`   - Buyer Name: ${tariqBuyer.name}`);
    console.log(`   - Booking Status: ${tariqBooking.bookingStatus}`);
    console.log(`   - Refund Voucher Attached: #${tariqBooking.linkedVoucherNumber}`);
    console.log(`   - Cancellation Reason: "${tariqBooking.cancellationReason}"`);
  } else {
    throw new Error(`Customer trade history failed to include cancelled booking details: ${JSON.stringify(tariqBuyer)}`);
  }

  // 9. Cleanup test data
  console.log('5. Cleaning up test records...');
  await prisma.invoice.deleteMany({
    where: {
      OR: [
        { id: createdBooking.id },
        { id: refundVoucher.id },
        { buyerPhone: testPhone },
        { customerPhone: testPhone }
      ]
    }
  });
  console.log('✅ Test cleanup completed successfully.');
  console.log('\n🎉 ALL BOOKING CANCELLATION & REFUND VOUCHER TESTS PASSED! 🎉');
}

testWorkflow()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
