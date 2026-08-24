const prisma = require('../config/db');

// Helper to invalidate seller cache
const invalidateSellersCache = () => {
  try {
    const sellerController = require('./sellerController');
    if (sellerController && typeof sellerController.invalidateSellersCache === 'function') {
      sellerController.invalidateSellersCache();
    }
  } catch (e) {
    // ignore
  }
};

// Fetch list of approval requests
const getApprovalRequests = async (req, res) => {
  try {
    const { status, entityType, action } = req.query;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    const where = {};
    if (!isSuperAdmin) {
      // Admins only see requests they initiated
      where.requestedById = req.user.id;
    }

    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        requestedByUser: {
          select: { id: true, name: true, email: true, role: true }
        },
        reviewedByUser: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pendingCount = await prisma.approvalRequest.count({
      where: isSuperAdmin ? { status: 'PENDING' } : { status: 'PENDING', requestedById: req.user.id }
    });

    const approvedCount = await prisma.approvalRequest.count({
      where: isSuperAdmin ? { status: 'APPROVED' } : { status: 'APPROVED', requestedById: req.user.id }
    });

    const rejectedCount = await prisma.approvalRequest.count({
      where: isSuperAdmin ? { status: 'REJECTED' } : { status: 'REJECTED', requestedById: req.user.id }
    });

    return res.json({
      requests,
      counts: {
        total: requests.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    });
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    return res.status(500).json({ message: 'Failed to fetch approval requests', error: error.message });
  }
};

// Submit an approval request (called by Admin or automatically intercepted)
const createApprovalRequest = async (req, res) => {
  try {
    const { entityType, entityId, action, proposedData, reason, entityName } = req.body;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ message: 'entityType, entityId, and action (EDIT or DELETE) are required' });
    }

    // Fetch snapshot of current record if not provided
    let currentData = null;
    let fallbackEntityName = entityName || `${entityType} #${entityId}`;

    if (entityType === 'SELLER') {
      const existing = await prisma.seller.findUnique({ where: { id: entityId } });
      if (existing) {
        currentData = existing;
        fallbackEntityName = fallbackEntityName || `${existing.year || ''} ${existing.vehicle || ''} ${existing.model || ''} (Seller: ${existing.sellerName || 'N/A'})`.trim();
      }
    } else if (entityType === 'BUYER') {
      const existing = await prisma.buyer.findUnique({ where: { id: entityId } });
      if (existing) {
        currentData = existing;
        fallbackEntityName = fallbackEntityName || `${existing.buyerName || 'Buyer'} - ${existing.vehicle || ''} ${existing.model || ''}`.trim();
      }
    } else if (entityType === 'CURRENT_STOCK') {
      const existing = await prisma.currentStock.findUnique({ where: { id: entityId } });
      if (existing) {
        currentData = existing;
        fallbackEntityName = fallbackEntityName || `${existing.year || ''} ${existing.vehicle || ''} ${existing.model || ''} (Plate: ${existing.regNumber || 'UNREGISTERED'})`.trim();
      }
    } else if (entityType === 'RECEIVING_LETTER') {
      const existing = await prisma.receivingLetter.findUnique({ where: { id: entityId } });
      if (existing) {
        currentData = existing;
        fallbackEntityName = fallbackEntityName || `Letter #${existing.letterNumber} - ${existing.vehicleName || ''}`;
      }
    }

    const newRequest = await prisma.approvalRequest.create({
      data: {
        entityType,
        entityId,
        entityName: fallbackEntityName,
        action: action.toUpperCase(),
        status: 'PENDING',
        requestedById: req.user.id,
        proposedData: proposedData || null,
        currentData: currentData || null,
        reason: reason || null
      },
      include: {
        requestedByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'SUBMIT_APPROVAL_REQUEST',
        details: `Submitted ${action.toUpperCase()} approval request for ${entityType} "${fallbackEntityName}"`
      }
    });

    return res.status(201).json({
      message: `Approval request for ${action.toLowerCase()} has been sent to the Super Admin.`,
      approvalRequest: newRequest,
      requiresApproval: true
    });
  } catch (error) {
    console.error('Error creating approval request:', error);
    return res.status(500).json({ message: 'Failed to create approval request', error: error.message });
  }
};

