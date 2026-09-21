const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const prisma = require('../src/config/db');

async function cleanSystemForOrganizationLaunch() {
  console.log('=====================================================');
  console.log('🧹 STARTING SYSTEM CLEANUP FOR ORGANIZATION LAUNCH');
  console.log('=====================================================\n');

  try {
    // 1. Delete all Transaction Entries & Transactions
    const deletedEntries = await prisma.transactionEntry.deleteMany({});
    console.log(`✅ Deleted ${deletedEntries.count} Transaction Entries.`);

    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${deletedTransactions.count} Transactions.`);

    // 2. Delete all Security Cheques
    const deletedCheques = await prisma.securityCheque.deleteMany({});
    console.log(`✅ Deleted ${deletedCheques.count} Security Cheques.`);

    // 3. Delete all Installment Items and Plans
    const deletedInstallmentItems = await prisma.installmentItem.deleteMany({});
    console.log(`✅ Deleted ${deletedInstallmentItems.count} Installment Items.`);

    const deletedInstallmentPlans = await prisma.installmentPlan.deleteMany({});
    console.log(`✅ Deleted ${deletedInstallmentPlans.count} Installment Plans.`);

    // 4. Delete all Invoices & Receipts (Trade & Customer History, Vouchers, Invoices)
    const deletedInvoiceImages = await prisma.invoiceImage.deleteMany({});
    console.log(`✅ Deleted ${deletedInvoiceImages.count} Invoice Images.`);

    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ Deleted ${deletedInvoices.count} Invoices / Receipts / Vouchers.`);

    // 5. Delete all Deals & Collaborations
    const deletedDeals = await prisma.deal.deleteMany({});
    console.log(`✅ Deleted ${deletedDeals.count} Deals.`);

    const deletedCollaborations = await prisma.collaboration.deleteMany({});
    console.log(`✅ Deleted ${deletedCollaborations.count} Collaborations.`);

    // 6. Delete all Audit Trail / Activity Logs
    const deletedActivityLogs = await prisma.activityLog.deleteMany({});
    console.log(`✅ Deleted ${deletedActivityLogs.count} Activity Logs (Audit Trail).`);

    // 7. Delete all Inflow / System Notifications
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${deletedNotifications.count} Notifications.`);

    // 8. Delete all Salesman Incentive Data
    const deletedIncentiveImages = await prisma.incentiveApprovalSheetImage.deleteMany({});
    console.log(`✅ Deleted ${deletedIncentiveImages.count} Incentive Approval Sheet Images.`);

    const deletedIncentiveSheets = await prisma.incentiveApprovalSheet.deleteMany({});
    console.log(`✅ Deleted ${deletedIncentiveSheets.count} Incentive Approval Sheets.`);

    // 9. Delete all Approval Requests
    const deletedApprovalRequests = await prisma.approvalRequest.deleteMany({});
    console.log(`✅ Deleted ${deletedApprovalRequests.count} Approval Requests.`);

    // 10. Reset all Ledger and Bank Account Balances to 0 (WITHOUT deleting any accounts)
    const updatedAccounts = await prisma.account.updateMany({
      data: {
        currentBalance: 0,
        openingBalance: 0
      }
    });
    console.log(`✅ Reset balances to 0 for all ${updatedAccounts.count} Accounts / Ledgers.`);

    console.log('\n-----------------------------------------------------');
    console.log('📊 POST-CLEANUP VERIFICATION OF REMAINING DATA:');
    console.log('-----------------------------------------------------');

    const verificationCounts = {
      users: await prisma.user.count(),
      sellers: await prisma.seller.count(),
      buyers: await prisma.buyer.count(),
      currentStock: await prisma.currentStock.count(),
      accountsStock: await prisma.accountsStock.count(),
      accounts: await prisma.account.count(),
      invoices: await prisma.invoice.count(),
      deals: await prisma.deal.count(),
      collaborations: await prisma.collaboration.count(),
      transactions: await prisma.transaction.count(),
      transactionEntries: await prisma.transactionEntry.count(),
      securityCheques: await prisma.securityCheque.count(),
      installmentPlans: await prisma.installmentPlan.count(),
      activityLogs: await prisma.activityLog.count(),
      notifications: await prisma.notification.count(),
      incentiveSheets: await prisma.incentiveApprovalSheet.count(),
      approvalRequests: await prisma.approvalRequest.count(),
      receivingLetters: await prisma.receivingLetter.count(),
      employees: await prisma.employee.count(),
      attendances: await prisma.attendance.count(),
    };

    console.table(verificationCounts);

    const accountsCheck = await prisma.account.findMany({
      select: { code: true, name: true, type: true, currentBalance: true, openingBalance: true },
      orderBy: { code: 'asc' }
    });
    console.log('\n--- ALL ACCOUNTS (ALL BALANCES ZEROED) ---');
    console.table(accountsCheck);

    console.log('\n🎉 SUCCESS: All requested cleanup completed cleanly for organization launch.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

cleanSystemForOrganizationLaunch();
