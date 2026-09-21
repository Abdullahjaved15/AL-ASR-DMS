const prisma = require('../src/config/db');

async function cleanSystemForLaunch() {
  console.log('====================================================');
  console.log('🚀 SYSTEM CLEANUP FOR ORGANIZATION PRODUCTION LAUNCH');
  console.log('====================================================\n');

  try {
    // 1. Delete all Activity Logs (Audit Trail)
    const delActivity = await prisma.activityLog.deleteMany({});
    console.log(`✅ Deleted Audit Trail (Activity Logs): ${delActivity.count} records`);

    // 2. Delete all Notifications (Inflow & Approval Notifications)
    const delNotifs = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted Notifications: ${delNotifs.count} records`);

    // 3. Delete Salesman Incentive Approval Sheets & Images
    const delIncentiveImages = await prisma.incentiveApprovalSheetImage.deleteMany({});
    const delIncentiveSheets = await prisma.incentiveApprovalSheet.deleteMany({});
    console.log(`✅ Deleted Incentive Sheets: ${delIncentiveSheets.count} sheets (${delIncentiveImages.count} images)`);

    // 4. Delete Approval Requests (associated with old test transactions/invoices)
    const delApprovals = await prisma.approvalRequest.deleteMany({});
    console.log(`✅ Deleted Approval Requests: ${delApprovals.count} records`);

    // 5. Delete Installment Plans & Items
    const delInstallmentItems = await prisma.installmentItem.deleteMany({});
    const delInstallmentPlans = await prisma.installmentPlan.deleteMany({});
    console.log(`✅ Deleted Installment Plans: ${delInstallmentPlans.count} plans (${delInstallmentItems.count} items)`);

    // 6. Delete Security Cheques
    const delCheques = await prisma.securityCheque.deleteMany({});
    console.log(`✅ Deleted Security Cheques: ${delCheques.count} records`);

    // 7. Delete Accounts & Finance Hub Transactions & Entries
    const delEntries = await prisma.transactionEntry.deleteMany({});
    const delTxns = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted Financial Transactions: ${delTxns.count} transactions (${delEntries.count} ledger entries)`);

    // 8. Delete Invoices, Booking Receipts, Vouchers & Customer Trade History
    const delInvoiceImages = await prisma.invoiceImage.deleteMany({});
    const delInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ Deleted Invoices & Trade History: ${delInvoices.count} receipts (${delInvoiceImages.count} images)`);

    // 9. Reset all Ledgers / Bank Accounts / Safe Accounts balances to 0 (DO NOT DELETE ACCOUNTS)
    const updatedAccounts = await prisma.account.updateMany({
      data: {
        openingBalance: 0,
        currentBalance: 0
      }
    });
    console.log(`✅ Reset All Ledgers & Bank Account Balances to PKR 0.00: ${updatedAccounts.count} accounts preserved`);

    // 10. Verify Preserved Core Data
    const [preservedStock, preservedSellers, preservedBuyers, preservedUsers, preservedAccounts] = await Promise.all([
      prisma.accountsStock.count(),
      prisma.seller.count(),
      prisma.buyer.count(),
      prisma.user.count(),
      prisma.account.count()
    ]);

    console.log('\n----------------------------------------------------');
    console.log('🛡️ VERIFIED PRESERVED ESSENTIAL DATA:');
    console.log(`   📦 Accounts Current Stock preserved : ${preservedStock} vehicles`);
    console.log(`   🚗 Seller Leads / Inventory preserved: ${preservedSellers} records`);
    console.log(`   👥 Buyer Leads preserved            : ${preservedBuyers} records`);
    console.log(`   👤 Users / Team Members preserved   : ${preservedUsers} users`);
    console.log(`   🏛️ Accounts / Chart of Accounts kept: ${preservedAccounts} ledger accounts (all balance = 0)`);
    console.log('----------------------------------------------------');
    console.log('✨ System successfully cleaned and ready for live organization operation!\n');

  } catch (err) {
    console.error('❌ Error during system cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSystemForLaunch();
