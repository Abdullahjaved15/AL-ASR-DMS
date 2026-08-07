const prisma = require('../config/db');

const getInvoices = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { carVehicle: { contains: search, mode: 'insensitive' } },
        { carModel: { contains: search, mode: 'insensitive' } },
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
      customerName,
      customerPhone,
      customerCity,
      carVehicle,
      carModel,
      carYear,
      carRegNumber,
      chassisNumber,
      engineNumber,
      saleAmount,
      commissionPercent,
      paymentStatus,
      remarks
    } = req.body;

    if (!customerName || !carVehicle || !carModel || !saleAmount) {
      return res.status(400).json({ message: 'Customer name, vehicle make/model, and sale amount are required' });
    }

    const numericSale = parseFloat(saleAmount) || 0;
    const numericCommPercent = parseFloat(commissionPercent) || 0;
    const commissionAmount = (numericSale * numericCommPercent) / 100;
    const totalAmount = numericSale + commissionAmount;

    // Generate unique invoice number: INV-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerCity: customerCity || null,
        carVehicle,
        carModel,
        carYear: parseInt(carYear) || new Date().getFullYear(),
        carRegNumber: carRegNumber ? carRegNumber.trim().toUpperCase() : null,
        chassisNumber: chassisNumber || null,
        engineNumber: engineNumber || null,
        saleAmount: numericSale,
        commissionPercent: numericCommPercent,
        commissionAmount,
        totalAmount,
        paymentStatus: paymentStatus || 'PAID',
        remarks: remarks || null,
        createdBy: req.user.id
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_INVOICE',
        details: `Created invoice ${invoiceNumber} for ${customerName} (${carVehicle} ${carModel} - Sale: Rs. ${numericSale}, Comm: ${numericCommPercent}%)`
      }
    });

    return res.status(201).json(newInvoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create invoice', error: error.message });
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
