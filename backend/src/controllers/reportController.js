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

    // Fetch active salesmen
    const salesmen = await prisma.user.findMany({
      where: { role: 'SALESMAN' },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    });

    const reportData = await Promise.all(
      salesmen.map(async (sm) => {
        const salesmanFilter = {
          OR: [
            { assignedTo: sm.id },
            { createdBy: sm.id }
          ]
        };

        const [
          totalLeadsCount,
          activeLeadsCount,
          pendingLeadsCount,
          incompleteLeadsCount,
          dealsClosedList,
          finishedSellersCount
        ] = await Promise.all([
          prisma.seller.count({
            where: {
              ...salesmanFilter,
              createdAt: { gte: start, lte: end }
            }
          }),
          prisma.seller.count({
            where: {
              ...salesmanFilter,
              leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] },
              createdAt: { gte: start, lte: end }
            }
          }),
          prisma.seller.count({
            where: {
              ...salesmanFilter,
              leadStatus: 'Follow Up',
              createdAt: { gte: start, lte: end }
            }
          }),
          prisma.seller.count({
            where: {
              ...salesmanFilter,
              leadStatus: 'Incomplete',
              createdAt: { gte: start, lte: end }
            }
          }),
          prisma.deal.findMany({
            where: {
              salesmanId: sm.id,
              closingDate: { gte: start, lte: end }
            },
            include: { seller: true }
          }),
          prisma.seller.count({
            where: {
              ...salesmanFilter,
              leadStatus: 'Deal Closed',
              updatedAt: { gte: start, lte: end }
            }
          })
        ]);

        const dealsClosedCount = dealsClosedList.length;
        const totalRevenue = dealsClosedList.reduce((sum, d) => sum + d.dealPrice, 0);
        const totalProfit = dealsClosedList.reduce((sum, d) => sum + d.profit, 0);

        // Conversion Rate = (Deals Closed / Total Leads) * 100
        const conversionRate = totalLeadsCount > 0 
          ? ((dealsClosedCount / totalLeadsCount) * 100).toFixed(1) 
          : '0.0';

        // Average Deal Time (in days)
        let totalDays = 0;
        let validDealsForTime = 0;

        dealsClosedList.forEach(d => {
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
      })
    );

    return res.json({
      range,
      startDate: start,
      endDate: end,
      reports: reportData
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
      where: { role: 'SALESMAN' },
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

      const dealsClosed = deals.length;
      const revenue = deals.reduce((s, d) => s + d.dealPrice, 0);
      const profit = deals.reduce((s, d) => s + d.profit, 0);
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

module.exports = { getSalesmenReports, exportReportsCSV };
