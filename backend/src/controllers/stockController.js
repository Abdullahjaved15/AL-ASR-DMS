const prisma = require('../config/db');

const checkAdmin = (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Access denied: Showroom Current Stock is restricted exclusively to Administrators.' });
    return false;
  }
  return true;
};

const getCurrentStock = async (req, res) => {
  if (!checkAdmin(req, res)) return;

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
    const totalValuation = stock.reduce((sum, item) => sum + (item.askingPrice || 0), 0);
    const availableUnits = stock.filter(item => item.status === 'AVAILABLE').length;
    const reservedUnits = stock.filter(item => item.status === 'RESERVED').length;

    return res.json({
      stock,
      stats: {
        totalUnits,
        totalValuation,
        availableUnits,
        reservedUnits,
        avgPrice: totalUnits > 0 ? Math.round(totalValuation / totalUnits) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch current stock', error: error.message });
  }
};

const createStockItem = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { vehicle, model, year, color, mileage, askingPrice, purchasePrice, status, location, notes, careOf, regNumber } = req.body;

    if (!vehicle || !model || !askingPrice) {
      return res.status(400).json({ message: 'Vehicle make, model, and asking price are required' });
    }

    const newStock = await prisma.currentStock.create({
      data: {
        vehicle,
        model,
        year: parseInt(year) || new Date().getFullYear(),
        color: color || 'White',
        mileage: parseInt(mileage) || 0,
        askingPrice: parseFloat(askingPrice),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
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
        details: `Added Showroom Stock: ${year} ${vehicle} ${model} (Rs. ${askingPrice})`
      }
    });

    return res.status(201).json(newStock);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create stock entry', error: error.message });
  }
};

const updateStockItem = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.currentStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    const { vehicle, model, year, color, mileage, askingPrice, purchasePrice, status, location, notes, careOf, regNumber } = req.body;

    const updated = await prisma.currentStock.update({
      where: { id },
      data: {
        vehicle: vehicle !== undefined ? vehicle : existing.vehicle,
        model: model !== undefined ? model : existing.model,
        year: year !== undefined ? parseInt(year) : existing.year,
        color: color !== undefined ? color : existing.color,
        mileage: mileage !== undefined ? parseInt(mileage) : existing.mileage,
        askingPrice: askingPrice !== undefined ? parseFloat(askingPrice) : existing.askingPrice,
        purchasePrice: purchasePrice !== undefined ? (purchasePrice ? parseFloat(purchasePrice) : null) : existing.purchasePrice,
        status: status !== undefined ? status : existing.status,
        location: location !== undefined ? location : existing.location,
        notes: notes !== undefined ? notes : existing.notes,
        careOf: careOf !== undefined ? careOf : existing.careOf,
        regNumber: regNumber !== undefined ? regNumber : existing.regNumber
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CURRENT_STOCK',
        details: `Updated Showroom Stock #${id}: ${updated.vehicle} ${updated.model}`
      }
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update stock entry', error: error.message });
  }
};

const deleteStockItem = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.currentStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    await prisma.currentStock.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_CURRENT_STOCK',
        details: `Deleted Showroom Stock #${id}: ${existing.vehicle} ${existing.model}`
      }
    });

    return res.json({ message: 'Showroom stock entry deleted successfully' });
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
