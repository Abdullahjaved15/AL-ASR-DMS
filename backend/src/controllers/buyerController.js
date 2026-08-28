const prisma = require('../config/db');
const { formatPakistaniPhone } = require('../utils/phoneFormatter');

const getBuyers = async (req, res) => {
  try {
    const { search, leadStatus, assignedTo, city, vehicle, model, minYear, maxYear, year, minPrice, maxPrice, isBankCase, isCommercial, vehicleType, fromDate, toDate } = req.query;

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

    if (isCommercial !== undefined && isCommercial !== '') {
      where.isCommercial = isCommercial === 'true' || isCommercial === true;
    }

    if (vehicleType) {
      where.vehicleType = { contains: vehicleType, mode: 'insensitive' };
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
      orderBy: [
        { registrationDate: 'desc' },
        { createdAt: 'desc' }
      ]
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

const getNextBankCaseNo = async () => {
  const result = await prisma.buyer.aggregate({
    _max: { bankCaseNo: true }
  });
  return (result._max.bankCaseNo || 0) + 1;
};

const createBuyer = async (req, res) => {
  try {
    // Only Admin and Super Admin can create buyer records
    if (req.user.role === 'SALESMAN') {
      return res.status(403).json({ message: 'Access denied: Only Administrators can add buyer records.' });
    }

    const {
      vehicle, model, year, color, mileage, budget,
      carCondition, zeroMeterType, isCommercial, vehicleType,
      isBankCase, bankName, bankCaseStatus, bankChecklist, processingFees, downpaymentPercent,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, leadReferredBy, assignedTo, leadStatus, comments
    } = req.body;

    const numBudget = budget !== undefined && budget !== '' ? (parseFloat(budget) || 0) : 0;
    const numDownPercent = parseFloat(downpaymentPercent) || 0;
    const numProcessingFees = parseFloat(processingFees) || 0;
    
    // Downpayment calculated on Vehicle Price
    const numDownAmount = isBankCase ? (numBudget * (numDownPercent / 100)) : 0;
    
    // Processing fees added AFTER subtracting downpayment
    const calculatedDueAmount = isBankCase ? ((numBudget - numDownAmount) + numProcessingFees) : 0;

    const assignedSalesman = assignedTo || req.user.id;
    const commercialFlag = Boolean(isCommercial) || vehicleType === 'Commercial';

    // Bank Case Confirmation & Case # Logic
    const targetBankCaseStatus = isBankCase ? (bankCaseStatus || 'Not Confirmed') : 'Not Confirmed';
    let assignedCaseNo = null;
    if (isBankCase && targetBankCaseStatus === 'Confirmed') {
      assignedCaseNo = await getNextBankCaseNo();
    }

    const newBuyer = await prisma.buyer.create({
      data: {
        createdBy: req.user.id,
        vehicle: vehicle || '',
        model: model || '',
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'Any',
        mileage: parseInt(mileage) || 0,
        budget: budget !== undefined && budget !== null ? String(budget) : '',
        carCondition: carCondition || 'Used',
        zeroMeterType: carCondition === 'Zero Meter' ? zeroMeterType || 'Cash' : null,
        isCommercial: commercialFlag,
        vehicleType: commercialFlag ? 'Commercial' : (vehicleType || 'Personal'),
        isBankCase: Boolean(isBankCase),
        bankName: isBankCase ? bankName || null : null,
        bankCaseStatus: targetBankCaseStatus,
        bankCaseNo: assignedCaseNo,
        bankChecklist: isBankCase ? bankChecklist || null : null,
        processingFees: isBankCase ? String(numProcessingFees) : '',
        downpaymentPercent: isBankCase ? String(numDownPercent) : '',
        downpaymentAmount: isBankCase ? String(numDownAmount) : '',
        dueAmount: isBankCase ? String(calculatedDueAmount) : '',
        buyerName: buyerName || '',
        buyerPhone: buyerPhone ? formatPakistaniPhone(buyerPhone) : '',
        buyerCity: buyerCity || '',
        leadSource: leadSource || 'Website',
        leadReference: leadReference || null,
        leadReferredBy: leadReferredBy || null,
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
        details: `Added buyer inquiry ${buyerName || 'N/A'} for ${vehicle || ''} ${model || ''} (Type: ${commercialFlag ? 'Commercial' : 'Personal'}, Bank Case: ${isBankCase ? 'YES (' + (bankName || 'Bank') + ', Status: ' + targetBankCaseStatus + (assignedCaseNo ? ', Case #' + assignedCaseNo : '') + ')' : 'NO'})`
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
      carCondition, zeroMeterType, isCommercial, vehicleType,
      isBankCase, bankName, bankCaseStatus, bankChecklist, processingFees, downpaymentPercent,
      buyerName, buyerPhone, buyerCity,
      leadSource, leadReference, leadReferredBy, assignedTo, leadStatus, comments
    } = req.body;

    const updateData = {};
    if (vehicle !== undefined) updateData.vehicle = vehicle;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = String(year);
    if (color !== undefined) updateData.color = color;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage) || 0;
    if (carCondition !== undefined) updateData.carCondition = carCondition;
    if (zeroMeterType !== undefined) updateData.zeroMeterType = carCondition === 'Zero Meter' ? zeroMeterType : null;
    if (isCommercial !== undefined) {
      updateData.isCommercial = Boolean(isCommercial);
      updateData.vehicleType = Boolean(isCommercial) ? 'Commercial' : (vehicleType || 'Personal');
    } else if (vehicleType !== undefined) {
      updateData.vehicleType = vehicleType;
      updateData.isCommercial = vehicleType === 'Commercial';
    }
    
    const targetIsBankCase = isBankCase !== undefined ? Boolean(isBankCase) : existingBuyer.isBankCase;

    if (budget !== undefined || isBankCase !== undefined || downpaymentPercent !== undefined || processingFees !== undefined) {
      const budgetStr = budget !== undefined ? (budget !== null ? String(budget) : '') : (existingBuyer.budget || '');
      const targetBudget = parseFloat(String(budgetStr).replace(/[^0-9.]/g, '')) || 0;
      const targetDownPercent = downpaymentPercent !== undefined ? (parseFloat(downpaymentPercent) || 0) : (parseFloat(existingBuyer.downpaymentPercent) || 0);
      const targetProcessingFees = processingFees !== undefined ? (parseFloat(processingFees) || 0) : (parseFloat(existingBuyer.processingFees) || 0);

      updateData.budget = budgetStr;
      updateData.isBankCase = targetIsBankCase;
      updateData.processingFees = targetIsBankCase ? String(targetProcessingFees) : '';
      updateData.downpaymentPercent = targetIsBankCase ? String(targetDownPercent) : '';
      
      const computedDownAmount = targetIsBankCase ? (targetBudget * (targetDownPercent / 100)) : 0;
      const computedDueAmount = targetIsBankCase ? ((targetBudget - computedDownAmount) + targetProcessingFees) : 0;

      updateData.downpaymentAmount = targetIsBankCase ? String(computedDownAmount) : '';
      updateData.dueAmount = targetIsBankCase ? String(computedDueAmount) : '';
    }

    // Handle Bank Case Status & Case # updates
    if (bankCaseStatus !== undefined || isBankCase !== undefined) {
      const statusToSet = targetIsBankCase ? (bankCaseStatus !== undefined ? bankCaseStatus : (existingBuyer.bankCaseStatus || 'Not Confirmed')) : 'Not Confirmed';
      updateData.bankCaseStatus = statusToSet;

      if (targetIsBankCase && statusToSet === 'Confirmed') {
        // If not already assigned a case number, assign the next one
        if (!existingBuyer.bankCaseNo) {
          updateData.bankCaseNo = await getNextBankCaseNo();
        }
      } else {
        // If not confirmed or not bank case, clear case number
        updateData.bankCaseNo = null;
      }
    }

    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankChecklist !== undefined) updateData.bankChecklist = bankChecklist;
    if (buyerName !== undefined) updateData.buyerName = buyerName;
    if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone ? formatPakistaniPhone(buyerPhone) : '';
    if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (leadReference !== undefined) updateData.leadReference = leadReference;
    if (leadReferredBy !== undefined) updateData.leadReferredBy = leadReferredBy;
    if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
    if (comments !== undefined) updateData.comments = comments;

    if (isAdminUser && assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    // If requester is ADMIN (not SUPER_ADMIN), route to Approval Request workflow
    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'BUYER',
          entityId: id,
          entityName: `${existingBuyer.buyerName || 'Buyer'} - ${existingBuyer.vehicle || ''} ${existingBuyer.model || ''}`.trim(),
          action: 'EDIT',
          status: 'PENDING',
          requestedById: req.user.id,
          proposedData: updateData,
          currentData: existingBuyer,
          reason: req.body.reason || 'Admin submitted changes for buyer inquiry'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested EDIT approval for buyer inquiry #${id} (${existingBuyer.buyerName})`
        }
      });

      return res.json({
        message: 'Your edit request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
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
        details: `Updated buyer lead ${updatedBuyer.buyerName || 'N/A'} (${updatedBuyer.vehicle || ''})`
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

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && existingBuyer.assignedTo !== req.user.id && existingBuyer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own buyer leads' });
    }

    // If requester is ADMIN (not SUPER_ADMIN), route to Approval Request workflow
    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'BUYER',
          entityId: id,
          entityName: `${existingBuyer.buyerName || 'Buyer'} - ${existingBuyer.vehicle || ''} ${existingBuyer.model || ''}`.trim(),
          action: 'DELETE',
          status: 'PENDING',
          requestedById: req.user.id,
          currentData: existingBuyer,
          reason: req.body?.reason || 'Admin requested deletion of buyer inquiry'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested DELETE approval for buyer inquiry #${id} (${existingBuyer.buyerName})`
        }
      });

      return res.json({
        message: 'Deletion request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
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
