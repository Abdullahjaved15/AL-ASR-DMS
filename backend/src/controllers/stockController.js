const prisma = require('../config/db');
const { parsePakistaniPrice } = require('../utils/priceParser');

const safeFloat = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

const safeInt = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const checkCanManageStock = (req, res) => {
  const allowed = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD', 'ACCOUNTANT'];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Access denied: Stock management is restricted to Administrators and Accounts.' });
    return false;
  }
  return true;
};

const getCurrentStock = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { vehicle: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { careOf: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const stock = await prisma.currentStock.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const totalUnits = stock.length;
    const totalValuation = stock.reduce((sum, item) => sum + parsePakistaniPrice(item.askingPrice), 0);
    const totalPurchaseValuation = stock.reduce((sum, item) => sum + parsePakistaniPrice(item.purchasePrice), 0);
    const projectedProfit = totalValuation - totalPurchaseValuation;
    const availableUnits = stock.filter(item => item.status === 'AVAILABLE').length;
    const reservedUnits = stock.filter(item => item.status === 'RESERVED').length;
    const atCustomerUnits = stock.filter(item => item.status === 'AT_CUSTOMER' || item.status === 'At Customer').length;
    const soldUnits = stock.filter(item => item.status === 'SOLD').length;

    return res.json({
      stock,
      stats: {
        totalUnits,
        totalValuation,
        totalPurchaseValuation,
        projectedProfit,
        availableUnits,
        reservedUnits,
        atCustomerUnits,
        soldUnits,
        avgPrice: totalUnits > 0 ? Math.round(totalValuation / totalUnits) : 0,
        avgPurchasePrice: totalUnits > 0 ? Math.round(totalPurchaseValuation / totalUnits) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch current stock', error: error.message });
  }
};

const createStockItem = async (req, res) => {
  if (!checkCanManageStock(req, res)) return;

  try {
    const { vehicle, model, year, color, mileage, askingPrice, purchasePrice, status, location, notes, careOf, regNumber } = req.body;

    const parsedAskingPrice = askingPrice !== undefined && askingPrice !== null && String(askingPrice).trim() !== '' ? parsePakistaniPrice(askingPrice) : null;
    const parsedPurchasePrice = purchasePrice !== undefined && purchasePrice !== null && String(purchasePrice).trim() !== '' ? parsePakistaniPrice(purchasePrice) : null;

    const newStock = await prisma.currentStock.create({
      data: {
        vehicle: (vehicle && String(vehicle).trim()) ? String(vehicle).trim() : 'Vehicle',
        model: (model && String(model).trim()) ? String(model).trim() : 'Car',
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'White',
        mileage: safeInt(mileage, 0),
        askingPrice: parsedAskingPrice ? String(parsedAskingPrice) : '',
        purchasePrice: parsedPurchasePrice ? String(parsedPurchasePrice) : '',
        status: status || 'AVAILABLE',
        location: location || 'Main Showroom',
        notes: notes || null,
        careOf: careOf || 'AL Asr',
        regNumber: regNumber || null
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_CURRENT_STOCK',
        details: `Added Stock Entry: ${year} ${vehicle || 'Vehicle'} ${model || 'Car'} (Asking: Rs. ${parsedAskingPrice ? parsedAskingPrice.toLocaleString() : 0} | Cost: Rs. ${parsedPurchasePrice ? parsedPurchasePrice.toLocaleString() : 0})`
      }
    });

    return res.status(201).json(newStock);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create stock entry', error: error.message });
  }
};

const updateStockItem = async (req, res) => {
  if (!checkCanManageStock(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.currentStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    const {
      vehicle,
      model,
      year,
      color,
      mileage,
      askingPrice,
      purchasePrice,
      status,
      location,
      notes,
      careOf,
      regNumber
    } = req.body;

    const parsedAskingPrice = askingPrice !== undefined ? (askingPrice !== null && String(askingPrice).trim() !== '' ? String(parsePakistaniPrice(askingPrice)) : '') : existing.askingPrice;
    const parsedPurchasePrice = purchasePrice !== undefined ? (purchasePrice !== null && String(purchasePrice).trim() !== '' ? String(parsePakistaniPrice(purchasePrice)) : '') : existing.purchasePrice;

    const updateData = {
      vehicle: (vehicle !== undefined && vehicle !== null && String(vehicle).trim()) ? String(vehicle).trim() : existing.vehicle,
      model: (model !== undefined && model !== null && String(model).trim()) ? String(model).trim() : existing.model,
      year: year !== undefined ? String(year) : existing.year,
      color: color !== undefined ? String(color) : existing.color,
      mileage: mileage !== undefined ? safeInt(mileage, existing.mileage) : existing.mileage,
      askingPrice: parsedAskingPrice,
      purchasePrice: parsedPurchasePrice,
      status: status !== undefined ? status : existing.status,
      location: location !== undefined ? location : existing.location,
      notes: notes !== undefined ? notes : existing.notes,
      careOf: careOf !== undefined ? careOf : existing.careOf,
      regNumber: regNumber !== undefined ? regNumber : existing.regNumber
    };

    // If requester is ADMIN or ACCOUNTANT (and not SUPER_ADMIN / ACCOUNTS_HEAD), route to Approval Request workflow
    if (req.user.role === 'ADMIN' || req.user.role === 'ACCOUNTANT') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'CURRENT_STOCK',
          entityId: id,
          entityName: `${existing.year || ''} ${existing.vehicle || ''} ${existing.model || ''} (Plate: ${existing.regNumber || 'UNREGISTERED'})`.trim(),
          action: 'EDIT',
          status: 'PENDING',
          requestedById: req.user.id,
          proposedData: updateData,
          currentData: existing,
          reason: req.body.reason || 'Staff submitted changes for stock vehicle'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `${req.user.role} requested EDIT approval for stock #${id} (${existing.vehicle} ${existing.model})`
        }
      });

      return res.json({
        message: 'Your edit request has been submitted for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    const updated = await prisma.currentStock.update({
      where: { id },
      data: updateData
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CURRENT_STOCK',
        details: `Updated Stock #${id}: ${updated.vehicle} ${updated.model}`
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error updating stock entry:', error);
    return res.status(500).json({ message: 'Failed to update stock entry', error: error.message });
  }
};

const deleteStockItem = async (req, res) => {
  if (!checkCanManageStock(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.currentStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    // If requester is ADMIN or ACCOUNTANT (and not SUPER_ADMIN / ACCOUNTS_HEAD), route to Approval Request workflow
    if (req.user.role === 'ADMIN' || req.user.role === 'ACCOUNTANT') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'CURRENT_STOCK',
          entityId: id,
          entityName: `${existing.year || ''} ${existing.vehicle || ''} ${existing.model || ''} (Plate: ${existing.regNumber || 'UNREGISTERED'})`.trim(),
          action: 'DELETE',
          status: 'PENDING',
          requestedById: req.user.id,
          currentData: existing,
          reason: req.body?.reason || 'Staff requested deletion of stock vehicle'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `${req.user.role} requested DELETE approval for stock #${id} (${existing.vehicle} ${existing.model})`
        }
      });

      return res.json({
        message: 'Deletion request has been submitted for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    await prisma.currentStock.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_CURRENT_STOCK',
        details: `Deleted Stock #${id}: ${existing.vehicle} ${existing.model}`
      }
    });

    return res.json({ message: 'Stock entry deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete stock entry', error: error.message });
  }
};

module.exports = {
  getCurrentStock,
  createStockItem,
  updateStockItem,
  deleteStockItem
};
