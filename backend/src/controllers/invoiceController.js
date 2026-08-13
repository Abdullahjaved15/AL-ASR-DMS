const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Helper to upload image to Cloudinary if it's a base64 string
const handleCloudinaryUpload = async (photoStr, folderName) => {
  if (!photoStr) return null;
  if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
    return photoStr;
  }
  if (photoStr.startsWith('data:image/')) {
    try {
      const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
      if (useCloudinary) {
        const uploadRes = await cloudinary.uploader.upload(photoStr, {
          folder: `dealership/${folderName}`
        });
        return uploadRes.secure_url;
      }
    } catch (err) {
      console.warn('Cloudinary upload warning:', err.message);
    }
  }
  return photoStr;
};

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.AND = [
        category && category !== 'ALL' ? { category } : {},
        {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { registrationNo: { contains: search, mode: 'insensitive' } },
            { buyerName: { contains: search, mode: 'insensitive' } },
            { buyerPhone: { contains: search, mode: 'insensitive' } },
            { buyerCnic: { contains: search, mode: 'insensitive' } },
            { sellerName: { contains: search, mode: 'insensitive' } },
            { sellerPhone: { contains: search, mode: 'insensitive' } },
            { sellerCnic: { contains: search, mode: 'insensitive' } },
            { payeeName: { contains: search, mode: 'insensitive' } },
            { headOfAccount: { contains: search, mode: 'insensitive' } },
            { vehicleMaker: { contains: search, mode: 'insensitive' } },
            { vehicleModel: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [invoices, totalCount, statsRaw] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          images: { orderBy: { uploadedAt: 'desc' } }
        }
      }),
      prisma.invoice.count({ where: whereClause }),
      prisma.invoice.aggregate({
        _sum: {
          totalPrice: true,
          saleAmount: true,
          commissionAmount: true,
          totalAmount: true
        }
      })
    ]);

    const totalSalesVolume = statsRaw._sum.totalPrice || statsRaw._sum.saleAmount || 0;
    const totalCommissionEarned = statsRaw._sum.commissionAmount || 0;
    const grandTotalValue = statsRaw._sum.totalAmount || (totalSalesVolume + totalCommissionEarned);

    return res.json({
      invoices,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalInvoices: totalCount,
        totalSalesVolume,
        totalCommissionEarned,
        grandTotalValue
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.json(invoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoice details', error: error.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const {
      category,
      registrationNo,
      sellerName,
      sellerFatherName,
      sellerCnic,
      sellerAddress,
      sellerPhone,
      sellerPhoto,
      buyerName,
      buyerFatherName,
      buyerCnic,
      buyerAddress,
      buyerPhone,
      buyerPhoto,
      vehicleMaker,
      vehicleModel,
      carYear,
      engineNumber,
      chassisNumber,
      powerCapacity,
      color,
      postOffice,
      lastToken,
      regName,
      regFatherName,
      regAddress,
      // Transaction Agreement
      agreedAmount,
      agreedAmountHalf,
      agreedAmountWords,
      agreementTime,
      agreementDay,
      // Additional Voucher Specific Fields
      payeeName,
      headOfAccount,
      inWords,
      bankStatus,
      chequeNo,
      dueDate,
      onAccount,
      accountOf,
      time,
      cashAmount,
      statusBoxNotes,
      // Imported Vehicle
      isImported,
      billOfEntryNo,
      portName,
      clearanceDate,
      importerName,
      // Financials
      totalPrice,
      advanceAmount,
      remainingAmount,
      paymentDuration,
      dated,
      // Legacy fallback
      customerName,
      customerPhone,
      customerCity,
      carVehicle,
      carModel,
      carRegNumber,
      saleAmount,
      commissionPercent,
      paymentStatus,
      remarks,
      // Witnesses
      witness1Name,
      witness1Cnic,
      witness2Name,
      witness2Cnic
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : null;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : null;

    const finalBuyerName = buyerName || customerName || 'N/A';
    const finalVehicleMaker = vehicleMaker || carVehicle || 'N/A';
    const finalVehicleModel = vehicleModel || carModel || 'N/A';

    const numericTotalPrice = parseFloat(totalPrice) || parseFloat(agreedAmount) || parseFloat(saleAmount) || 0;
    const numericAdvance = parseFloat(advanceAmount) || 0;
    const numericRemaining = remainingAmount !== undefined && remainingAmount !== null && remainingAmount !== '' 
      ? parseFloat(remainingAmount) 
      : (numericTotalPrice - numericAdvance);
    const numericCommPercent = parseFloat(commissionPercent) || 0;
    const commissionAmount = (numericTotalPrice * numericCommPercent) / 100;
    const totalAmountCalculated = numericTotalPrice + commissionAmount;

    // Generate unique prefix based on category
    let prefix = 'REC';
    if (category === 'DELIVERY_LETTER') prefix = 'DL';
    else if (category === 'PAYMENT_VOUCHER') prefix = 'PV';
    else if (category === 'BOOKING_RECEIPT') prefix = 'BK';

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `${prefix}-${dateStr}-${randomSuffix}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        category: category || 'SALES_RECEIPT',
        date: new Date(),
        registrationNo: registrationNo || carRegNumber || null,
        
        // Seller Details
        sellerName: sellerName || null,
        sellerFatherName: sellerFatherName || null,
        sellerCnic: sellerCnic || null,
        sellerAddress: sellerAddress || null,
        sellerPhone: sellerPhone || null,
        sellerPhoto: finalSellerPhoto,

        // Buyer Details
        buyerName: finalBuyerName,
        buyerFatherName: buyerFatherName || null,
        buyerCnic: buyerCnic || null,
        buyerAddress: buyerAddress || customerCity || null,
        buyerPhone: buyerPhone || customerPhone || null,
        buyerPhoto: finalBuyerPhoto,

        // Vehicle Details
        vehicleMaker: finalVehicleMaker,
        vehicleModel: finalVehicleModel,
        carYear: carYear !== undefined && carYear !== null ? String(carYear) : null,
        engineNumber: engineNumber || null,
        chassisNumber: chassisNumber || null,
        powerCapacity: powerCapacity || null,
        color: color || null,
        postOffice: postOffice || null,
        lastToken: lastToken || null,
        regName: regName || null,
        regFatherName: regFatherName || null,
        regAddress: regAddress || null,

        // Additional Voucher Specific Fields
        payeeName: payeeName || buyerName || customerName || null,
        headOfAccount: headOfAccount || null,
        inWords: inWords || agreedAmountWords || null,
        bankStatus: bankStatus || null,
        chequeNo: chequeNo || null,
        dueDate: dueDate || null,
        onAccount: onAccount || null,
        accountOf: accountOf || null,
        time: time || agreementTime || null,
        cashAmount: cashAmount || null,
        statusBoxNotes: statusBoxNotes || null,

        // Transaction Agreement
        agreedAmount: parseFloat(agreedAmount) || numericTotalPrice,
        agreedAmountHalf: parseFloat(agreedAmountHalf) || (numericTotalPrice / 2),
        agreedAmountWords: agreedAmountWords || null,
        agreementTime: agreementTime || null,
        agreementDay: agreementDay || null,

        // Imported Vehicle
        isImported: Boolean(isImported),
        billOfEntryNo: billOfEntryNo || null,
        portName: portName || null,
        clearanceDate: clearanceDate || null,
        importerName: importerName || null,

        // Financials & Balances
        totalPrice: numericTotalPrice,
        advanceAmount: numericAdvance,
        remainingAmount: numericRemaining,
        paymentDuration: paymentDuration || null,
        dated: dated || new Date().toISOString().slice(0, 10),

        // Legacy compatibility fields
        customerName: finalBuyerName,
        customerPhone: buyerPhone || customerPhone || null,
        customerCity: buyerAddress || customerCity || null,
        carVehicle: finalVehicleMaker,
        carModel: finalVehicleModel,
        carYear: carYear ? String(carYear) : String(new Date().getFullYear()),
        carRegNumber: registrationNo || carRegNumber || null,
        saleAmount: numericTotalPrice,
        commissionPercent: numericCommPercent,
        commissionAmount,
        totalAmount: totalAmountCalculated,
        paymentStatus: paymentStatus || 'PAID',
        remarks: remarks || null,

        // Witnesses
        witness1Name: witness1Name || null,
        witness1Cnic: witness1Cnic || null,
        witness2Name: witness2Name || null,
        witness2Cnic: witness2Cnic || null,

        createdBy: req.user.id
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SALES_RECEIPT',
        details: `Created Sales Receipt ${invoiceNumber} for ${finalBuyerName} (${finalVehicleMaker} ${finalVehicleModel} - Total: Rs. ${numericTotalPrice})`
      }
    });

    return res.status(201).json(newInvoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create sales receipt', error: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Sales receipt not found' });
    }

    const {
      category,
      registrationNo,
      sellerName,
      sellerFatherName,
      sellerCnic,
      sellerAddress,
      sellerPhone,
      sellerPhoto,
      buyerName,
      buyerFatherName,
      buyerCnic,
      buyerAddress,
      buyerPhone,
      buyerPhoto,
      vehicleMaker,
      vehicleModel,
      carYear,
      engineNumber,
      chassisNumber,
      powerCapacity,
      color,
      postOffice,
      lastToken,
      regName,
      regFatherName,
      regAddress,
      agreedAmount,
      agreedAmountHalf,
      agreedAmountWords,
      agreementTime,
      agreementDay,
      payeeName,
      headOfAccount,
      inWords,
      bankStatus,
      chequeNo,
      dueDate,
      onAccount,
      accountOf,
      time,
      cashAmount,
      statusBoxNotes,
      totalPrice,
      advanceAmount,
      remainingAmount,
      paymentDuration,
      dated,
      witness1Name,
      witness1Cnic,
      witness2Name,
      witness2Cnic
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : existing.sellerPhoto;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : existing.buyerPhoto;

    const finalBuyerName = buyerName || existing.buyerName;
    const finalVehicleMaker = vehicleMaker || existing.vehicleMaker;
    const finalVehicleModel = vehicleModel || existing.vehicleModel;

    const numericTotalPrice = parseFloat(totalPrice) || parseFloat(agreedAmount) || existing.totalPrice || 0;
    const numericAdvance = parseFloat(advanceAmount) || 0;
    const numericRemaining = remainingAmount !== undefined && remainingAmount !== null && remainingAmount !== '' 
      ? parseFloat(remainingAmount) 
      : (numericTotalPrice - numericAdvance);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existing.category,
        registrationNo: registrationNo !== undefined ? registrationNo : existing.registrationNo,
        sellerName: sellerName !== undefined ? sellerName : existing.sellerName,
        sellerFatherName: sellerFatherName !== undefined ? sellerFatherName : existing.sellerFatherName,
        sellerCnic: sellerCnic !== undefined ? sellerCnic : existing.sellerCnic,
        sellerAddress: sellerAddress !== undefined ? sellerAddress : existing.sellerAddress,
        sellerPhone: sellerPhone !== undefined ? sellerPhone : existing.sellerPhone,
        sellerPhoto: finalSellerPhoto,

        buyerName: finalBuyerName,
        buyerFatherName: buyerFatherName !== undefined ? buyerFatherName : existing.buyerFatherName,
        buyerCnic: buyerCnic !== undefined ? buyerCnic : existing.buyerCnic,
        buyerAddress: buyerAddress !== undefined ? buyerAddress : existing.buyerAddress,
        buyerPhone: buyerPhone !== undefined ? buyerPhone : existing.buyerPhone,
        buyerPhoto: finalBuyerPhoto,

        vehicleMaker: finalVehicleMaker,
        vehicleModel: finalVehicleModel,
        carYear: carYear !== undefined ? String(carYear) : existing.carYear,
        engineNumber: engineNumber !== undefined ? engineNumber : existing.engineNumber,
        chassisNumber: chassisNumber !== undefined ? chassisNumber : existing.chassisNumber,
        powerCapacity: powerCapacity !== undefined ? powerCapacity : existing.powerCapacity,
        color: color !== undefined ? color : existing.color,
        postOffice: postOffice !== undefined ? postOffice : existing.postOffice,
        lastToken: lastToken !== undefined ? lastToken : existing.lastToken,
        regName: regName !== undefined ? regName : existing.regName,
        regFatherName: regFatherName !== undefined ? regFatherName : existing.regFatherName,
        regAddress: regAddress !== undefined ? regAddress : existing.regAddress,

        agreedAmount: parseFloat(agreedAmount) || numericTotalPrice,
        agreedAmountHalf: parseFloat(agreedAmountHalf) || (numericTotalPrice / 2),
        agreedAmountWords: agreedAmountWords !== undefined ? agreedAmountWords : existing.agreedAmountWords,
        agreementTime: agreementTime !== undefined ? agreementTime : existing.agreementTime,
        agreementDay: agreementDay !== undefined ? agreementDay : existing.agreementDay,

        payeeName: payeeName !== undefined ? payeeName : existing.payeeName,
        headOfAccount: headOfAccount !== undefined ? headOfAccount : existing.headOfAccount,
        inWords: inWords !== undefined ? inWords : existing.inWords,
        bankStatus: bankStatus !== undefined ? bankStatus : existing.bankStatus,
        chequeNo: chequeNo !== undefined ? chequeNo : existing.chequeNo,
        dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
        onAccount: onAccount !== undefined ? onAccount : existing.onAccount,
        accountOf: accountOf !== undefined ? accountOf : existing.accountOf,
        time: time !== undefined ? time : existing.time,
        cashAmount: cashAmount !== undefined ? cashAmount : existing.cashAmount,
        statusBoxNotes: statusBoxNotes !== undefined ? statusBoxNotes : existing.statusBoxNotes,

        totalPrice: numericTotalPrice,
        advanceAmount: numericAdvance,
        remainingAmount: numericRemaining,
        paymentDuration: paymentDuration !== undefined ? paymentDuration : existing.paymentDuration,
        dated: dated !== undefined ? dated : existing.dated,

        witness1Name: witness1Name !== undefined ? witness1Name : existing.witness1Name,
        witness1Cnic: witness1Cnic !== undefined ? witness1Cnic : existing.witness1Cnic,
        witness2Name: witness2Name !== undefined ? witness2Name : existing.witness2Name,
        witness2Cnic: witness2Cnic !== undefined ? witness2Cnic : existing.witness2Cnic
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SALES_RECEIPT',
        details: `Updated Sales Receipt ${existing.invoiceNumber} for ${finalBuyerName}`
      }
    });

    return res.json(updatedInvoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update sales receipt', error: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await prisma.invoice.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_INVOICE',
        details: `Deleted invoice ${existing.invoiceNumber}`
      }
    });

    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
  }
};

const uploadInvoiceImages = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice / Receipt not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }

    const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    const createdImages = [];

    for (const file of req.files) {
      let imageUrl = `/uploads/${file.filename}`;
      let cloudinaryPublicId = null;

      if (useCloudinary) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'velocity_dms/invoices',
            tags: ['signed_receipt', invoice.invoiceNumber]
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

      const img = await prisma.invoiceImage.create({
        data: {
          invoiceId: id,
          imageUrl: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId
        }
      });
      createdImages.push(img);
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_RECEIPT_IMAGE',
        details: `Uploaded ${createdImages.length} signed receipt photo(s) for invoice ${invoice.invoiceNumber}`
      }
    });

    return res.status(201).json({ message: 'Signed receipt images uploaded successfully', images: createdImages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload signed receipt images', error: error.message });
  }
};

const deleteInvoiceImage = async (req, res) => {
  try {
    const { invoiceId, imageId } = req.params;

    const image = await prisma.invoiceImage.findUnique({ where: { id: imageId } });
    if (!image || image.invoiceId !== invoiceId) {
      return res.status(404).json({ message: 'Receipt image not found' });
    }

    if (image.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary image destroy error:', cloudErr.message);
      }
    }

    await prisma.invoiceImage.delete({ where: { id: imageId } });

    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Signed receipt image deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete receipt image', error: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  uploadInvoiceImages,
  deleteInvoiceImage
};
