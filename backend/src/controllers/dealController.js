const prisma = require('../config/db');

const getDeals = async (req, res) => {
  try {
    const { salesmanId, search } = req.query;

    const where = {};

    if (req.user.role !== 'ADMIN') {
      where.salesmanId = req.user.id;
    } else if (salesmanId) {
      where.salesmanId = salesmanId;
    }

    if (search) {
      where.OR = [
        { buyer: { buyerName: { contains: search } } },
        { seller: { sellerName: { contains: search } } },
        { seller: { vehicle: { contains: search } } },
        { seller: { model: { contains: search } } },
        { remarks: { contains: search } }
      ];
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        buyer: true,
        seller: {
          include: { images: true }
        },
        salesman: { select: { id: true, name: true, email: true } }
      },
      orderBy: { closingDate: 'desc' }
    });

    return res.json(deals);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
};

const createDeal = async (req, res) => {
  try {
    const { buyerId, sellerId, dealPrice, closingDate, remarks } = req.body;

    if (!buyerId || !sellerId || !dealPrice) {
      return res.status(400).json({ message: 'Buyer ID, Seller ID, and Deal Price are required' });
    }

    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      return res.status(404).json({ message: 'Seller vehicle not found' });
    }

    // RBAC check
    if (req.user.role !== 'ADMIN') {
      if (seller.assignedTo !== req.user.id && seller.createdBy !== req.user.id) {
        return res.status(403).json({ message: 'You can only close deals for your assigned seller leads' });
      }
    }

    const numericDealPrice = parseFloat(dealPrice);
    const calculatedProfit = numericDealPrice - seller.demandPrice;
    const salesmanToCredit = (req.user.role === 'ADMIN' && seller.assignedTo) ? seller.assignedTo : req.user.id;

    const newDeal = await prisma.deal.create({
      data: {
        buyerId,
        sellerId,
        salesmanId: salesmanToCredit,
        dealPrice: numericDealPrice,
        profit: calculatedProfit,
        closingDate: closingDate ? new Date(closingDate) : new Date(),
        remarks: remarks || null
      },
      include: {
        buyer: true,
        seller: true,
        salesman: { select: { id: true, name: true, email: true } }
      }
    });

    // Update status on seller and buyer
    await prisma.seller.update({
      where: { id: sellerId },
      data: { leadStatus: 'Deal Closed' }
    });

    await prisma.buyer.update({
      where: { id: buyerId },
      data: { leadStatus: 'Deal Closed' }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CLOSE_DEAL',
        details: `Closed deal for vehicle ${seller.vehicle} ${seller.model}. Price: $${numericDealPrice}, Profit: $${calculatedProfit}`
      }
    });

    return res.status(201).json(newDeal);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create deal', error: error.message });
  }
};

module.exports = { getDeals, createDeal };