// Super Admin Approves and executes the change
const approveRequest = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only Super Administrators can approve change requests.' });
    }

    const { id } = req.params;
    const { reviewNotes } = req.body || {};

    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { requestedByUser: true }
    });

    if (!request) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Request is already ${request.status.toLowerCase()}.` });
    }

    const { entityType, entityId, action, proposedData } = request;

    // Apply the action to the target entity
    if (action === 'DELETE') {
      if (entityType === 'SELLER') {
        const exist = await prisma.seller.findUnique({ where: { id: entityId } });
        if (exist) await prisma.seller.delete({ where: { id: entityId } });
        invalidateSellersCache();
      } else if (entityType === 'BUYER') {
        const exist = await prisma.buyer.findUnique({ where: { id: entityId } });
        if (exist) await prisma.buyer.delete({ where: { id: entityId } });
      } else if (entityType === 'CURRENT_STOCK') {
        const exist = await prisma.currentStock.findUnique({ where: { id: entityId } });
        if (exist) await prisma.currentStock.delete({ where: { id: entityId } });
      } else if (entityType === 'RECEIVING_LETTER') {
        const exist = await prisma.receivingLetter.findUnique({ where: { id: entityId } });
        if (exist) await prisma.receivingLetter.delete({ where: { id: entityId } });
      }
    } else if (action === 'EDIT') {
      if (!proposedData) {
        return res.status(400).json({ message: 'No proposed data found in edit request to apply' });
      }

      // Filter out immutable / metadata fields from proposedData
      const cleanData = { ...proposedData };
      delete cleanData.id;
      delete cleanData.createdAt;
      delete cleanData.updatedAt;
      delete cleanData.createdByUser;
      delete cleanData.assignedUser;
      delete cleanData.images;
      delete cleanData.sellerImages;

      if (cleanData.date && typeof cleanData.date === 'string') {
        cleanData.date = new Date(cleanData.date);
      }
      if (cleanData.registrationDate && typeof cleanData.registrationDate === 'string') {
        cleanData.registrationDate = new Date(cleanData.registrationDate);
      }

      if (entityType === 'SELLER') {
        await prisma.seller.update({
          where: { id: entityId },
          data: cleanData
        });
        invalidateSellersCache();
      } else if (entityType === 'BUYER') {
        await prisma.buyer.update({
          where: { id: entityId },
          data: cleanData
        });
      } else if (entityType === 'CURRENT_STOCK') {
        await prisma.currentStock.update({
          where: { id: entityId },
          data: cleanData
        });
      } else if (entityType === 'RECEIVING_LETTER') {
        await prisma.receivingLetter.update({
          where: { id: entityId },
          data: cleanData
        });
      }
    }

    // Mark request as APPROVED
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: req.user.id,
        reviewNotes: reviewNotes || 'Approved and applied by Super Admin',
        resolvedAt: new Date()
      },
      include: {
        requestedByUser: { select: { id: true, name: true, email: true, role: true } },
        reviewedByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE_REQUEST',
        details: `Approved ${action} request #${id} for ${entityType} "${request.entityName}" (Requested by ${request.requestedByUser?.name || 'Admin'})`
      }
    });

    return res.json({
      message: `Request approved and ${action.toLowerCase()} applied successfully.`,
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    return res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

// Super Admin Rejects the change
const rejectRequest = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only Super Administrators can reject change requests.' });
    }

    const { id } = req.params;
    const { reviewNotes } = req.body || {};

    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { requestedByUser: true }
    });

    if (!request) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Request is already ${request.status.toLowerCase()}.` });
    }

    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewNotes: reviewNotes || 'Rejected by Super Admin',
        resolvedAt: new Date()
      },
      include: {
        requestedByUser: { select: { id: true, name: true, email: true, role: true } },
        reviewedByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'REJECT_REQUEST',
        details: `Rejected ${request.action} request #${id} for ${request.entityType} "${request.entityName}" (Requested by ${request.requestedByUser?.name || 'Admin'})`
      }
    });

    return res.json({
      message: 'Request has been rejected.',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
};

module.exports = {
  getApprovalRequests,
  createApprovalRequest,
  approveRequest,
  rejectRequest
};
