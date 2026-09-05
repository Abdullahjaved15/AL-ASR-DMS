const prisma = require('../src/config/db');
const { syncInvoiceLedgerTransactions, getSalesmanIncentives, getCustomerTradeHistory } = require('../src/controllers/invoiceController');

async function runTest() {
  console.log('=== STARTING CONSIGNMENT & SALESMAN INCENTIVES TEST ===');

  // 1. Find a test user for createdBy
  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    console.error('No user found in DB');
    return;
  }

  // 2. Create a test Consignment Sales Receipt
  const testRegNo = `TEST-CONSIGN-${Date.now()}`;
  const testChassis = `CHASSIS-CONSIGN-${Date.now()}`;
  const testSellerPhone = '03009998877';
  const testBuyerPhone = '03217778899';

  console.log('1. Creating Customer-Owned Vehicle (Consignment) Sales Receipt...');
  const invoiceNumber = `REC-TEST-${Date.now().toString().slice(-6)}`;

  // Record initial Safe cash balance
  const initialCashAccount = await prisma.account.findFirst({ where: { subType: 'CASH' } });
  const initialBalance = initialCashAccount ? initialCashAccount.currentBalance : 0;
  console.log(`Initial Cash Safe Balance: PKR ${initialBalance.toLocaleString()}`);

  const consignmentInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      category: 'SALES_RECEIPT',
      date: new Date(),
      registrationNo: testRegNo,
      chassisNumber: testChassis,
      vehicleMaker: 'Toyota',
      vehicleModel: 'Grande 1.8 CVT',
      carYear: '2023',
      color: 'Phantom Black',

      // Seller (Customer who brought the car to sell)
      sellerName: 'Chaudhry Nadeem (Customer Seller)',
      sellerPhone: testSellerPhone,
      sellerCnic: '35201-1122334-1',
      sellerAddress: 'Model Town Lahore',

      // Buyer (Customer who buys the car)
      buyerName: 'Malik Zeeshan (Buyer)',
      buyerPhone: testBuyerPhone,
      buyerCnic: '35202-9988776-5',
      buyerAddress: 'DHA Phase 5 Lahore',

      // Financials: Agreed Price = PKR 6,500,000. Commission = PKR 80,000
      totalPrice: '6500000',
      agreedAmount: '6500000',
      commissionAmount: '80000',
      commissionPercent: '1.23',

      // Payment Method: Cash
      paymentMethod: 'CASH',

      // Consignment & Salesman Attribution
      isCustomerVehicle: true,
      salesmanName: 'Babar Azam (Sales Executive)',

      createdBy: adminUser.id
    }
  });

  console.log(`Created Consignment Invoice ID: ${consignmentInvoice.id}, Number: ${consignmentInvoice.invoiceNumber}`);

  // 3. Run ledger synchronization
  await syncInvoiceLedgerTransactions(consignmentInvoice.id, adminUser.id);

  // 4. Verify Ledger Posting
  const updatedCashAccount = await prisma.account.findFirst({ where: { subType: 'CASH' } });
  const newBalance = updatedCashAccount ? updatedCashAccount.currentBalance : 0;
  const balanceDiff = newBalance - initialBalance;

  console.log(`Updated Cash Safe Balance: PKR ${newBalance.toLocaleString()}`);
  console.log(`Safe Balance Inflow Difference: PKR ${balanceDiff.toLocaleString()}`);

  if (balanceDiff === 80000) {
    console.log('✅ PASS: Only the commission amount (PKR 80,000) entered Cash in Hand safe!');
  } else {
    console.error(`❌ FAIL: Expected PKR 80,000 inflow, but got PKR ${balanceDiff}`);
  }

  // Check the transaction created
  const createdTxn = await prisma.transaction.findFirst({
    where: { referenceId: consignmentInvoice.id },
    include: { entries: { include: { account: true } } }
  });

  console.log('Transaction Details:');
  console.log(`- Txn Number: ${createdTxn?.transactionNumber}`);
  console.log(`- Description: ${createdTxn?.description}`);
  console.log(`- Amount: PKR ${createdTxn?.amount.toLocaleString()}`);
  createdTxn?.entries.forEach(e => {
    console.log(`  * [${e.type}] Account: ${e.account.name} (${e.account.code}) -> PKR ${e.amount.toLocaleString()} | ${e.description}`);
  });

  // 5. Test Salesman Incentives Controller
  console.log('\n2. Testing Salesman Incentives Controller...');
  const fakeReq = { query: { search: 'Babar Azam' } };
  let resData = null;
  const fakeRes = {
    json: (data) => { resData = data; return data; },
    status: () => fakeRes
  };

  await getSalesmanIncentives(fakeReq, fakeRes);
  const matchedSalesman = resData?.salesmen?.find(s => s.salesmanName.includes('Babar Azam'));

  console.log('Salesman Incentive Result:');
  console.log(`- Name: ${matchedSalesman?.salesmanName}`);
  console.log(`- Vehicles Sold: ${matchedSalesman?.totalVehiclesSold}`);
  console.log(`- Total Volume: PKR ${matchedSalesman?.totalSalesVolume.toLocaleString()}`);
  console.log(`- Commission Earned: PKR ${matchedSalesman?.totalCommissionEarned.toLocaleString()}`);
  console.log(`- Consignment Cars: ${matchedSalesman?.consignmentSalesCount}`);

  if (matchedSalesman && matchedSalesman.totalCommissionEarned >= 80000) {
    console.log('✅ PASS: Salesman incentive accurately tracked vehicle sold and commission!');
  } else {
    console.error('❌ FAIL: Salesman incentive did not match expected values.');
  }

  // 6. Test Customer History Controller
  console.log('\n3. Testing Customer History Controller (Buyer & Seller History)...');
  const histReq = { query: { search: 'Nadeem' } };
  let histResData = null;
  const fakeHistRes = {
    json: (data) => { histResData = data; return data; },
    status: () => fakeHistRes
  };

  await getCustomerTradeHistory(histReq, fakeHistRes);
  const matchedSeller = histResData?.sellers?.find(s => s.phone.includes(testSellerPhone) || s.name.includes('Nadeem'));

  console.log('Seller History:');
  console.log(`- Name: ${matchedSeller?.name}`);
  console.log(`- Phone: ${matchedSeller?.phone}`);
  console.log(`- Total Vehicles Sold at Showroom: ${matchedSeller?.totalVehiclesSold}`);
  console.log(`- Sold Car Details: ${matchedSeller?.soldVehicles[0]?.vehicleMaker} ${matchedSeller?.soldVehicles[0]?.vehicleModel} (Reg: ${matchedSeller?.soldVehicles[0]?.registrationNo})`);

  if (matchedSeller && matchedSeller.totalVehiclesSold >= 1) {
    console.log('✅ PASS: Seller vehicle history accurately tracked!');
  } else {
    console.error('❌ FAIL: Seller history not found.');
  }

  // Clean up test invoice & transaction
  console.log('\nCleaning up test records...');
  if (createdTxn) {
    // Revert balance
    await prisma.account.update({
      where: { id: updatedCashAccount.id },
      data: { currentBalance: { decrement: 80000 } }
    });
    const revAccount = await prisma.account.findFirst({ where: { code: '4002' } });
    if (revAccount) {
      await prisma.account.update({
        where: { id: revAccount.id },
        data: { currentBalance: { decrement: 80000 } }
      });
    }
    await prisma.transaction.delete({ where: { id: createdTxn.id } });
  }
  await prisma.invoice.delete({ where: { id: consignmentInvoice.id } });

  console.log('=== TEST COMPLETED SUCCESSFULLY ===\n');
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
