const prisma = require('../config/db');

const getCollaborations = async (req, res) => {
  try {
    const isSalesman = req.user.role !== 'ADMIN';
    const userId = req.user.id;

    const where = {};
    if (isSalesman) {
      where.OR = [
        { primarySalesmanId: userId },
        { partnerSalesmanId: userId }
      ];
    }

    const collaborations = await prisma.collaboration.findMany({
      where,
      include: {
        seller: {
          select: { id: true, vehicle: true, model: true, year: true, demandPrice: true, sellerName: true, sellerCity: true, leadStatus: true }
        },
        buyer: {
          select: { id: true, vehicle: true, model: true, year: true, budget: true, buyerName: true, buyerCity: true, leadStatus: true }
        },
        primarySalesman: {
          select: { id: true, name: true, email: true, phone: true }
        },
        partnerSalesman: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Summary Statistics for Admin / Overview
    const totalCollaborations = collaborations.length;
    const activeCollaborations = collaborations.filter(c => c.status === 'ACTIVE').length;
    const completedCollaborations = collaborations.filter(c => c.status === 'COMPLETED').length;

    return res.json({
      collaborations,
      stats: {
        totalCollaborations,
        activeCollaborations,
        completedCollaborations
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch collaborations', error: error.message });
  }
};

const createCollaboration = async (req, res) => {
  try {
    const { sellerId, buyerId, partnerSalesmanId, splitPercentage = 50, notes } = req.body;
    const primarySalesmanId = req.user.id;

    if (!partnerSalesmanId) {
      return res.status(400).json({ message: 'Partner salesman is required for collaboration' });
    }

    if (primarySalesmanId === partnerSalesmanId) {
      return res.status(400).json({ message: 'You cannot collaborate with yourself' });
    }

    if (!sellerId && !buyerId) {
      return res.status(400).json({ message: 'Please select a Seller lead or Buyer lead to collaborate on' });
    }

    const partner = await prisma.user.findUnique({ where: { id: partnerSalesmanId } });
    if (!partner) {
      return res.status(404).json({ message: 'Partner salesman account not found' });
    }

    const collaboration = await prisma.collaboration.create({
      data: {
        sellerId: sellerId || null,
        buyerId: buyerId || null,
        primarySalesmanId,
        partnerSalesmanId,
        splitPercentage: parseFloat(splitPercentage) || 50.0,
        status: 'ACTIVE',
        notes: notes || null
      },
      include: {
        seller: true,
        buyer: true,
        primarySalesman: { select: { id: true, name: true, email: true } },
        partnerSalesman: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_COLLABORATION',
        details: `Initiated 50-50 commission collaboration between ${req.user.name} and ${partner.name}`
      }
    });

    return res.status(201).json(collaboration);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create collaboration', error: error.message });
  }
};

const updateCollaborationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.collaboration.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Collaboration record not found' });
    }

    if (req.user.role !== 'ADMIN' && existing.primarySalesmanId !== req.user.id && existing.partnerSalesmanId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only manage your own collaborations' });
    }

    const updated = await prisma.collaboration.update({
      where: { id },
      data: {
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes
      },
      include: {
        seller: true,
        buyer: true,
        primarySalesman: { select: { id: true, name: true, email: true } },
        partnerSalesman: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_COLLABORATION',
        details: `Updated collaboration #${id} status to ${status}`
      }
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update collaboration', error: error.message });
  }
};

const deleteCollaboration = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.collaboration.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Collaboration record not found' });
    }

    if (req.user.role !== 'ADMIN' && existing.primarySalesmanId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Only primary salesman or Admin can delete collaboration' });
    }

    await prisma.collaboration.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_COLLABORATION',
        details: `Deleted collaboration record #${id}`
      }
    });

    return res.json({ message: 'Collaboration record deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete collaboration', error: error.message });
  }
};

module.exports = {
  getCollaborations,
  createCollaboration,
  updateCollaborationStatus,
  deleteCollaboration
};
