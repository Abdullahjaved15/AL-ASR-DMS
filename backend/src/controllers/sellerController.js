const prisma = require('../config/db');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const getSellers = async (req, res) => {
  try {
    const { search, leadStatus, assignedTo, city, vehicle, model } = req.query;

    const where = {};

    // Data Isolation for Salesman
    if (req.user.role !== 'ADMIN') {
      where.OR = [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ];
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (leadStatus) {
      where.leadStatus = leadStatus;
    }

    if (city) {
      where.sellerCity = { contains: city };
    }

    if (vehicle) {
      where.vehicle = { contains: vehicle };
    }

    if (model) {
      where.model = { contains: model };
    }

    if (search) {
      const searchFilter = [
        { sellerName: { contains: search } },
        { sellerPhone: { contains: search } },
        { sellerCity: { contains: search } },
        { vehicle: { contains: search } },
        { model: { contains: search } },
        { comments: { contains: search } }
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

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        images: true,
        deals: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(sellers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch sellers', error: error.message });
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
    if (req.user.role !== 'ADMIN' && seller.assignedTo !== req.user.id && seller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this seller lead' });
    }

    return res.json(seller);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch seller details', error: error.message });
  }
};

const createSeller = async (req, res) => {
  try {
    const {
      vehicle, model, year, color, mileage, demandPrice,
      sellerName, sellerPhone, sellerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    if (!vehicle || !model || !demandPrice || !sellerName || !sellerPhone || !sellerCity) {
      return res.status(400).json({ message: 'Vehicle, model, demand price, seller name, phone, and city are required' });
    }

    const assignedSalesman = (req.user.role === 'ADMIN' && assignedTo) ? assignedTo : req.user.id;

    const newSeller = await prisma.seller.create({
      data: {
        createdBy: req.user.id,
        vehicle,
        model,
        year: parseInt(year) || new Date().getFullYear(),
        color: color || 'N/A',
        mileage: parseInt(mileage) || 0,
        demandPrice: parseFloat(demandPrice),
        sellerName,
        sellerPhone,
        sellerCity,
        leadSource: leadSource || 'Direct Call',
        leadReference: leadReference || null,
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
        details: `Added seller ${sellerName} for ${year} ${vehicle} ${model} ($${demandPrice})`
      }
    });

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

    if (req.user.role !== 'ADMIN' && existingSeller.assignedTo !== req.user.id && existingSeller.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only edit your own leads' });
    }

    const {
      vehicle, model, year, color, mileage, demandPrice,
      sellerName, sellerPhone, sellerCity,
      leadSource, leadReference, assignedTo, leadStatus, comments
    } = req.body;

    const updateData = {};
    if (vehicle) updateData.vehicle = vehicle;
    if (model) updateData.model = model;
    if (year) updateData.year = parseInt(year);
    if (color) updateData.color = color;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);
    if (demandPrice) updateData.demandPrice = parseFloat(demandPrice);
    if (sellerName) updateData.sellerName = sellerName;
    if (sellerPhone) updateData.sellerPhone = sellerPhone;
    if (sellerCity) updateData.sellerCity = sellerCity;
    if (leadSource) updateData.leadSource = leadSource;
    if (leadReference !== undefined) updateData.leadReference = leadReference;
    if (leadStatus) updateData.leadStatus = leadStatus;
    if (comments !== undefined) updateData.comments = comments;

    if (req.user.role === 'ADMIN' && assignedTo) {
      updateData.assignedTo = assignedTo;
    }

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

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only administrators can delete seller records' });
    }

    await prisma.seller.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_SELLER',
        details: `Deleted seller record ${existingSeller.sellerName} (${existingSeller.vehicle})`
      }
    });

    return res.json({ message: 'Seller deleted successfully' });
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
