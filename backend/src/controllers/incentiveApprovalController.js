const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// Helper to generate unique sheet number (e.g. IAS-20260828-4819)
const generateSheetNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `IAS-${dateStr}-${randomSuffix}`;
};

// Create a new Incentive Approval Sheet
const createIncentiveApprovalSheet = async (req, res) => {
  try {
    const {
      dateCol1, dateCol2,
      vehicleRegCol1, vehicleRegCol2,
      chassisNoCol1, chassisNoCol2,
      colorCol1, colorCol2,
      modelCol1, modelCol2,
      purchaserCol1, purchaserCol2,
      sellerCol1, sellerCol2,
      personalContactCol1, personalContactCol2,
      socialMediaCol1, socialMediaCol2,
      walkingCustomerCol1, walkingCustomerCol2,
      visitingCustomerCol1, visitingCustomerCol2,
      otherCol1, otherCol2,
      cashBankCol1, cashBankCol2,
      salePersonSignCol1, salePersonSignCol2,
      dealCol1, dealCol2,
      amountCol1, amountCol2,
      commissionCol1, commissionCol2,
      locationCol1, locationCol2,
      bioStatusCol1, bioStatusCol2,
      approvedByCol1, approvedByCol2
    } = req.body;

    const sheetNumber = generateSheetNumber();

    const newSheet = await prisma.incentiveApprovalSheet.create({
      data: {
        sheetNumber,
        dateCol1: dateCol1 !== undefined ? String(dateCol1) : '',
        dateCol2: dateCol2 !== undefined ? String(dateCol2) : '',
        vehicleRegCol1: vehicleRegCol1 !== undefined ? String(vehicleRegCol1) : '',
        vehicleRegCol2: vehicleRegCol2 !== undefined ? String(vehicleRegCol2) : '',
        chassisNoCol1: chassisNoCol1 !== undefined ? String(chassisNoCol1) : '',
        chassisNoCol2: chassisNoCol2 !== undefined ? String(chassisNoCol2) : '',
        colorCol1: colorCol1 !== undefined ? String(colorCol1) : '',
        colorCol2: colorCol2 !== undefined ? String(colorCol2) : '',
        modelCol1: modelCol1 !== undefined ? String(modelCol1) : '',
        modelCol2: modelCol2 !== undefined ? String(modelCol2) : '',
        purchaserCol1: purchaserCol1 !== undefined ? String(purchaserCol1) : '',
        purchaserCol2: purchaserCol2 !== undefined ? String(purchaserCol2) : '',
        sellerCol1: sellerCol1 !== undefined ? String(sellerCol1) : '',
        sellerCol2: sellerCol2 !== undefined ? String(sellerCol2) : '',
        personalContactCol1: personalContactCol1 !== undefined ? String(personalContactCol1) : '',
        personalContactCol2: personalContactCol2 !== undefined ? String(personalContactCol2) : '',
        socialMediaCol1: socialMediaCol1 !== undefined ? String(socialMediaCol1) : '',
        socialMediaCol2: socialMediaCol2 !== undefined ? String(socialMediaCol2) : '',
        walkingCustomerCol1: walkingCustomerCol1 !== undefined ? String(walkingCustomerCol1) : '',
        walkingCustomerCol2: walkingCustomerCol2 !== undefined ? String(walkingCustomerCol2) : '',
        visitingCustomerCol1: visitingCustomerCol1 !== undefined ? String(visitingCustomerCol1) : '',
        visitingCustomerCol2: visitingCustomerCol2 !== undefined ? String(visitingCustomerCol2) : '',
        otherCol1: otherCol1 !== undefined ? String(otherCol1) : '',
        otherCol2: otherCol2 !== undefined ? String(otherCol2) : '',
        cashBankCol1: cashBankCol1 !== undefined ? String(cashBankCol1) : '',
        cashBankCol2: cashBankCol2 !== undefined ? String(cashBankCol2) : '',
        salePersonSignCol1: salePersonSignCol1 !== undefined ? String(salePersonSignCol1) : '',
        salePersonSignCol2: salePersonSignCol2 !== undefined ? String(salePersonSignCol2) : '',
        dealCol1: dealCol1 !== undefined ? String(dealCol1) : '',
        dealCol2: dealCol2 !== undefined ? String(dealCol2) : '',
        amountCol1: amountCol1 !== undefined ? String(amountCol1) : '',
        amountCol2: amountCol2 !== undefined ? String(amountCol2) : '',
        commissionCol1: commissionCol1 !== undefined ? String(commissionCol1) : '',
        commissionCol2: commissionCol2 !== undefined ? String(commissionCol2) : '',
        locationCol1: locationCol1 !== undefined ? String(locationCol1) : '',
        locationCol2: locationCol2 !== undefined ? String(locationCol2) : '',
        bioStatusCol1: bioStatusCol1 !== undefined ? String(bioStatusCol1) : '',
        bioStatusCol2: bioStatusCol2 !== undefined ? String(bioStatusCol2) : '',
        approvedByCol1: approvedByCol1 !== undefined ? String(approvedByCol1) : '',
        approvedByCol2: approvedByCol2 !== undefined ? String(approvedByCol2) : '',
        createdBy: req.user.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    res.status(201).json(newSheet);
  } catch (error) {
    console.error('Error creating incentive approval sheet:', error);
    res.status(500).json({ error: 'Failed to create incentive approval sheet', details: error.message });
  }
};

// Get all Incentive Approval Sheets
const getIncentiveApprovalSheets = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { sheetNumber: { contains: search, mode: 'insensitive' } },
        { vehicleRegCol1: { contains: search, mode: 'insensitive' } },
        { vehicleRegCol2: { contains: search, mode: 'insensitive' } },
        { purchaserCol1: { contains: search, mode: 'insensitive' } },
        { purchaserCol2: { contains: search, mode: 'insensitive' } },
        { sellerCol1: { contains: search, mode: 'insensitive' } },
        { sellerCol2: { contains: search, mode: 'insensitive' } },
        { approvedByCol1: { contains: search, mode: 'insensitive' } },
        { approvedByCol2: { contains: search, mode: 'insensitive' } }
      ];
    }

    const sheets = await prisma.incentiveApprovalSheet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    res.json(sheets);
  } catch (error) {
    console.error('Error fetching incentive approval sheets:', error);
    res.status(500).json({ error: 'Failed to fetch incentive approval sheets' });
  }
};

