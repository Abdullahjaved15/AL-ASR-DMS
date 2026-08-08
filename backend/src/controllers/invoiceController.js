const prisma = require('../config/db');

const getInvoices = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { registrationNo: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { buyerPhone: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
        { sellerPhone: { contains: search, mode: 'insensitive' } },
        { vehicleMaker: { contains: search, mode: 'insensitive' } },
        { vehicleModel: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { engineNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { carVehicle: { contains: search, mode: 'insensitive' } },
        { carRegNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalSalesVolume = invoices.reduce((sum, inv) => sum + (inv.saleAmount || 0), 0);
    const totalCommissionEarned = invoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
    const grandTotalValue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return res.json({
      invoices,
      stats: {
        totalInvoices: invoices.length,
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
        createdByUser: { select: { id: true, name: true, email: true, phone: true } }
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
      registrationNo,
      // Seller Details
      sellerName,
      sellerFatherName,
      sellerAddress,
      sellerPhone,
      // Buyer Details
      buyerName,
      buyerFatherName,
      buyerAddress,
      buyerPhone,
      // Vehicle Details
      vehicleMaker,
      vehicleModel,
      engineNumber,
      chassisNumber,
      powerCapacity,
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
      carYear,
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

    // Generate unique invoice number: REC-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `REC-${dateStr}-${randomSuffix}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        date: new Date(),
        registrationNo: registrationNo || carRegNumber || null,
        
        // Seller Details
        sellerName: sellerName || null,
        sellerFatherName: sellerFatherName || null,
        sellerAddress: sellerAddress || null,
        sellerPhone: sellerPhone || null,

        // Buyer Details
        buyerName: finalBuyerName,
        buyerFatherName: buyerFatherName || null,
        buyerAddress: buyerAddress || customerCity || null,
        buyerPhone: buyerPhone || customerPhone || null,

        // Vehicle Details
        vehicleMaker: finalVehicleMaker,
        vehicleModel: finalVehicleModel,
        engineNumber: engineNumber || null,
        chassisNumber: chassisNumber || null,
        powerCapacity: powerCapacity || null,
        postOffice: postOffice || null,
        lastToken: lastToken || null,
        regName: regName || null,
        regFatherName: regFatherName || null,
        regAddress: regAddress || null,

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

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  deleteInvoice
};
