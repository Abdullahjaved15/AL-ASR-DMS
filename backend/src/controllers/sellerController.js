const prisma = require('../config/db');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { formatPakistaniPhone } = require('../utils/phoneFormatter');

let sellersCache = null;
let sellersCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15s TTL

const invalidateSellersCache = () => {
  sellersCache = null;
  sellersCacheTime = 0;
};

const getSellers = async (req, res) => {
  try {
    const { search, leadStatus, assignedTo, city, vehicle, model, minYear, maxYear, year, minPrice, maxPrice, fromDate, toDate } = req.query;

    const hasFilters = Boolean(search || leadStatus || assignedTo || city || vehicle || model || minYear || maxYear || year || minPrice || maxPrice || fromDate || toDate);

    // Return cached response for default un-filtered ADMIN requests within 15s TTL
    if (!hasFilters && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') && sellersCache && (Date.now() - sellersCacheTime < CACHE_TTL_MS)) {
      return res.json(sellersCache);
    }

    const where = {};

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

    if (city) {
      where.sellerCity = { contains: city, mode: 'insensitive' };
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

    // Lead Registration Date Range Filter
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

    // Price Filter
    if (minPrice || maxPrice) {
      where.demandPrice = {};
      if (minPrice) where.demandPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.demandPrice.lte = parseFloat(maxPrice);
    }

    if (search) {
      const searchOR = [
        { vehicle: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
        { sellerPhone: { contains: search, mode: 'insensitive' } },
        { sellerCity: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { numberPlate: { contains: search, mode: 'insensitive' } },
        { comments: { contains: search, mode: 'insensitive' } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchOR }
        ];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, phone: true }
        },
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        images: true,
        _count: {
          select: { images: true, deals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!hasFilters && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      sellersCache = sellers;
      sellersCacheTime = Date.now();
    }

    return res.json(sellers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch seller leads', error: error.message });
  }
};

const getSellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await prisma.seller.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, phone: true } },
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
        images: true,
        deals: true
      }
    });

    if (!seller) {
      return res.status(404).json({ message: 'Seller record not found' });
    }

    // RBAC check
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && seller.assignedTo !== req.user.id && seller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this seller lead' });
    }

    return res.json(seller);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch seller details', error: error.message });
  }
};

const createSeller = async (req, res) => {
  try {
    // Only Admin and Super Admin can create seller records
    if (req.user.role === 'SALESMAN') {
      return res.status(403).json({ message: 'Access denied: Only Administrators can add seller records.' });
    }

    const {
      vehicle, model, year, color, mileage, numberPlate, demandPrice,
      carCondition, zeroMeterType,
      sellerName, sellerPhone, sellerCity,
      leadSource, leadReference, leadReferredBy, assignedTo, leadStatus, comments
    } = req.body;

    // Duplicate Number Plate validation (if plate provided)
    if (numberPlate && numberPlate.trim()) {
      const cleanPlate = numberPlate.trim().toUpperCase().replace(/[\s-]/g, '');
      const existingSellers = await prisma.seller.findMany({
        where: { numberPlate: { not: null } },
        select: { id: true, numberPlate: true, sellerName: true, vehicle: true, model: true }
      });

      const duplicate = existingSellers.find(s => 
        s.numberPlate && s.numberPlate.trim().toUpperCase().replace(/[\s-]/g, '') === cleanPlate
      );

      if (duplicate) {
        return res.status(400).json({
          message: `Vehicle with Number Plate '${numberPlate}' already exists in inventory (Seller: ${duplicate.sellerName}, ${duplicate.vehicle} ${duplicate.model})!`
        });
      }
    }

    const assignedSalesman = assignedTo || req.user.id;

    const newSeller = await prisma.seller.create({
      data: {
        createdBy: req.user.id,
        vehicle: vehicle || '',
        model: model || '',
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'N/A',
        mileage: parseInt(mileage) || 0,
        numberPlate: numberPlate ? numberPlate.trim() : null,
        demandPrice: demandPrice !== undefined && demandPrice !== '' ? parseFloat(demandPrice) : 0,
        carCondition: carCondition || 'Used',
        zeroMeterType: carCondition === 'Zero Meter' ? zeroMeterType || 'Cash' : null,
        sellerName: sellerName || '',
        sellerPhone: sellerPhone ? formatPakistaniPhone(sellerPhone) : '',
        sellerCity: sellerCity || '',
        leadSource: leadSource || 'Direct Call',
        leadReference: leadReference || null,
        leadReferredBy: leadReferredBy || null,
        assignedTo: assignedSalesman,
        leadStatus: leadStatus || 'New Lead',
        comments: comments || null
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        images: true
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SELLER',
        details: `Added seller ${sellerName || 'N/A'} for ${year || ''} ${vehicle || ''} ${model || ''} (Plate: ${numberPlate || 'N/A'})`
      }
    });

    invalidateSellersCache();
    return res.status(201).json(newSeller);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create seller', error: error.message });
  }
};

const updateSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSeller = await prisma.seller.findUnique({ where: { id } });

    if (!existingSeller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isAdminUser && existingSeller.assignedTo !== req.user.id && existingSeller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only edit your own leads' });
    }

    const {
      vehicle, model, year, color, mileage, numberPlate, demandPrice,
      sellerName, sellerPhone, sellerCity,
      leadSource, leadReference, leadReferredBy, assignedTo, leadStatus, comments
    } = req.body;

    // Check duplicate number plate if changed
    if (numberPlate && numberPlate.trim()) {
      const cleanPlate = numberPlate.trim().toUpperCase().replace(/[\s-]/g, '');
      const existingSellers = await prisma.seller.findMany({
        where: { numberPlate: { not: null }, id: { not: id } },
        select: { id: true, numberPlate: true, sellerName: true, vehicle: true, model: true }
      });

      const duplicate = existingSellers.find(s => 
        s.numberPlate && s.numberPlate.trim().toUpperCase().replace(/[\s-]/g, '') === cleanPlate
      );

      if (duplicate) {
        return res.status(400).json({
          message: `Vehicle with Number Plate '${numberPlate}' already exists in inventory (Seller: ${duplicate.sellerName}, ${duplicate.vehicle} ${duplicate.model})!`
        });
      }
    }

    const {
      carCondition, zeroMeterType
    } = req.body;

    const updateData = {};
    if (vehicle !== undefined) updateData.vehicle = vehicle;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = String(year);
    if (color !== undefined) updateData.color = color;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage) || 0;
    if (numberPlate !== undefined) updateData.numberPlate = numberPlate ? numberPlate.trim() : null;
    if (demandPrice !== undefined) updateData.demandPrice = demandPrice !== '' ? parseFloat(demandPrice) : 0;
    if (carCondition !== undefined) updateData.carCondition = carCondition;
    if (zeroMeterType !== undefined) updateData.zeroMeterType = carCondition === 'Zero Meter' ? zeroMeterType : null;
    if (sellerName !== undefined) updateData.sellerName = sellerName;
    if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone ? formatPakistaniPhone(sellerPhone) : '';
    if (sellerCity !== undefined) updateData.sellerCity = sellerCity;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (leadReference !== undefined) updateData.leadReference = leadReference;
    if (leadReferredBy !== undefined) updateData.leadReferredBy = leadReferredBy;
    if (isAdminUser && assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
    if (comments !== undefined) updateData.comments = comments;

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: updateData,
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        images: true
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SELLER',
        details: `Updated seller lead ${updatedSeller.sellerName} (${updatedSeller.vehicle} ${updatedSeller.model})`
      }
    });

    invalidateSellersCache();
    return res.json(updatedSeller);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update seller', error: error.message });
  }
};

const deleteSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSeller = await prisma.seller.findUnique({ where: { id } });

    if (!existingSeller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (req.user.role !== 'ADMIN' && existingSeller.assignedTo !== req.user.id && existingSeller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own seller leads' });
    }

    await prisma.seller.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_SELLER',
        details: `Deleted seller record ${existingSeller.sellerName} (${existingSeller.vehicle})`
      }
    });

    invalidateSellersCache();
    return res.json({ message: 'Seller record deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete seller', error: error.message });
  }
};

const uploadSellerImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (req.user.role !== 'ADMIN' && seller.assignedTo !== req.user.id && seller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to edit this seller' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const categoryName = ['Front', 'Back', 'Interior', 'Engine', 'Dashboard', 'Documents', 'Other'].includes(category) 
      ? category 
      : 'Other';

    const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    const createdImages = [];

    for (const file of req.files) {
      let imageUrl = `/uploads/${file.filename}`;
      let cloudinaryPublicId = null;

      if (useCloudinary) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'velocity_dms/sellers',
            tags: [categoryName, seller.vehicle]
          });
          imageUrl = result.secure_url;
          cloudinaryPublicId = result.public_id;

          // Clean up local temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload fallback to local storage:', cloudErr.message);
        }
      }

      const img = await prisma.sellerImage.create({
        data: {
          sellerId: id,
          category: categoryName,
          imageUrl: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId
        }
      });
      createdImages.push(img);
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_IMAGES',
        details: `Uploaded ${createdImages.length} image(s) for category [${categoryName}] to seller ${seller.sellerName}`
      }
    });

    return res.status(201).json({ message: 'Images uploaded successfully', images: createdImages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload images', error: error.message });
  }
};

const deleteSellerImage = async (req, res) => {
  try {
    const { sellerId, imageId } = req.params;

    const image = await prisma.sellerImage.findUnique({ where: { id: imageId } });
    if (!image || image.sellerId !== sellerId) {
      return res.status(404).json({ message: 'Image not found' });
    }

    if (req.user.role !== 'ADMIN') {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
      if (seller && seller.assignedTo !== req.user.id && seller.createdBy !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Delete from Cloudinary if public ID exists
    if (image.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary image destroy error:', cloudErr.message);
      }
    }

    await prisma.sellerImage.delete({ where: { id: imageId } });

    // Clean up local disk file if exists
    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
};

module.exports = {
  getSellers,
  getSellerById,
  createSeller,
  updateSeller,
  deleteSeller,
  uploadSellerImages,
  deleteSellerImage
};
