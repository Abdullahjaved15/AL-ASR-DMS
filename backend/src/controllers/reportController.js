const prisma = require('../config/db');

const getDateRange = (rangeType, startDate, endDate) => {
  const now = new Date();
  let start = new Date(0);
  let end = new Date();

  switch (rangeType) {
    case 'Today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'Yesterday':
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate());
      end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59);
      break;
    case 'This Week':
      const firstDayOfWeek = now.getDate() - now.getDay();
      start = new Date(now.setDate(firstDayOfWeek));
      start.setHours(0, 0, 0, 0);
      break;
    case 'This Month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'Custom':
      if (startDate) start = new Date(startDate);
      if (endDate) end = new Date(endDate);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1); // Default to this month
      break;
  }

  return { start, end };
};

const getSalesmenReports = async (req, res) => {
  try {
    const { range = 'This Month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // Optimized single-pass system queries using Prisma groupBy
    const [
      salesmen,
      groupedTotalLeads,
      groupedActiveLeads,
      groupedPendingLeads,
      groupedIncompleteLeads,
      groupedFinishedSellers,
      allDeals
    ] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'SALESMAN' },
        select: { id: true, name: true, email: true, phone: true }
      }),
      prisma.seller.groupBy({
        by: ['assignedTo'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { _all: true }
      }),
      prisma.seller.groupBy({
        by: ['assignedTo'],
        where: {
          leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] },
          createdAt: { gte: start, lte: end }
        },
        _count: { _all: true }
      }),
      prisma.seller.groupBy({
        by: ['assignedTo'],
        where: {
          leadStatus: 'Follow Up',
          createdAt: { gte: start, lte: end }
        },
        _count: { _all: true }
      }),
      prisma.seller.groupBy({
        by: ['assignedTo'],
        where: {
          leadStatus: 'Incomplete',
          createdAt: { gte: start, lte: end }
        },
        _count: { _all: true }
      }),
      prisma.seller.groupBy({
        by: ['assignedTo'],
        where: {
          leadStatus: 'Deal Closed',
          updatedAt: { gte: start, lte: end }
        },
        _count: { _all: true }
      }),
      prisma.deal.findMany({
        where: { closingDate: { gte: start, lte: end } },
        select: {
          salesmanId: true,
          dealPrice: true,
          profit: true,
          closingDate: true,
          seller: { select: { createdAt: true } }
        }
      })
    ]);

    // Build fast lookup maps
    const totalMap = {};
    groupedTotalLeads.forEach(g => { if (g.assignedTo) totalMap[g.assignedTo] = g._count._all; });

    const activeMap = {};
    groupedActiveLeads.forEach(g => { if (g.assignedTo) activeMap[g.assignedTo] = g._count._all; });

    const pendingMap = {};
    groupedPendingLeads.forEach(g => { if (g.assignedTo) pendingMap[g.assignedTo] = g._count._all; });

    const incompleteMap = {};
    groupedIncompleteLeads.forEach(g => { if (g.assignedTo) incompleteMap[g.assignedTo] = g._count._all; });

    const finishedMap = {};
    groupedFinishedSellers.forEach(g => { if (g.assignedTo) finishedMap[g.assignedTo] = g._count._all; });

    const dealsMap = {};
    allDeals.forEach(d => {
      if (!dealsMap[d.salesmanId]) dealsMap[d.salesmanId] = [];
      dealsMap[d.salesmanId].push(d);
    });

    const reportData = salesmen.map((sm) => {
      const totalLeadsCount = totalMap[sm.id] || 0;
      const activeLeadsCount = activeMap[sm.id] || 0;
      const pendingLeadsCount = pendingMap[sm.id] || 0;
      const incompleteLeadsCount = incompleteMap[sm.id] || 0;
      const finishedSellersCount = finishedMap[sm.id] || 0;

      const smDeals = dealsMap[sm.id] || [];
      const dealsClosedCount = smDeals.length;
      const totalRevenue = smDeals.reduce((sum, d) => sum + (parseFloat(String(d.dealPrice || 0).replace(/[^0-9.]/g, '')) || 0), 0);
      const totalProfit = smDeals.reduce((sum, d) => sum + (parseFloat(String(d.profit || 0).replace(/[^0-9.]/g, '')) || 0), 0);

      const conversionRate = totalLeadsCount > 0 
        ? ((dealsClosedCount / totalLeadsCount) * 100).toFixed(1) 
        : '0.0';

      let totalDays = 0;
      let validDealsForTime = 0;

      smDeals.forEach(d => {
        if (d.seller && d.seller.createdAt) {
          const diffTime = Math.abs(new Date(d.closingDate) - new Date(d.seller.createdAt));
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          totalDays += diffDays;
          validDealsForTime += 1;
        }
      });

      const avgDealTimeDays = validDealsForTime > 0 
        ? (totalDays / validDealsForTime).toFixed(1) 
        : 'N/A';

      return {
        salesmanId: sm.id,
        salesmanName: sm.name,
        email: sm.email,
        phone: sm.phone,
        totalLeads: totalLeadsCount,
        dealsClosed: dealsClosedCount,
        activeLeads: activeLeadsCount,
        pendingLeads: pendingLeadsCount,
        finishedDeals: finishedSellersCount,
        incompleteLeads: incompleteLeadsCount,
        totalRevenue,
        totalProfit,
        conversionRate: `${conversionRate}%`,
        avgDealTime: avgDealTimeDays === 'N/A' ? 'N/A' : `${avgDealTimeDays} days`
      };
    });

    // Filter out dummy/empty salesmen with 0 leads/deals in period and sort by volume
    const activeReports = reportData
      .filter(r => r.totalLeads > 0 || r.dealsClosed > 0)
      .sort((a, b) => b.totalLeads - a.totalLeads);

    return res.json({
      range,
      startDate: start,
      endDate: end,
      reports: activeReports
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate performance reports', error: error.message });
  }
};

