const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// Helper to generate unique letter number (e.g. RL-20260807-4819)
const generateLetterNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RL-${dateStr}-${randomSuffix}`;
};

// Create a new Receiving Letter
const createReceivingLetter = async (req, res) => {
  try {
    const {
      date,
      receivingTime,
      time,
      vehicleName,
      chassisNumber,
      regNumber,
      color,
      mileage,
      demandAmount,
      demand,
      fullFinalAmount,
      ownerName,
      receiverName,
      fileStatus,
      keyStatus,
      smartCardStatus,
      anyOtherAccessory,
      notes
    } = req.body;

    if (!vehicleName || !ownerName || !receiverName) {
      return res.status(400).json({ error: 'Vehicle Name, Owner Name, and Receiver Name are required fields.' });
    }

    const letterNumber = generateLetterNumber();
    const effectiveDemand = (demandAmount || demand || fullFinalAmount) ? String(demandAmount || demand || fullFinalAmount).trim() : null;
    const effectiveTime = (receivingTime || time) ? String(receivingTime || time).trim() : null;

    const newLetter = await prisma.receivingLetter.create({
      data: {
        letterNumber,
        date: date ? new Date(date) : new Date(),
        receivingTime: effectiveTime,
        vehicleName,
        chassisNumber: chassisNumber || null,
        regNumber: regNumber || null,
        color: color || null,
        mileage: mileage ? String(mileage).trim() : null,
        demandAmount: effectiveDemand,
        fullFinalAmount: effectiveDemand,
        ownerName,
        receiverName,
        fileStatus: fileStatus || null,
        keyStatus: keyStatus || null,
        smartCardStatus: smartCardStatus || null,
        anyOtherAccessory: anyOtherAccessory || null,
        notes: notes || null,
        createdBy: req.user.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    // Automatically add received vehicle into Showroom Current Stock
    try {
      let vehicleMake = vehicleName;
      let modelName = '';
      let yearStr = new Date().getFullYear().toString();

      const yearMatch = vehicleName.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        yearStr = yearMatch[0];
      }

      const nameParts = vehicleName.trim().split(' ');
      if (nameParts.length > 1) {
        vehicleMake = nameParts[0];
        modelName = nameParts.slice(1).join(' ').replace(yearStr, '').trim();
      }
      if (!modelName) modelName = vehicleName;

      const parsedMileage = mileage ? (parseInt(String(mileage).replace(/[^0-9]/g, '')) || 0) : 0;
      const parsedPrice = fullFinalAmount ? (parseFloat(String(fullFinalAmount).replace(/[^0-9.]/g, '')) || 0) : 0;

      await prisma.currentStock.create({
        data: {
          vehicle: vehicleMake,
          model: modelName,
          year: yearStr,
          color: color || 'White',
          mileage: parsedMileage,
          regNumber: regNumber || null,
          careOf: receiverName, // Receiver Name mapped to Care Of Name
          askingPrice: parsedPrice,
          status: 'AVAILABLE',
          location: 'Main Showroom',
          notes: `Auto-added from Receiving Letter Ref: ${letterNumber}. Owner: ${ownerName}.${fullFinalAmount ? ' F&F Amount: Rs. ' + fullFinalAmount + '.' : ''}${notes ? ' Notes: ' + notes : ''}`
        }
      });
    } catch (stockErr) {
      console.error('Failed to auto-create CurrentStock entry from Receiving Letter:', stockErr);
    }

    res.status(201).json(newLetter);
  } catch (error) {
    console.error('Error creating receiving letter:', error);
    res.status(500).json({ error: 'Failed to create receiving letter', details: error.message });
  }
};

// Get all Receiving Letters with optional search filter
const getReceivingLetters = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { letterNumber: { contains: search, mode: 'insensitive' } },
        { vehicleName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { receiverName: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { mileage: { contains: search, mode: 'insensitive' } },
        { fullFinalAmount: { contains: search, mode: 'insensitive' } }
      ];
    }

    const letters = await prisma.receivingLetter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    res.json(letters);
  } catch (error) {
    console.error('Error fetching receiving letters:', error);
    res.status(500).json({ error: 'Failed to fetch receiving letters' });
  }
};

// Get single Receiving Letter by ID
const getReceivingLetterById = async (req, res) => {
  try {
    const { id } = req.params;
    const letter = await prisma.receivingLetter.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    if (!letter) {
      return res.status(404).json({ error: 'Receiving letter not found' });
    }

    res.json(letter);
  } catch (error) {
    console.error('Error fetching receiving letter details:', error);
    res.status(500).json({ error: 'Failed to fetch receiving letter details' });
  }
};

// Update a Receiving Letter
const updateReceivingLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      receivingTime,
      time,
      vehicleName,
      chassisNumber,
      regNumber,
      color,
      mileage,
      demandAmount,
      demand,
      fullFinalAmount,
      ownerName,
      receiverName,
      fileStatus,
      keyStatus,
      smartCardStatus,
      anyOtherAccessory,
      notes
    } = req.body;

    if (!vehicleName || !ownerName || !receiverName) {
      return res.status(400).json({ error: 'Vehicle Name, Owner Name, and Receiver Name are required fields.' });
    }

    const existing = await prisma.receivingLetter.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Receiving Letter not found' });
    }

    const effectiveDemand = (demandAmount !== undefined || demand !== undefined || fullFinalAmount !== undefined)
      ? ((demandAmount || demand || fullFinalAmount) ? String(demandAmount || demand || fullFinalAmount).trim() : null)
      : undefined;

    const effectiveTime = (receivingTime !== undefined || time !== undefined)
      ? ((receivingTime || time) ? String(receivingTime || time).trim() : null)
      : undefined;

    const updateData = {
      date: date ? new Date(date) : undefined,
      receivingTime: effectiveTime !== undefined ? effectiveTime : existing.receivingTime,
      vehicleName,
      chassisNumber: chassisNumber || null,
      regNumber: regNumber || null,
      color: color || null,
      mileage: mileage !== undefined ? (mileage ? String(mileage).trim() : null) : undefined,
      demandAmount: effectiveDemand !== undefined ? effectiveDemand : existing.demandAmount,
      fullFinalAmount: effectiveDemand !== undefined ? effectiveDemand : existing.fullFinalAmount,
      ownerName,
      receiverName,
      fileStatus: fileStatus || null,
      keyStatus: keyStatus || null,
      smartCardStatus: smartCardStatus || null,
      anyOtherAccessory: anyOtherAccessory || null,
      notes: notes || null
    };

    // If requester is ADMIN (not SUPER_ADMIN), route to Approval Request workflow
    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'RECEIVING_LETTER',
          entityId: id,
          entityName: `Letter #${existing.letterNumber} - ${existing.vehicleName}`,
          action: 'EDIT',
          status: 'PENDING',
          requestedById: req.user.id,
          proposedData: updateData,
          currentData: existing,
          reason: req.body.reason || 'Admin submitted changes for receiving letter'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested EDIT approval for receiving letter #${existing.letterNumber}`
        }
      });

      return res.json({
        message: 'Your edit request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    const updatedLetter = await prisma.receivingLetter.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });

    res.json(updatedLetter);
  } catch (error) {
    console.error('Error updating receiving letter:', error);
    res.status(500).json({ error: 'Failed to update receiving letter', details: error.message });
  }
};

