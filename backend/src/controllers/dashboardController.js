const prisma = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const isSalesman = req.user.role !== 'ADMIN';
    const userId = req.user.id;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (isSalesman) {
      // Salesman Dashboard Metrics
      const salesmanFilter = {
        OR: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      };

      const [
        mySellers,
        myBuyers,
        todaySellersCount,
        todayBuyersCount,
        myDeals,
        pendingLeadsCount,
        followUpLeadsCount
      ] = await Promise.all([
        prisma.seller.count({ where: salesmanFilter }),
        prisma.buyer.count({ where: salesmanFilter }),
        prisma.seller.count({
          where: {
            ...salesmanFilter,
            createdAt: { gte: startOfToday }
          }
        }),
        prisma.buyer.count({
          where: {
            ...salesmanFilter,
            createdAt: { gte: startOfToday }
          }
        }),
        prisma.deal.findMany({
          where: { salesmanId: userId },
          include: { seller: true, buyer: true },
          orderBy: { closingDate: 'desc' }
        }),
        prisma.seller.count({
          where: {
            ...salesmanFilter,
            leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] }
          }
        }),
        prisma.seller.count({
          where: {
            ...salesmanFilter,
            leadStatus: 'Follow Up'
          }
        })
      ]);

      const monthlyDeals = myDeals.filter(d => new Date(d.closingDate) >= startOfMonth);
      const monthlyRevenue = monthlyDeals.reduce((sum, d) => sum + d.dealPrice, 0);
      const monthlyProfit = monthlyDeals.reduce((sum, d) => sum + d.profit, 0);

      const recentActivity = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 8
      });

      return res.json({
        role: 'SALESMAN',
        metrics: {
          mySellers,
          myBuyers,
          todayLeads: todaySellersCount + todayBuyersCount,
          myClosedDeals: myDeals.length,
          myPendingLeads: pendingLeadsCount,
          myFollowUps: followUpLeadsCount,
          monthlyDealsCount: monthlyDeals.length,
          monthlyRevenue,
          monthlyProfit
        },
        recentDeals: myDeals.slice(0, 5),
        recentActivity
      });

    } else {
      // Admin Dashboard Metrics
      const [
        totalSellers,
        totalBuyers,
        todaySellers,
        todayBuyers,
        dealsToday,
        dealsThisMonth,
        allDeals,
        activeLeadsCount,
        lostLeadsCount,
        pendingSalesmenCount,
        allSalesmen
      ] = await Promise.all([
        prisma.seller.count(),
        prisma.buyer.count(),
        prisma.seller.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.buyer.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.deal.findMany({ where: { closingDate: { gte: startOfToday } } }),
        prisma.deal.findMany({ where: { closingDate: { gte: startOfMonth } } }),
        prisma.deal.findMany({
          include: {
            salesman: { select: { id: true, name: true, email: true } },
            seller: true,
            buyer: true
          },
          orderBy: { closingDate: 'desc' }
        }),
        prisma.seller.count({ where: { leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] } } }),
        prisma.seller.count({ where: { leadStatus: { in: ['Lost', 'Cancelled'] } } }),
        prisma.user.count({ where: { status: 'PENDING', role: 'SALESMAN' } }),
        prisma.user.findMany({ where: { role: 'SALESMAN', status: 'ACTIVE' } })
      ]);

      const totalRevenue = allDeals.reduce((sum, d) => sum + d.dealPrice, 0);
      const totalProfit = allDeals.reduce((sum, d) => sum + d.profit, 0);

      // Calculate Top Salesman
      const salesmanSalesMap = {};
      allDeals.forEach(deal => {
        const smId = deal.salesmanId;
        const smName = deal.salesman?.name || 'Unknown';
        if (!salesmanSalesMap[smId]) {
          salesmanSalesMap[smId] = { id: smId, name: smName, revenue: 0, dealsCount: 0 };
        }
        salesmanSalesMap[smId].revenue += deal.dealPrice;
        salesmanSalesMap[smId].dealsCount += 1;
      });

      const topSalesmen = Object.values(salesmanSalesMap).sort((a, b) => b.revenue - a.revenue);
      const topSalesman = topSalesmen[0] || { name: 'N/A', revenue: 0, dealsCount: 0 };

      // Pipeline breakdown calculation
      const statuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];
      const pipelineBreakdown = {};
      for (const status of statuses) {
        pipelineBreakdown[status] = await prisma.seller.count({ where: { leadStatus: status } });
      }

      const recentActivity = await prisma.activityLog.findMany({
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      return res.json({
        role: 'ADMIN',
        metrics: {
          totalSellers,
          totalBuyers,
          todayNewLeads: todaySellers + todayBuyers,
          dealsClosedToday: dealsToday.length,
          dealsClosedThisMonth: dealsThisMonth.length,
          activeLeads: activeLeadsCount,
          lostLeads: lostLeadsCount,
          pendingSalesmen: pendingSalesmenCount,
          totalRevenue,
          totalProfit,
          topSalesman
        },
        pipelineBreakdown,
        topSalesmenList: topSalesmen.slice(0, 5),
        recentDeals: allDeals.slice(0, 6),
        recentActivity
      });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate dashboard metrics', error: error.message });
  }
};

module.exports = { getDashboardStats };