const exportReportsCSV = async (req, res) => {
  try {
    const { range = 'This Month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    const salesmen = await prisma.user.findMany({
      where: { role: 'SALESMAN', status: 'ACTIVE' },
      select: { id: true, name: true, email: true }
    });

    let csvContent = 'Salesman,Email,Total Leads,Deals Closed,Active Leads,Pending Leads,Finished Deals,Incomplete Leads,Revenue (PKR),Profit (PKR),Conversion Rate,Avg Deal Time\n';

    for (const sm of salesmen) {
      const salesmanFilter = {
        OR: [
          { assignedTo: sm.id },
          { createdBy: sm.id }
        ]
      };

      const [totalLeads, activeLeads, pendingLeads, incompleteLeads, deals, finishedDeals] = await Promise.all([
        prisma.seller.count({ where: { ...salesmanFilter, createdAt: { gte: start, lte: end } } }),
        prisma.seller.count({ where: { ...salesmanFilter, leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] }, createdAt: { gte: start, lte: end } } }),
        prisma.seller.count({ where: { ...salesmanFilter, leadStatus: 'Follow Up', createdAt: { gte: start, lte: end } } }),
        prisma.seller.count({ where: { ...salesmanFilter, leadStatus: 'Incomplete', createdAt: { gte: start, lte: end } } }),
        prisma.deal.findMany({ where: { salesmanId: sm.id, closingDate: { gte: start, lte: end } }, include: { seller: true } }),
        prisma.seller.count({ where: { ...salesmanFilter, leadStatus: 'Deal Closed', updatedAt: { gte: start, lte: end } } })
      ]);

      if (totalLeads === 0 && deals.length === 0) continue; // Skip dummy entries

      const dealsClosed = deals.length;
      const revenue = deals.reduce((s, d) => s + (parseFloat(String(d.dealPrice || 0).replace(/[^0-9.]/g, '')) || 0), 0);
      const profit = deals.reduce((s, d) => s + (parseFloat(String(d.profit || 0).replace(/[^0-9.]/g, '')) || 0), 0);
      const rate = totalLeads > 0 ? ((dealsClosed / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

      let totalDays = 0, count = 0;
      deals.forEach(d => {
        if (d.seller?.createdAt) {
          totalDays += Math.abs(new Date(d.closingDate) - new Date(d.seller.createdAt)) / (1000 * 60 * 60 * 24);
          count++;
        }
      });
      const avgTime = count > 0 ? (totalDays / count).toFixed(1) + ' days' : 'N/A';

      csvContent += `"${sm.name}","${sm.email}",${totalLeads},${dealsClosed},${activeLeads},${pendingLeads},${finishedDeals},${incompleteLeads},${revenue},${profit},"${rate}","${avgTime}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=DMS_Sales_Report_${range.replace(/\s+/g, '_')}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: 'CSV export failed', error: error.message });
  }
};

// Bank Cases Financial & Ledger Report
const getBankCasesReport = async (req, res) => {
  try {
    const { range = 'This Month', startDate, endDate, status, bankName, search } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    const where = {
      isBankCase: true
    };

    if (range !== 'All Time') {
      where.createdAt = { gte: start, lte: end };
    }

    if (status && status !== 'ALL') {
      where.bankCaseStatus = status;
    }

    if (bankName && bankName !== 'ALL') {
      where.bankName = { equals: bankName, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { buyerName: { contains: q, mode: 'insensitive' } },
        { buyerPhone: { contains: q, mode: 'insensitive' } },
        { buyerCity: { contains: q, mode: 'insensitive' } },
        { vehicle: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { bankName: { contains: q, mode: 'insensitive' } },
        { bankCaseNo: { contains: q, mode: 'insensitive' } }
      ];
    }

    const cases = await prisma.buyer.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
        createdByUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: [
        { bankCaseNo: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Compute totals and stats
    let totalCases = cases.length;
    let confirmedCount = 0;
    let notConfirmedCount = 0;
    let inProgressCount = 0;
    let totalBudget = 0;
    let totalDownpayment = 0;
    let totalProcessingFees = 0;
    let totalDueAmount = 0;
    const bankSummary = {};

    cases.forEach(c => {
      const budget = Number(c.budget) || 0;
      const downpayment = Number(c.downpaymentAmount) || 0;
      const fees = Number(c.processingFees) || 0;
      const due = Number(c.dueAmount) || (budget - downpayment + fees);

      totalBudget += budget;
      totalDownpayment += downpayment;
      totalProcessingFees += fees;
      totalDueAmount += due;

      const st = c.bankCaseStatus || 'Not Confirmed';
      if (st === 'Confirmed') confirmedCount++;
      else if (st === 'Not Confirmed') notConfirmedCount++;
      else inProgressCount++;

      const bName = (c.bankName && c.bankName.trim()) ? c.bankName.trim() : 'Unspecified Bank';
      if (!bankSummary[bName]) {
        bankSummary[bName] = {
          bankName: bName,
          count: 0,
          confirmedCount: 0,
          totalBudget: 0,
          totalDownpayment: 0,
          totalDueAmount: 0
        };
      }
      bankSummary[bName].count++;
      if (st === 'Confirmed') bankSummary[bName].confirmedCount++;
      bankSummary[bName].totalBudget += budget;
      bankSummary[bName].totalDownpayment += downpayment;
      bankSummary[bName].totalDueAmount += due;
    });

    // Get list of distinct banks for dropdown
    const distinctBanks = await prisma.buyer.findMany({
      where: { isBankCase: true, bankName: { not: null } },
      select: { bankName: true },
      distinct: ['bankName']
    });
    const allBanksList = distinctBanks.map(b => b.bankName).filter(Boolean);

    return res.json({
      range,
      startDate: start,
      endDate: end,
      stats: {
        totalCases,
        confirmedCount,
        notConfirmedCount,
        inProgressCount,
        totalBudget,
        totalDownpayment,
        totalProcessingFees,
        totalDueAmount
      },
      bankSummary: Object.values(bankSummary).sort((a, b) => b.totalBudget - a.totalBudget),
      availableBanks: allBanksList,
      cases
    });
  } catch (error) {
    console.error('Error generating bank cases report:', error);
    return res.status(500).json({ message: 'Failed to generate bank cases report', error: error.message });
  }
};

// Export Bank Cases Financial Report CSV
const exportBankCasesReportCSV = async (req, res) => {
  try {
    const { range = 'This Month', startDate, endDate, status, bankName, search } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    const where = { isBankCase: true };
    if (range !== 'All Time') {
      where.createdAt = { gte: start, lte: end };
    }
    if (status && status !== 'ALL') {
      where.bankCaseStatus = status;
    }
    if (bankName && bankName !== 'ALL') {
      where.bankName = { equals: bankName, mode: 'insensitive' };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { buyerName: { contains: q, mode: 'insensitive' } },
        { buyerPhone: { contains: q, mode: 'insensitive' } },
        { buyerCity: { contains: q, mode: 'insensitive' } },
        { vehicle: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { bankName: { contains: q, mode: 'insensitive' } },
        { bankCaseNo: { contains: q, mode: 'insensitive' } }
      ];
    }

    const cases = await prisma.buyer.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true } }
      },
      orderBy: [{ bankCaseNo: 'asc' }, { createdAt: 'desc' }]
    });

    let csvContent = 'Case No,Status,Client Name,Phone,City,Financing Bank,Vehicle,Total Vehicle Price (PKR),Downpayment % (Given),Downpayment Amount Paid (PKR),Processing Fee (PKR),Remaining Bank Due (PKR),Salesman Officer,Created Date\n';

    cases.forEach(c => {
      const budget = Number(c.budget) || 0;
      const downPercent = Number(c.downpaymentPercent) || 0;
      const downAmount = Number(c.downpaymentAmount) || 0;
      const fee = Number(c.processingFees) || 0;
      const due = Number(c.dueAmount) || (budget - downAmount + fee);
      const dateStr = c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '';

      csvContent += `"${c.bankCaseNo || 'N/A'}","${c.bankCaseStatus || 'Not Confirmed'}","${c.buyerName}","${c.buyerPhone || ''}","${c.buyerCity || ''}","${c.bankName || 'Unspecified'}","${c.year || ''} ${c.vehicle} ${c.model}",${budget},${downPercent},${downAmount},${fee},${due},"${c.assignedUser?.name || 'Unassigned'}","${dateStr}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=AL_ASR_Bank_Cases_Report_${range.replace(/\s+/g, '_')}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: 'Bank cases CSV export failed', error: error.message });
  }
};

module.exports = {
  getSalesmenReports,
  exportReportsCSV,
  getBankCasesReport,
  exportBankCasesReportCSV
};