// Delete a Receiving Letter
const deleteReceivingLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.receivingLetter.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Receiving Letter not found' });
    }

    // If requester is ADMIN (not SUPER_ADMIN), route to Approval Request workflow
    if (req.user.role === 'ADMIN') {
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: 'RECEIVING_LETTER',
          entityId: id,
          entityName: `Letter #${existing.letterNumber} - ${existing.vehicleName}`,
          action: 'DELETE',
          status: 'PENDING',
          requestedById: req.user.id,
          currentData: existing,
          reason: req.body?.reason || 'Admin requested deletion of receiving letter'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'SUBMIT_APPROVAL_REQUEST',
          details: `Admin requested DELETE approval for receiving letter #${existing.letterNumber}`
        }
      });

      return res.json({
        message: 'Deletion request has been submitted to the Super Admin for approval.',
        requiresApproval: true,
        approvalRequest: request
      });
    }

    await prisma.receivingLetter.delete({
      where: { id }
    });
    res.json({ message: 'Receiving letter deleted successfully' });
  } catch (error) {
    console.error('Error deleting receiving letter:', error);
    res.status(500).json({ error: 'Failed to delete receiving letter' });
  }
};

// Upload photos / documents for Receiving Letter
const uploadReceivingLetterImages = async (req, res) => {
  try {
    const { id } = req.params;

    const letter = await prisma.receivingLetter.findUnique({ where: { id } });
    if (!letter) {
      return res.status(404).json({ error: 'Receiving Letter not found' });
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
            folder: 'velocity_dms/receiving_letters',
            tags: ['receiving_letter', letter.letterNumber]
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

      const img = await prisma.receivingLetterImage.create({
        data: {
          receivingLetterId: id,
          imageUrl: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId
        }
      });
      createdImages.push(img);
    }

    return res.status(201).json({ message: 'Images uploaded successfully', images: createdImages });
  } catch (error) {
    console.error('Error uploading receiving letter images:', error);
    return res.status(500).json({ error: 'Failed to upload receiving letter images', details: error.message });
  }
};

// Delete photo from Receiving Letter
const deleteReceivingLetterImage = async (req, res) => {
  try {
    const { letterId, imageId } = req.params;

    const image = await prisma.receivingLetterImage.findUnique({ where: { id: imageId } });
    if (!image || image.receivingLetterId !== letterId) {
      return res.status(404).json({ error: 'Receiving letter image not found' });
    }

    if (image.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary image destroy error:', cloudErr.message);
      }
    }

    await prisma.receivingLetterImage.delete({ where: { id: imageId } });

    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Receiving letter image deleted successfully' });
  } catch (error) {
    console.error('Error deleting receiving letter image:', error);
    return res.status(500).json({ error: 'Failed to delete receiving letter image' });
  }
};

module.exports = {
  createReceivingLetter,
  getReceivingLetters,
  getReceivingLetterById,
  updateReceivingLetter,
  deleteReceivingLetter,
  uploadReceivingLetterImages,
  deleteReceivingLetterImage
};