// Get single Incentive Approval Sheet by ID
const getIncentiveApprovalSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const sheet = await prisma.incentiveApprovalSheet.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Incentive approval sheet not found' });
    }

    res.json(sheet);
  } catch (error) {
    console.error('Error fetching incentive approval sheet details:', error);
    res.status(500).json({ error: 'Failed to fetch incentive approval sheet details' });
  }
};

// Update an Incentive Approval Sheet
const updateIncentiveApprovalSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.incentiveApprovalSheet.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Incentive approval sheet not found' });
    }

    const updateData = {};
    const stringFields = [
      'dateCol1', 'dateCol2',
      'vehicleRegCol1', 'vehicleRegCol2',
      'chassisNoCol1', 'chassisNoCol2',
      'colorCol1', 'colorCol2',
      'modelCol1', 'modelCol2',
      'purchaserCol1', 'purchaserCol2',
      'sellerCol1', 'sellerCol2',
      'personalContactCol1', 'personalContactCol2',
      'socialMediaCol1', 'socialMediaCol2',
      'walkingCustomerCol1', 'walkingCustomerCol2',
      'visitingCustomerCol1', 'visitingCustomerCol2',
      'otherCol1', 'otherCol2',
      'cashBankCol1', 'cashBankCol2',
      'salePersonSignCol1', 'salePersonSignCol2',
      'dealCol1', 'dealCol2',
      'amountCol1', 'amountCol2',
      'commissionCol1', 'commissionCol2',
      'locationCol1', 'locationCol2',
      'bioStatusCol1', 'bioStatusCol2',
      'approvedByCol1', 'approvedByCol2'
    ];

    stringFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = String(req.body[field]);
      }
    });

    // If requester is ADMIN (not SUPER_ADMIN), submit approval request
    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'INCENTIVE_APPROVAL_SHEET',
          entityId: id,
          entityName: `Sheet #${existing.sheetNumber}`,
          action: 'EDIT',
          status: 'PENDING',
          requestedById: req.user.id,
          proposedData: updateData,
          currentData: existing,
          reason: req.body.reason || 'Admin submitted changes for incentive approval sheet'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested EDIT approval for incentive sheet #${existing.sheetNumber}`
        }
      });

      return res.json({
        message: 'Your edit request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    const updatedSheet = await prisma.incentiveApprovalSheet.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    res.json(updatedSheet);
  } catch (error) {
    console.error('Error updating incentive approval sheet:', error);
    res.status(500).json({ error: 'Failed to update incentive approval sheet', details: error.message });
  }
};

