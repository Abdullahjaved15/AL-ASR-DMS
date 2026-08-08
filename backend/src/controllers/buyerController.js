const prisma = require('../config/db');
const { formatPakistaniPhone } = require('../utils/phoneFormatter');

const getBuyers = async (req, res) => {
  try {
    const { search, leadStatus, assignedTo, city, vehicle, model, minYear, maxYear, year, minPrice, maxPrice, isBankCase, fromDate, toDate } = req.query;

    const where = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        const toEnd = new Date(toDate);
        toEnd.setHours(23, 59, 59, 999);
        where.createdAt.lte = toEnd;
      }
    }

    if (assignedTo) {
      const targetUser = await prisma.user.findUnique({ where: { id: assignedTo }, select: { name: true } });
      const searchName = targetUser?.name ? targetUser.name.replace(/^(mr\.|ma'am|mrs\.)\s+/i, '').trim() : '';

      where.OR = [
        { assignedTo: assignedTo },
        { createdBy: assignedTo }
      ];
      if (searchName && searchName.length >= 3) {
        where.OR.push({ leadReference: { contains: searchName, mode: 'insensitive' } });
      }
    }

    if (leadStatus) {
      where.leadStatus = leadStatus;
    }

    if (req.user.role === 'SALESMAN') {
      if (isBankCase === 'true' || isBankCase === true) {
        return res.status(403).json({ message: 'Access denied: Bank cases are restricted exclusively to Administrators.' });
      }
    } else if (isBankCase !== undefined && isBankCase !== '') {
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
      where.year = { contains: year.toString(), mode: 'insensitive' };
    } else if (minYear || maxYear) {
      where.year = {};
      if (minYear) where.year.gte = minYear.toString();
      if (maxYear) where.year.lte = maxYear.toString();
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
        createdByUser: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        deals: true
      }
    });

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer lead not found' });
    }

    // Salesman scope restriction
    if (req.user.role === 'SALESMAN' && buyer.assignedTo !== req.user.id && buyer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this buyer lead' });
    }

    return res.json(buyer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch buyer details', error: error.message });
  }
};

const createBuyer = async (req, res) => {
  try {
    // Only Admin and Super Admin can create buyer records
    if (req.user.role === 'SALESMAN') {
      return res.status(403).json({ message: 'Access denied: Only Administrators can add buyer records.' });
    }

    const {
      vehicle, model, year, color, mileage, budget,
      carCondition, zeroMeterType,
      isBankCase, bankName, bankChecklist, processingFees, downpaymentPercent,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    if (!vehicle || !model || !budget || !buyerName || !buyerPhone || !buyerCity) {
      return res.status(400).json({ message: 'Vehicle, model, budget/total amount, buyer name, phone, and city are required' });
    }

    const numBudget = parseFloat(budget) || 0;
    const numDownPercent = parseFloat(downpaymentPercent) || 0;
    const numProcessingFees = parseFloat(processingFees) || 0;
    
    // Downpayment calculated on Vehicle Price
    const numDownAmount = isBankCase ? (numBudget * (numDownPercent / 100)) : 0;
    
    // Processing fees added AFTER subtracting downpayment
    const calculatedDueAmount = isBankCase ? ((numBudget - numDownAmount) + numProcessingFees) : 0;

    const assignedSalesman = assignedTo || req.user.id;

    const newBuyer = await prisma.buyer.create({
      data: {
        createdBy: req.user.id,
        vehicle,
        model,
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'Any',
        mileage: parseInt(mileage) || 0,
        budget: numBudget,
        carCondition: carCondition || 'Used',
        zeroMeterType: carCondition === 'Zero Meter' ? zeroMeterType || 'Cash' : null,
        isBankCase: Boolean(isBankCase),
        bankName: isBankCase ? bankName || null : null,
        bankChecklist: isBankCase ? bankChecklist || null : null,
        processingFees: isBankCase ? numProcessingFees : 0,
        downpaymentPercent: isBankCase ? numDownPercent : 0,
        downpaymentAmount: numDownAmount,
        dueAmount: calculatedDueAmount,
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
        details: `Added buyer inquiry ${buyerName} for ${vehicle} ${model} (Bank Case: ${isBankCase ? 'YES (' + (bankName || 'Bank') + ')' : 'NO'})`
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
      carCondition, zeroMeterType,
      isBankCase, bankName, bankChecklist, processingFees, downpaymentPercent,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    const updateData = {};
    if (vehicle !== undefined) updateData.vehicle = vehicle;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = String(year);
    if (color !== undefined) updateData.color = color;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);
    if (carCondition !== undefined) updateData.carCondition = carCondition;
    if (zeroMeterType !== undefined) updateData.zeroMeterType = carCondition === 'Zero Meter' ? zeroMeterType : null;
    
    if (budget !== undefined || isBankCase !== undefined || downpaymentPercent !== undefined || processingFees !== undefined) {
      const targetBudget = budget !== undefined ? parseFloat(budget) : existingBuyer.budget;
      const targetIsBankCase = isBankCase !== undefined ? Boolean(isBankCase) : existingBuyer.isBankCase;
      const targetDownPercent = downpaymentPercent !== undefined ? parseFloat(downpaymentPercent) : (existingBuyer.downpaymentPercent || 0);
      const targetProcessingFees = processingFees !== undefined ? parseFloat(processingFees) : (existingBuyer.processingFees || 0);

      updateData.budget = targetBudget;
      updateData.isBankCase = targetIsBankCase;
      updateData.processingFees = targetIsBankCase ? targetProcessingFees : 0;
      updateData.downpaymentPercent = targetIsBankCase ? targetDownPercent : 0;
      
      const computedDownAmount = targetIsBankCase ? (targetBudget * (targetDownPercent / 100)) : 0;
      const computedDueAmount = targetIsBankCase ? ((targetBudget - computedDownAmount) + targetProcessingFees) : 0;

      updateData.downpaymentAmount = computedDownAmount;
      updateData.dueAmount = computedDueAmount;
    }

    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankChecklist !== undefined) updateData.bankChecklist = bankChecklist;
    if (buyerName !== undefined) updateData.buyerName = buyerName;
    if (buyerPhone !== undefined) updateData.buyerPhone = formatPakistaniPhone(buyerPhone);
    if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (leadReference !== undefined) updateData.leadReference = leadReference;
    if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
    if (comments !== undefined) updateData.comments = comments;

    if (isAdminUser && assignedTo !== undefined) {
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
