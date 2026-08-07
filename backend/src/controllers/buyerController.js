const prisma = require('../config/db');
const { formatPakistaniPhone } = require('../utils/phoneFormatter');

const getBuyers = async (req, res) => {
  try {
    const { search, leadStatus, assignedTo, city, vehicle, model, minYear, maxYear, year, minPrice, maxPrice, isBankCase } = req.query;

    const where = {};

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (leadStatus) {
      where.leadStatus = leadStatus;
    }

    if (isBankCase !== undefined && isBankCase !== '') {
      where.isBankCase = isBankCase === 'true' || isBankCase === true;
    }

    if (city) {
      where.buyerCity = { contains: city, mode: 'insensitive' };
    }

    if (vehicle) {
      where.vehicle = { contains: vehicle, mode: 'insensitive' };
    }

    if (model) {
      where.model = { contains: model, mode: 'insensitive' };
    }

    // Year Filter
    if (year) {
      where.year = parseInt(year);
    } else if (minYear || maxYear) {
      where.year = {};
      if (minYear) where.year.gte = parseInt(minYear);
      if (maxYear) where.year.lte = parseInt(maxYear);
    }

    // Price Filter (budget for buyers)
    if (minPrice || maxPrice) {
      where.budget = {};
      if (minPrice) where.budget.gte = parseFloat(minPrice);
      if (maxPrice) where.budget.lte = parseFloat(maxPrice);
    }

    if (search) {
      const searchFilter = [
        { buyerName: { contains: search, mode: 'insensitive' } },
        { buyerPhone: { contains: search, mode: 'insensitive' } },
        { buyerCity: { contains: search, mode: 'insensitive' } },
        { vehicle: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { comments: { contains: search, mode: 'insensitive' } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchFilter }
        ];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const buyers = await prisma.buyer.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(buyers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch buyers', error: error.message });
  }
};

const getBuyerById = async (req, res) => {
  try {
    const { id } = req.params;

    const buyer = await prisma.buyer.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, phone: true } },
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
        deals: true
      }
    });

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer record not found' });
    }

    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isAdminUser && buyer.assignedTo !== req.user.id && buyer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this buyer lead' });
    }

    return res.json(buyer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch buyer details', error: error.message });
  }
};

const createBuyer = async (req, res) => {
  try {
    const {
      vehicle, model, year, color, mileage, budget,
      isBankCase, bankName, bankChecklist,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    if (!vehicle || !model || !budget || !buyerName || !buyerPhone || !buyerCity) {
      return res.status(400).json({ message: 'Vehicle, model, budget, buyer name, phone, and city are required' });
    }

    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const assignedSalesman = (isAdminUser && assignedTo) ? assignedTo : req.user.id;

    const newBuyer = await prisma.buyer.create({
      data: {
        createdBy: req.user.id,
        vehicle,
        model,
        year: parseInt(year) || new Date().getFullYear(),
        color: color || 'Any',
        mileage: parseInt(mileage) || 0,
        budget: parseFloat(budget),
        isBankCase: Boolean(isBankCase),
        bankName: bankName || null,
        bankChecklist: bankChecklist || null,
        buyerName,
        buyerPhone: formatPakistaniPhone(buyerPhone),
        buyerCity,
        leadSource: leadSource || 'Website',
        leadReference: leadReference || null,
        assignedTo: assignedSalesman,
        leadStatus: leadStatus || 'New Lead',
        comments: comments || null
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_BUYER',
        details: `Added buyer inquiry ${buyerName} for ${vehicle} ${model} (Bank Case: ${isBankCase ? 'YES (' + (bankName || 'Unspecified Bank') + ')' : 'NO'})`
      }
    });

    return res.status(201).json(newBuyer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create buyer', error: error.message });
  }
};

const updateBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const existingBuyer = await prisma.buyer.findUnique({ where: { id } });

    if (!existingBuyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isAdminUser && existingBuyer.assignedTo !== req.user.id && existingBuyer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only edit your own leads' });
    }

    const {
      vehicle, model, year, color, mileage, budget,
      isBankCase, bankName, bankChecklist,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    const updateData = {};
    if (vehicle) updateData.vehicle = vehicle;
    if (model) updateData.model = model;
    if (year) updateData.year = parseInt(year);
    if (color) updateData.color = color;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);
    if (budget) updateData.budget = parseFloat(budget);
    if (isBankCase !== undefined) updateData.isBankCase = Boolean(isBankCase);
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankChecklist !== undefined) updateData.bankChecklist = bankChecklist;
    if (buyerName) updateData.buyerName = buyerName;
    if (buyerPhone) updateData.buyerPhone = formatPakistaniPhone(buyerPhone);
    if (buyerCity) updateData.buyerCity = buyerCity;
    if (leadSource) updateData.leadSource = leadSource;
    if (leadReference !== undefined) updateData.leadReference = leadReference;
    if (leadStatus) updateData.leadStatus = leadStatus;
    if (comments !== undefined) updateData.comments = comments;

    if (isAdminUser && assignedTo) {
      updateData.assignedTo = assignedTo;
    }

    const updatedBuyer = await prisma.buyer.update({
      where: { id },
      data: updateData,
      include: {
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_BUYER',
        details: `Updated buyer lead ${updatedBuyer.buyerName} (${updatedBuyer.vehicle})`
      }
    });

    return res.json(updatedBuyer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update buyer', error: error.message });
  }
};

const deleteBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const existingBuyer = await prisma.buyer.findUnique({ where: { id } });

    if (!existingBuyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    if (req.user.role !== 'ADMIN' && existingBuyer.assignedTo !== req.user.id && existingBuyer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own buyer leads' });
    }

    await prisma.buyer.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_BUYER',
        details: `Deleted buyer record ${existingBuyer.buyerName}`
      }
    });

    return res.json({ message: 'Buyer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete buyer', error: error.message });
  }
};

module.exports = {
  getBuyers,
  getBuyerById,
  createBuyer,
  updateBuyer,
  deleteBuyer
};
