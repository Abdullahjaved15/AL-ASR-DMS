const prisma = require('../src/config/db');
const { 
  createInvoice, 
  findActiveBookingByPhone, 
  getInvoices, 
  getCustomerTradeHistory 
} = require('../src/controllers/invoiceController');

// Mock Express req/res
const createMockReqRes = (body = {}, query = {}, user = null) => {
  const req = { body, query, user, params: {} };
  let responseData = null;
  let statusCode = 200;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return data;
    }
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData }) };
};

async function runVerification() {
  console.log('🧪 Starting Booking Deletion on Conversion & Buyer Trade History Verification...\n');

  try {
    const existingUser = await prisma.user.findFirst();
    const testUser = { id: existingUser.id, name: existingUser.name };

    const testBuyerPhone = '0300-4455667';
    const testBuyerName = 'Tariq Mahmood';

    // ----------------------------------------------------
    // STEP 1: CREATE BOOKING RECEIPT #1 (CIVIC)
    // ----------------------------------------------------
    console.log('--- Step 1: Creating Initial Booking Receipt #1 (Honda Civic RS, Adv: 400k, Total: 3.8M) ---');
    const { req: bkReq1, res: bkRes1, getResult: getBk1 } = createMockReqRes({
      category: 'BOOKING_RECEIPT',
      buyerName: testBuyerName,
      buyerPhone: testBuyerPhone,
      buyerCnic: '35201-1122334-1',
      vehicleMaker: 'Honda',
      vehicleModel: 'Civic RS',
      carYear: '2023',
      color: 'Crystal Black',
      registrationNo: 'LEC-2023-5566',
      chassisNumber: 'CIVIC-TEST-CHASSIS-001',
      totalPrice: '3800000',
      advanceAmount: '400000',
      remainingAmount: '3400000',
      paymentMethod: 'CASH',
      salesmanName: 'Hamza Tariq'
    }, {}, testUser);

    await createInvoice(bkReq1, bkRes1);
    const bkResult1 = getBk1();
    if (bkResult1.status >= 400) {
      throw new Error(`Failed to create Booking Receipt #1: ${JSON.stringify(bkResult1.data)}`);
    }

    const booking1 = await prisma.invoice.findFirst({
      where: { chassisNumber: 'CIVIC-TEST-CHASSIS-001' }
    });
    console.log(`✅ Booking Receipt #1 Created: #${booking1.invoiceNumber} (isDeleted: ${booking1.isDeleted}, status: ${booking1.bookingStatus})`);

    // Verify it is found via phone lookup
    const { req: phoneReq1, res: phoneRes1, getResult: getPhone1 } = createMockReqRes({}, { phone: testBuyerPhone });
    await findActiveBookingByPhone(phoneReq1, phoneRes1);
    const phoneData1 = getPhone1().data;
    if (!phoneData1.bookings || phoneData1.bookings.length === 0) {
      throw new Error('Expected active booking to be found via phone lookup');
    }
    console.log(`✅ Found active booking #${phoneData1.bookings[0].invoiceNumber} for phone ${testBuyerPhone}`);

    // ----------------------------------------------------
    // STEP 2: CREATE SALES RECEIPT LINKING BOOKING #1
    // ----------------------------------------------------
    console.log('\n--- Step 2: Creating Sales Receipt linking Booking Receipt #1 ---');
    const { req: saleReq, res: saleRes, getResult: getSale } = createMockReqRes({
      category: 'SALES_RECEIPT',
      buyerName: testBuyerName,
      buyerPhone: testBuyerPhone,
      buyerCnic: '35201-1122334-1',
      vehicleMaker: 'Honda',
      vehicleModel: 'Civic RS',
      carYear: '2023',
      color: 'Crystal Black',
      registrationNo: 'LEC-2023-5566',
      chassisNumber: 'CIVIC-TEST-CHASSIS-001',
      totalPrice: '3800000',
      advanceAmount: '400000',
      remainingAmount: '3400000',
      paymentMethod: 'CASH',
      linkedBookingId: booking1.id,
      linkedBookingNumber: booking1.invoiceNumber,
      salesmanName: 'Hamza Tariq'
    }, {}, testUser);

    await createInvoice(saleReq, saleRes);
    const saleResult = getSale();
    if (saleResult.status >= 400) {
      throw new Error(`Failed to create Sales Receipt: ${JSON.stringify(saleResult.data)}`);
    }

    const saleInvoice = await prisma.invoice.findFirst({
      where: { chassisNumber: 'CIVIC-TEST-CHASSIS-001', category: 'SALES_RECEIPT' }
    });
    console.log(`✅ Sales Receipt Created: #${saleInvoice.invoiceNumber}`);

    // ----------------------------------------------------
    // STEP 3: VERIFY BOOKING #1 IS MARKED DELETED & HIDDEN FROM ACTIVE LISTS
    // ----------------------------------------------------
    console.log('\n--- Step 3: Verifying Booking #1 is deleted from active lists & phone lookups ---');
    const updatedBooking1 = await prisma.invoice.findUnique({ where: { id: booking1.id } });
    console.log(`📋 Booking #1 in DB: isDeleted=${updatedBooking1.isDeleted}, deletedReason=${updatedBooking1.deletedReason}, bookingStatus=${updatedBooking1.bookingStatus}, linkedSaleNumber=${updatedBooking1.linkedSaleNumber}`);
    
    if (!updatedBooking1.isDeleted) {
      throw new Error('Expected Booking #1 to have isDeleted: true');
    }
    console.log('✅ SUCCESS: Booking Receipt #1 is marked as deleted/converted!');

    // Check getInvoices (active invoices list) does NOT include converted booking
    const { req: invReq, res: invRes, getResult: getInvs } = createMockReqRes({}, { category: 'BOOKING_RECEIPT' }, testUser);
    await getInvoices(invReq, invRes);
    const activeBookings = getInvs().data.invoices;
    const foundDeletedInActiveList = activeBookings.some(b => b.id === booking1.id);
    if (foundDeletedInActiveList) {
      throw new Error('Converted/deleted booking should NOT appear in active invoices list');
    }
    console.log('✅ SUCCESS: Converted Booking #1 does NOT appear in active Booking Receipts list!');

    // Check findActiveBookingByPhone returns 0 bookings now
    const { req: phoneReq2, res: phoneRes2, getResult: getPhone2 } = createMockReqRes({}, { phone: testBuyerPhone }, testUser);
    await findActiveBookingByPhone(phoneReq2, phoneRes2);
    const phoneData2 = getPhone2().data;
    if (phoneData2.bookings && phoneData2.bookings.length > 0) {
      throw new Error('Expected 0 active bookings after conversion');
    }
    console.log('✅ SUCCESS: findActiveBookingByPhone returns 0 active bookings (NO STALE CONFLICTS)!');

    // ----------------------------------------------------
    // STEP 4: CREATE BOOKING RECEIPT #2 FOR SAME PHONE (FORTUNER)
    // ----------------------------------------------------
    console.log('\n--- Step 4: Creating Booking Receipt #2 for SAME Phone Number (Toyota Fortuner) ---');
    const { req: bkReq2, res: bkRes2, getResult: getBk2 } = createMockReqRes({
      category: 'BOOKING_RECEIPT',
      buyerName: testBuyerName,
      buyerPhone: testBuyerPhone,
      buyerCnic: '35201-1122334-1',
      vehicleMaker: 'Toyota',
      vehicleModel: 'Fortuner Legender',
      carYear: '2024',
      color: 'Attitude Black',
      registrationNo: 'LEF-2024-8899',
      chassisNumber: 'FORTUNER-TEST-CHASSIS-002',
      totalPrice: '19000000',
      advanceAmount: '1000000',
      remainingAmount: '18000000',
      paymentMethod: 'CASH',
      salesmanName: 'Hamza Tariq'
    }, {}, testUser);

    await createInvoice(bkReq2, bkRes2);
    const bkResult2 = getBk2();
    if (bkResult2.status >= 400) {
      throw new Error(`Failed to create Booking Receipt #2: ${JSON.stringify(bkResult2.data)}`);
    }

    const booking2 = await prisma.invoice.findFirst({
      where: { chassisNumber: 'FORTUNER-TEST-CHASSIS-002' }
    });
    console.log(`✅ Booking Receipt #2 Created: #${booking2.invoiceNumber}`);

    // Phone lookup should now return ONLY Booking #2 (zero conflict)
    const { req: phoneReq3, res: phoneRes3, getResult: getPhone3 } = createMockReqRes({}, { phone: testBuyerPhone });
    await findActiveBookingByPhone(phoneReq3, phoneRes3);
    const phoneData3 = getPhone3().data;
    if (phoneData3.bookings.length !== 1 || phoneData3.bookings[0].id !== booking2.id) {
      throw new Error(`Expected only Booking #2 to be returned. Got: ${JSON.stringify(phoneData3.bookings)}`);
    }
    console.log(`✅ SUCCESS: Phone lookup returned ONLY the new active Booking #${phoneData3.bookings[0].invoiceNumber} (Fortuner), zero conflict!`);

    // ----------------------------------------------------
    // STEP 5: VERIFY CUSTOMER & BUYER TRADE HISTORY PRESERVATION
    // ----------------------------------------------------
    console.log('\n--- Step 5: Verifying Customer Trade History (Purchased Cars + Booking History) ---');
    const { req: histReq, res: histRes, getResult: getHist } = createMockReqRes({}, { search: 'Tariq Mahmood' });
    await getCustomerTradeHistory(histReq, histRes);
    const histData = getHist().data;

    const tariqBuyer = histData.buyers.find(b => b.phone.includes('4455667') || b.name.includes('Tariq'));
    if (!tariqBuyer) {
      throw new Error('Tariq Mahmood was not found in Customer Trade History!');
    }

    console.log(`👤 Customer: ${tariqBuyer.name} (${tariqBuyer.phone})`);
    console.log(`🚗 Total Vehicles Bought: ${tariqBuyer.totalVehiclesBought}`);
    console.log(`📅 Total Bookings in History: ${tariqBuyer.bookingHistory.length}`);

    if (tariqBuyer.purchasedVehicles.length !== 1) {
      throw new Error(`Expected 1 purchased vehicle, got ${tariqBuyer.purchasedVehicles.length}`);
    }
    const purchasedCar = tariqBuyer.purchasedVehicles[0];
    console.log(`✅ Purchased Car in History: ${purchasedCar.vehicleMaker} ${purchasedCar.vehicleModel} (Price: PKR ${purchasedCar.price.toLocaleString()}, Linked Booking: #${purchasedCar.linkedBookingNumber})`);

    if (tariqBuyer.bookingHistory.length !== 2) {
      throw new Error(`Expected 2 bookings in booking history, got ${tariqBuyer.bookingHistory.length}`);
    }

    tariqBuyer.bookingHistory.forEach((bk, i) => {
      console.log(`   ${i + 1}. Booking #${bk.bookingNumber}: ${bk.vehicleMaker} ${bk.vehicleModel} (Adv: PKR ${bk.advanceAmount.toLocaleString()}, Status: ${bk.bookingStatus}, Linked Sale: #${bk.linkedSaleNumber || 'None'})`);
    });

    console.log('\n🎉 ALL Booking Deletion on Conversion & Buyer Trade History tests PASSED PERFECTLY!');

    // Cleanup test data
    console.log('\n🧹 Cleaning up test artifacts...');
    await prisma.invoiceImage.deleteMany({ where: { invoiceId: { in: [booking1.id, saleInvoice.id, booking2.id] } } });
    await prisma.transactionEntry.deleteMany({ where: { transaction: { referenceId: { in: [booking1.id, saleInvoice.id, booking2.id] } } } });
    await prisma.transaction.deleteMany({ where: { referenceId: { in: [booking1.id, saleInvoice.id, booking2.id] } } });
    await prisma.notification.deleteMany({ where: { referenceId: { in: [booking1.id, saleInvoice.id, booking2.id] } } });
    await prisma.invoice.deleteMany({ where: { id: { in: [booking1.id, saleInvoice.id, booking2.id] } } });
    console.log('✅ Cleanup complete.');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

runVerification();
