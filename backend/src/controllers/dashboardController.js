const prisma = require('../config/db');
const { parsePakistaniPrice } = require('../utils/priceParser');

let dashboardCache = {};
const DASHBOARD_CACHE_TTL = 10000; // 10 seconds

const getDashboardStats = async (req, res) => {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const userId = req.user.id;
    const cacheKey = `${req.user.role}_${userId}`;

    if (dashboardCache[cacheKey] && (Date.now() - dashboardCache[cacheKey].timestamp < DASHBOARD_CACHE_TTL)) {
      return res.json(dashboardCache[cacheKey].data);
    }

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
          include: {
            seller: { select: { id: true, vehicle: true, model: true, demandPrice: true } },
            buyer: { select: { id: true, buyerName: true, buyerPhone: true } }
          },
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
      const monthlyRevenue = monthlyDeals.reduce((sum, d) => sum + parsePakistaniPrice(d.dealPrice), 0);
      const monthlyProfit = monthlyDeals.reduce((sum, d) => sum + parsePakistaniPrice(d.profit), 0);

      const recentActivity = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 8
      });

      const responsePayload = {
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
      };

      dashboardCache[cacheKey] = { data: responsePayload, timestamp: Date.now() };
      return res.json(responsePayload);

    } else {
      // Admin Dashboard Metrics - Query Optimization with single groupBy pass
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
        groupedStatus,
        recentActivity
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
            seller: { select: { id: true, vehicle: true, model: true } },
            buyer: { select: { id: true, buyerName: true } }
          },
          orderBy: { closingDate: 'desc' }
        }),
        prisma.seller.count({ where: { leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] } } }),
        prisma.seller.count({ where: { leadStatus: { in: ['Lost', 'Cancelled'] } } }),
        prisma.user.count({ where: { status: 'PENDING', role: 'SALESMAN' } }),
        prisma.seller.groupBy({
          by: ['leadStatus'],
          _count: { _all: true }
        }),
        prisma.activityLog.findMany({
          include: { user: { select: { name: true, email: true, role: true } } },
          orderBy: { timestamp: 'desc' },
          take: 10
        })
      ]);

      const totalRevenue = allDeals.reduce((sum, d) => sum + parsePakistaniPrice(d.dealPrice), 0);
      const totalProfit = allDeals.reduce((sum, d) => sum + parsePakistaniPrice(d.profit), 0);

      // Calculate Top Salesman
      const salesmanSalesMap = {};
      allDeals.forEach(deal => {
        const smId = deal.salesmanId;
        const smName = deal.salesman?.name || 'Unknown';
        if (!salesmanSalesMap[smId]) {
          salesmanSalesMap[smId] = { id: smId, name: smName, revenue: 0, dealsCount: 0 };
        }
        const dealPriceNum = parsePakistaniPrice(deal.dealPrice);
        salesmanSalesMap[smId].revenue += dealPriceNum;
        salesmanSalesMap[smId].dealsCount += 1;
      });

      const topSalesmen = Object.values(salesmanSalesMap).sort((a, b) => b.revenue - a.revenue);
      const topSalesman = topSalesmen[0] || { name: 'N/A', revenue: 0, dealsCount: 0 };

      // Pipeline breakdown calculation from single groupBy query
      const statuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];
      const pipelineBreakdown = {};
      statuses.forEach(s => { pipelineBreakdown[s] = 0; });
      groupedStatus.forEach(g => {
        if (g.leadStatus) {
          pipelineBreakdown[g.leadStatus] = g._count._all;
        }
      });

      const responsePayload = {
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
      };

      dashboardCache[cacheKey] = { data: responsePayload, timestamp: Date.now() };
      return res.json(responsePayload);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate dashboard metrics', error: error.message });
  }
};

module.exports = { getDashboardStats };
