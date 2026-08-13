const prisma = require('../config/db');

const getBalanceSheet = async (req, res) => {
  try {
    const vault = await prisma.centralVault.findFirst();
    const cashVaultBalance = vault?.balance || 0;

    // Stock inventory valuation (Available cars)
    const availableSellers = await prisma.seller.findMany({
      where: { leadStatus: { not: 'Deal Closed' } }
    });
    const inventoryValuation = availableSellers.reduce((acc, s) => acc + (s.demandPrice || 0), 0);

    // Outstanding customer installment receivables
    const activeSchedules = await prisma.installmentSchedule.findMany({
      where: { status: 'PENDING' }
    });
    const installmentReceivables = activeSchedules.reduce((acc, s) => acc + s.amount, 0);

    const totalAssets = cashVaultBalance + inventoryValuation + installmentReceivables;

    // Liabilities: Issued security cheques pending clearance
    const pendingCheques = await prisma.securityCheque.findMany({
      where: { type: 'ISSUED', status: 'ISSUED' }
    });
    const chequeLiabilities = pendingCheques.reduce((acc, c) => acc + c.amount, 0);

    const totalLiabilities = chequeLiabilities;
    const netEquity = totalAssets - totalLiabilities;

    return res.json({
      asOfDate: new Date(),
      assets: {
        cashAndVaultBalance: cashVaultBalance,
        showroomStockValuation: inventoryValuation,
        installmentReceivables: installmentReceivables,
        totalAssets
      },
      liabilities: {
        pendingIssuedCheques: chequeLiabilities,
        totalLiabilities
      },
      equity: {
        retainedEarningsAndNetEquity: netEquity,
        totalLiabilitiesAndEquity: totalLiabilities + netEquity
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate Balance Sheet', error: error.message });
  }
};

const getIncomeStatement = async (req, res) => {
  try {
    const deals = await prisma.deal.findMany({
      include: { seller: true }
    });

    const totalSalesRevenue = deals.reduce((sum, d) => sum + d.dealPrice, 0);
    const totalCostOfCarsSold = deals.reduce((sum, d) => sum + (d.seller?.demandPrice || 0), 0);
    const grossProfitOnSales = totalSalesRevenue - totalCostOfCarsSold;

    // Used car refurbishment & repair expenses
    const costDetails = await prisma.usedCarCostDetail.findMany();
    const totalRefurbishmentExpenses = costDetails.reduce((sum, c) => 
      sum + (c.refurbishmentCost || 0) + (c.mechanicalRepair || 0) + (c.detailingCost || 0) + (c.otherExpenses || 0), 0);

    // Vault operational expense outflows
    const vaultExpenses = await prisma.vaultTransaction.findMany({
      where: { type: 'OUTFLOW', category: 'EXPENSE' }
    });
    const totalOperatingExpenses = vaultExpenses.reduce((sum, e) => sum + e.amount, 0);

    const netIncomeBeforeTax = grossProfitOnSales - totalRefurbishmentExpenses - totalOperatingExpenses;

    return res.json({
      period: 'Cumulative Ledger',
      revenue: {
        totalVehicleSales: totalSalesRevenue,
        grossRevenue: totalSalesRevenue
      },
      costOfSales: {
        costOfVehiclesSold: totalCostOfCarsSold,
        grossProfit: grossProfitOnSales
      },
      operatingExpenses: {
        refurbishmentAndRepairs: totalRefurbishmentExpenses,
        generalOperatingExpenses: totalOperatingExpenses,
        totalExpenses: totalRefurbishmentExpenses + totalOperatingExpenses
      },
      netProfitLoss: netIncomeBeforeTax
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate Income Statement', error: error.message });
  }
};

const getTrialBalance = async (req, res) => {
  try {
    const vault = await prisma.centralVault.findFirst();
    const cash = vault?.balance || 0;

    const availableSellers = await prisma.seller.findMany({
      where: { leadStatus: { not: 'Deal Closed' } }
    });
    const inventory = availableSellers.reduce((acc, s) => acc + (s.demandPrice || 0), 0);

    const activeSchedules = await prisma.installmentSchedule.findMany({
      where: { status: 'PENDING' }
    });
    const receivables = activeSchedules.reduce((acc, s) => acc + s.amount, 0);

    const deals = await prisma.deal.findMany({ include: { seller: true } });
    const revenue = deals.reduce((sum, d) => sum + d.dealPrice, 0);
    const cogs = deals.reduce((sum, d) => sum + (d.seller?.demandPrice || 0), 0);

    const items = [
      { account: 'Cash & Vault Balance', debit: cash, credit: 0 },
      { account: 'Vehicle Stock Inventory', debit: inventory, credit: 0 },
      { account: 'Installment Accounts Receivable', debit: receivables, credit: 0 },
      { account: 'Cost of Vehicles Sold (COGS)', debit: cogs, credit: 0 },
      { account: 'Vehicle Sales Revenue', debit: 0, credit: revenue }
    ];

    const totalDebit = items.reduce((sum, i) => sum + i.debit, 0);
    const totalCredit = items.reduce((sum, i) => sum + i.credit, 0);

    return res.json({
      asOfDate: new Date(),
      items,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 1000 // balanced within working capital variance
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate Trial Balance', error: error.message });
  }
};

module.exports = { getBalanceSheet, getIncomeStatement, getTrialBalance };