// Delete an Incentive Approval Sheet
const deleteIncentiveApprovalSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.incentiveApprovalSheet.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Incentive approval sheet not found' });
    }

    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'INCENTIVE_APPROVAL_SHEET',
          entityId: id,
          entityName: `Sheet #${existing.sheetNumber}`,
          action: 'DELETE',
          status: 'PENDING',
          requestedById: req.user.id,
          currentData: existing,
          reason: req.body?.reason || 'Admin requested deletion of incentive approval sheet'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested DELETE approval for incentive sheet #${existing.sheetNumber}`
        }
      });

      return res.json({
        message: 'Deletion request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    await prisma.incentiveApprovalSheet.delete({
      where: { id }
    });
    res.json({ message: 'Incentive approval sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting incentive approval sheet:', error);
    res.status(500).json({ error: 'Failed to delete incentive approval sheet' });
  }
};

// Upload images for Incentive Approval Sheet
const uploadIncentiveApprovalSheetImages = async (req, res) => {
  try {
    const { id } = req.params;

    const sheet = await prisma.incentiveApprovalSheet.findUnique({ where: { id } });
    if (!sheet) {
      return res.status(404).json({ error: 'Incentive approval sheet not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded' });
    }

    const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    const createdImages = [];

    for (const file of req.files) {
      let imageUrl = `/uploads/${file.filename}`;
      let cloudinaryPublicId = null;

      if (useCloudinary) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'velocity_dms/incentive_approval_sheets',
            tags: ['incentive_approval_sheet', sheet.sheetNumber]
          });
          imageUrl = result.secure_url;
          cloudinaryPublicId = result.public_id;

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload fallback to local storage:', cloudErr.message);
        }
      }

      const img = await prisma.incentiveApprovalSheetImage.create({
        data: {
          sheetId: id,
          imageUrl: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId
        }
      });
      createdImages.push(img);
    }

    return res.status(201).json({ message: 'Images uploaded successfully', images: createdImages });
  } catch (error) {
    console.error('Error uploading incentive approval sheet images:', error);
    return res.status(500).json({ error: 'Failed to upload images', details: error.message });
  }
};

// Delete photo from Incentive Approval Sheet
const deleteIncentiveApprovalSheetImage = async (req, res) => {
  try {
    const { sheetId, imageId } = req.params;

    const image = await prisma.incentiveApprovalSheetImage.findUnique({ where: { id: imageId } });
    if (!image || image.sheetId !== sheetId) {
      return res.status(404).json({ error: 'Incentive approval sheet image not found' });
    }

    if (image.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary image destroy error:', cloudErr.message);
      }
    }

    await prisma.incentiveApprovalSheetImage.delete({ where: { id: imageId } });

    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting incentive approval sheet image:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
};

module.exports = {
  createIncentiveApprovalSheet,
  getIncentiveApprovalSheets,
  getIncentiveApprovalSheetById,
  updateIncentiveApprovalSheet,
  deleteIncentiveApprovalSheet,
  uploadIncentiveApprovalSheetImages,
  deleteIncentiveApprovalSheetImage
};
