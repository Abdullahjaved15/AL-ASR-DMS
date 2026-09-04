const prisma = require('../config/db');

// 1. Get Financial Audit Trail & Day Book Report
const getAuditTrail = async (req, res) => {
  try {
    const {
      timeRange = 'TODAY',
      startDate,
      endDate,
      type,
      accountId,
      search = '',
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Date range filtering
    const whereClause = {};
    const now = new Date();

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date.lte = end;
      }
    } else if (timeRange === 'TODAY') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    } else if (timeRange === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      whereClause.date = { gte: startOfMonth, lte: now };
    } else if (timeRange === 'THIS_YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      whereClause.date = { gte: startOfYear, lte: now };
    }

    if (type && type !== 'ALL') {
      whereClause.type = type;
    }

    if (search) {
      whereClause.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (accountId && accountId !== 'ALL') {
      whereClause.entries = {
        some: { accountId }
      };
    }

    const [transactions, totalCount, allRangeTxns] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        include: {
          createdByUser: { select: { id: true, name: true, role: true } },
          entries: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true, subType: true, bankName: true } }
            }
          }
        }
      }),
      prisma.transaction.count({ where: whereClause }),
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          entries: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true, subType: true } }
            }
          }
        }
      })
    ]);

    // Calculate Inflows & Outflows for the period
    let totalCashInflow = 0;
    let totalCashOutflow = 0;
    let totalBankInflow = 0;
    let totalBankOutflow = 0;
    const bankSummaryMap = {};

    allRangeTxns.forEach(txn => {
      txn.entries.forEach(entry => {
        const sub = entry.account.subType;
        const amt = entry.amount;

        if (sub === 'CASH') {
          if (entry.type === 'DEBIT') totalCashInflow += amt;
          else if (entry.type === 'CREDIT') totalCashOutflow += amt;
        } else if (sub === 'BANK') {
          if (!bankSummaryMap[entry.account.name]) {
            bankSummaryMap[entry.account.name] = { inflow: 0, outflow: 0, name: entry.account.name };
          }
          if (entry.type === 'DEBIT') {
            totalBankInflow += amt;
            bankSummaryMap[entry.account.name].inflow += amt;
          } else if (entry.type === 'CREDIT') {
            totalBankOutflow += amt;
            bankSummaryMap[entry.account.name].outflow += amt;
          }
        }
      });
    });

    const netCash = totalCashInflow - totalCashOutflow;
    const netBank = totalBankInflow - totalBankOutflow;
    const totalGrossInflow = totalCashInflow + totalBankInflow;
    const totalGrossOutflow = totalCashOutflow + totalBankOutflow;

    return res.json({
      transactions,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      analytics: {
        totalGrossInflow,
        totalGrossOutflow,
        netLiquidityChange: totalGrossInflow - totalGrossOutflow,
        cash: {
          inflow: totalCashInflow,
          outflow: totalCashOutflow,
          net: netCash
        },
        bank: {
          inflow: totalBankInflow,
          outflow: totalBankOutflow,
          net: netBank,
          bankWise: Object.values(bankSummaryMap)
        }
      }
    });
  } catch (error) {
    console.error('getAuditTrail error:', error);
    return res.status(500).json({ message: 'Failed to fetch audit trail and report', error: error.message });
  }
};

// 2. Single Chassis Multi-Sale & Double-Sale Segregation Tracker
const getChassisMultiSaleTracker = async (req, res) => {
  try {
    const { chassisNumber } = req.params;

    if (!chassisNumber) {
      return res.status(400).json({ message: 'Chassis number is required' });
    }

    const cleanChassis = chassisNumber.trim();

    // 1. Fetch all Invoices/Receipts tied to this chassis
    const invoices = await prisma.invoice.findMany({
      where: {
        chassisNumber: { contains: cleanChassis, mode: 'insensitive' }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true } }
      }
    });

    // 2. Fetch all Transactions tied to this chassis
    const transactions = await prisma.transaction.findMany({
      where: {
        chassisNumber: { contains: cleanChassis, mode: 'insensitive' }
      },
      orderBy: { date: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true } },
        entries: {
          include: {
            account: { select: { id: true, name: true, type: true, subType: true } }
          }
        }
      }
    });

    // 3. Fetch any Security Cheques issued against this chassis
    const securityCheques = await prisma.securityCheque.findMany({
      where: {
        chassisNumber: { contains: cleanChassis, mode: 'insensitive' }
      },
      orderBy: { issueDate: 'asc' }
    });

    // 4. Fetch any Installment Plans against this chassis
    const installmentPlans = await prisma.installmentPlan.findMany({
      where: {
        chassisNumber: { contains: cleanChassis, mode: 'insensitive' }
      },
      include: { items: true }
    });

    // Format Segregated Sales Cycles
    const salesCycles = invoices.map((inv, idx) => {
      return {
        saleCycleNumber: idx + 1,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        category: inv.category,
        date: inv.createdAt,
        customerName: inv.buyerName || inv.customerName || 'N/A',
        customerPhone: inv.buyerPhone || inv.customerPhone || 'N/A',
        customerCnic: inv.buyerCnic || 'N/A',
        vehicleModel: `${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}`.trim(),
        totalPrice: parseFloat(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0) || 0,
        advanceReceived: parseFloat(inv.advanceAmount || 0) || 0,
        paymentMethod: inv.paymentMethod || 'CASH',
        cashReceived: parseFloat(inv.cashAmountReceived || (inv.paymentMethod === 'CASH' ? inv.advanceAmount || inv.totalPrice : 0)) || 0,
        bankReceived: parseFloat(inv.bankAmountReceived || (inv.paymentMethod === 'BANK' ? inv.advanceAmount || inv.totalPrice : 0)) || 0,
        deliveryStatus: inv.deliveryStatus || 'DELIVERED',
        isDoubleSaleLiability: inv.deliveryStatus === 'UNDELIVERED' || inv.isDoubleSaleLiability,
        createdBy: inv.createdByUser?.name || 'System'
      };
    });

    const totalCollectedOnChassis = salesCycles.reduce((sum, s) => sum + (s.cashReceived + s.bankReceived), 0);
    const undeliveredSales = salesCycles.filter(s => s.deliveryStatus === 'UNDELIVERED');
    const isDoubleSaleFlagged = salesCycles.length > 1;

    return res.json({
      chassisNumber: cleanChassis,
      isDoubleSaleDetected: isDoubleSaleFlagged,
      summary: {
        totalSalesCount: salesCycles.length,
        totalFundsCollected: totalCollectedOnChassis,
        undeliveredLiabilitiesCount: undeliveredSales.length,
        totalUndeliveredLiabilityAmount: undeliveredSales.reduce((sum, s) => sum + s.totalPrice, 0)
      },
      salesCycles,
      transactions,
      securityCheques,
      installmentPlans
    });
  } catch (error) {
    console.error('getChassisMultiSaleTracker error:', error);
    return res.status(500).json({ message: 'Failed to fetch chassis audit tracker', error: error.message });
  }
};

module.exports = {
  getAuditTrail,
  getChassisMultiSaleTracker
};
