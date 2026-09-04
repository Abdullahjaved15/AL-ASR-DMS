const prisma = require('../config/db');
const { parsePakistaniPrice } = require('../utils/priceParser');

// 1. Get All Sold Cars & Summary Statistics
const getSoldCars = async (req, res) => {
  try {
    const { search = '', filter = 'ALL', page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Fetch all sales receipts / invoices
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        category: 'SALES_RECEIPT'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, name: true, role: true } }
      }
    });

    // Also fetch current stock to cross-reference buyback & stock availability
    const allStock = await prisma.currentStock.findMany();

    // Group invoices by Chassis Number (or Registration No if chassis missing)
    const vehicleMap = new Map();

    salesInvoices.forEach(inv => {
      const chassisKey = (inv.chassisNumber && inv.chassisNumber.trim() !== '')
        ? inv.chassisNumber.trim().toUpperCase()
        : (inv.registrationNo && inv.registrationNo.trim() !== '')
          ? `REG-${inv.registrationNo.trim().toUpperCase()}`
          : `INV-${inv.id}`;

      if (!vehicleMap.has(chassisKey)) {
        vehicleMap.set(chassisKey, {
          vehicleKey: chassisKey,
          chassisNumber: inv.chassisNumber || '',
          registrationNo: inv.registrationNo || inv.carRegNumber || '',
          vehicleMaker: inv.vehicleMaker || inv.carVehicle || '',
          vehicleModel: inv.vehicleModel || inv.carModel || '',
          vehicleYear: inv.carYear || '',
          color: inv.color || '',
          invoices: []
        });
      }

      vehicleMap.get(chassisKey).invoices.push(inv);
    });

    // Process vehicle records
    let soldVehicles = [];

    vehicleMap.forEach((vData, key) => {
      // Sort invoices chronologically (oldest to newest)
      const sortedInvoices = [...vData.invoices].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
      const salesCount = sortedInvoices.length;

      // Check matching stock entry
      const matchingStock = allStock.find(st => {
        const stockReg = st.regNumber?.trim().toUpperCase();
        const vReg = vData.registrationNo?.trim().toUpperCase();
        const stockNotes = st.notes?.toUpperCase() || '';
        const vChassis = vData.chassisNumber?.trim().toUpperCase();

        if (vChassis && stockNotes.includes(vChassis)) return true;
        if (vReg && stockReg && stockReg === vReg) return true;
        return false;
      });

      const isCurrentlyInStock = matchingStock && matchingStock.status === 'AVAILABLE';
      const isResold = salesCount > 1;

      let status = 'SOLD_TO_CUSTOMER';
      let statusLabel = 'Sold to Customer';

      if (isCurrentlyInStock) {
        status = 'BOUGHT_BACK_IN_STOCK';
        statusLabel = 'Bought Back (In Showroom Stock)';
      } else if (isResold) {
        status = 'RESOLD';
        statusLabel = `Resold (${salesCount} Sales)`;
      }

      // Calculate total lifetime revenue on this chassis
      const totalRevenue = sortedInvoices.reduce((sum, inv) => {
        const price = parseFloat(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0) || 0;
        return sum + price;
      }, 0);

      const latestPrice = parseFloat(latestInvoice.totalPrice || latestInvoice.agreedAmount || latestInvoice.saleAmount || 0) || 0;

      const vehicleRecord = {
        vehicleKey: key,
        chassisNumber: vData.chassisNumber,
        registrationNo: vData.registrationNo,
        vehicleName: `${vData.vehicleMaker} ${vData.vehicleModel}`.trim() || 'Vehicle',
        vehicleMaker: vData.vehicleMaker,
        vehicleModel: vData.vehicleModel,
        vehicleYear: vData.vehicleYear || latestInvoice.carYear || '',
        color: vData.color || latestInvoice.color || '',
        totalSalesCount: salesCount,
        isBuyback: salesCount > 1 || isCurrentlyInStock,
        status,
        statusLabel,
        isCurrentlyInStock,
        stockId: matchingStock ? matchingStock.id : null,
        stockAskingPrice: matchingStock ? matchingStock.askingPrice : null,
        totalLifetimeRevenue: totalRevenue,
        latestSale: {
          invoiceId: latestInvoice.id,
          invoiceNumber: latestInvoice.invoiceNumber,
          date: latestInvoice.createdAt || latestInvoice.date,
          customerName: latestInvoice.buyerName || latestInvoice.customerName || 'N/A',
          customerPhone: latestInvoice.buyerPhone || latestInvoice.customerPhone || '',
          customerCnic: latestInvoice.buyerCnic || '',
          customerAddress: latestInvoice.buyerAddress || '',
          salePrice: latestPrice,
          paymentMethod: latestInvoice.paymentMethod || 'CASH',
          cashReceived: parseFloat(latestInvoice.cashAmountReceived || 0) || (latestInvoice.paymentMethod === 'CASH' ? latestPrice : 0),
          bankReceived: parseFloat(latestInvoice.bankAmountReceived || 0) || (latestInvoice.paymentMethod === 'BANK' ? latestPrice : 0),
          salesman: latestInvoice.createdByUser?.name || 'Sales Officer'
        },
        allInvoices: sortedInvoices.map((inv, idx) => ({
          cycleNumber: idx + 1,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt || inv.date,
          customerName: inv.buyerName || inv.customerName || 'N/A',
          customerPhone: inv.buyerPhone || inv.customerPhone || '',
          customerCnic: inv.buyerCnic || '',
          salePrice: parseFloat(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0) || 0,
          paymentMethod: inv.paymentMethod || 'CASH',
          deliveryStatus: inv.deliveryStatus || 'DELIVERED',
          salesman: inv.createdByUser?.name || 'Sales Officer'
        }))
      };

      soldVehicles.push(vehicleRecord);
    });

    // Apply filters
    if (filter === 'IN_STOCK') {
      soldVehicles = soldVehicles.filter(v => v.status === 'BOUGHT_BACK_IN_STOCK');
    } else if (filter === 'BUYBACKS') {
      soldVehicles = soldVehicles.filter(v => v.isBuyback);
    } else if (filter === 'RESOLD') {
      soldVehicles = soldVehicles.filter(v => v.status === 'RESOLD');
    }

    // Apply Search
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      soldVehicles = soldVehicles.filter(v => 
        v.chassisNumber.toLowerCase().includes(q) ||
        v.registrationNo.toLowerCase().includes(q) ||
        v.vehicleName.toLowerCase().includes(q) ||
        v.latestSale.customerName.toLowerCase().includes(q) ||
        v.latestSale.customerPhone.toLowerCase().includes(q) ||
        v.latestSale.invoiceNumber.toLowerCase().includes(q)
      );
    }

    // Sort by latest sale date descending
    soldVehicles.sort((a, b) => new Date(b.latestSale.date).getTime() - new Date(a.latestSale.date).getTime());

    // Stats calculations
    const totalSoldUnits = soldVehicles.length;
    const totalLifetimeSalesVolume = soldVehicles.reduce((sum, v) => sum + v.totalLifetimeRevenue, 0);
    const buybackUnitsCount = soldVehicles.filter(v => v.isBuyback).length;
    const inStockBuybacksCount = soldVehicles.filter(v => v.status === 'BOUGHT_BACK_IN_STOCK').length;

    // Paginate
    const paginatedVehicles = soldVehicles.slice(skip, skip + limitNum);

    return res.json({
      soldVehicles: paginatedVehicles,
      meta: {
        totalCount: totalSoldUnits,
        page: pageNum,
        totalPages: Math.ceil(totalSoldUnits / limitNum) || 1
      },
      stats: {
        totalSoldUnits,
        totalLifetimeSalesVolume,
        buybackUnitsCount,
        inStockBuybacksCount,
        resoldUnitsCount: soldVehicles.filter(v => v.status === 'RESOLD').length
      }
    });
  } catch (error) {
    console.error('getSoldCars error:', error);
    return res.status(500).json({ message: 'Failed to fetch sold cars registry', error: error.message });
  }
};

// 2. Get Deep Vehicle Lifecycle & Ownership History
const getVehicleHistory = async (req, res) => {
  try {
    const { chassisNumber } = req.params;

    if (!chassisNumber) {
      return res.status(400).json({ message: 'Chassis number or vehicle identifier is required' });
    }

    const cleanQuery = chassisNumber.trim();

    // 1. Fetch all Invoices tied to this chassis or regNumber
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { chassisNumber: { contains: cleanQuery, mode: 'insensitive' } },
          { registrationNo: { contains: cleanQuery, mode: 'insensitive' } },
          { carRegNumber: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true, role: true } }
      }
    });

    // 2. Fetch all Receiving Letters tied to this chassis or regNumber
    const receivingLetters = await prisma.receivingLetter.findMany({
      where: {
        OR: [
          { chassisNumber: { contains: cleanQuery, mode: 'insensitive' } },
          { regNumber: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true } },
        images: true
      }
    });

    // 3. Fetch Stock records tied to this chassis
    const stockRecords = await prisma.currentStock.findMany({
      where: {
        OR: [
          { regNumber: { contains: cleanQuery, mode: 'insensitive' } },
          { notes: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      }
    });

    // 4. Fetch Financial Transactions tied to this chassis
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { chassisNumber: { contains: cleanQuery, mode: 'insensitive' } },
          { referenceNumber: { contains: cleanQuery, mode: 'insensitive' } },
          { description: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      },
      orderBy: { date: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true } },
        entries: {
          include: {
            account: { select: { id: true, name: true, type: true, subType: true } }
          }
        }
      }
    });

    // Construct chronological lifecycle events
    const timelineEvents = [];

    // Add Sales Events
    invoices.forEach((inv, idx) => {
      const price = parseFloat(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0) || 0;
      timelineEvents.push({
        id: `sale-${inv.id}`,
        type: 'SALE',
        eventTitle: `Sale Cycle #${idx + 1}: Sold to ${inv.buyerName || inv.customerName || 'Customer'}`,
        date: inv.createdAt || inv.date,
        invoiceNumber: inv.invoiceNumber,
        category: inv.category,
        customerName: inv.buyerName || inv.customerName || 'N/A',
        customerPhone: inv.buyerPhone || inv.customerPhone || '',
        customerCnic: inv.buyerCnic || '',
        customerAddress: inv.buyerAddress || '',
        salePrice: price,
        paymentMethod: inv.paymentMethod || 'CASH',
        cashReceived: parseFloat(inv.cashAmountReceived || 0) || (inv.paymentMethod === 'CASH' ? price : 0),
        bankReceived: parseFloat(inv.bankAmountReceived || 0) || (inv.paymentMethod === 'BANK' ? price : 0),
        deliveryStatus: inv.deliveryStatus || 'DELIVERED',
        salesman: inv.createdByUser?.name || 'Sales Officer',
        notes: inv.statusBoxNotes || inv.notes || ''
      });
    });

    // Add Receiving Letters / Buyback Inspections
    receivingLetters.forEach(rec => {
      timelineEvents.push({
        id: `receiving-${rec.id}`,
        type: 'BUYBACK_RECEIVING',
        eventTitle: `Vehicle Received Back / Buyback Inspection (#${rec.letterNumber})`,
        date: rec.createdAt || rec.date,
        letterNumber: rec.letterNumber,
        ownerName: rec.ownerName,
        receiverName: rec.receiverName,
        mileage: rec.mileage || 'N/A',
        demandAmount: rec.demandAmount || 'N/A',
        fileStatus: rec.fileStatus,
        keyStatus: rec.keyStatus,
        smartCardStatus: rec.smartCardStatus,
        imagesCount: rec.images?.length || 0,
        notes: rec.notes || ''
      });
    });

    // Sort all events chronologically
    timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Financial Analysis
    const totalSalesRevenue = invoices
      .filter(i => i.category === 'SALES_RECEIPT')
      .reduce((sum, i) => sum + (parseFloat(i.totalPrice || i.agreedAmount || i.saleAmount || 0) || 0), 0);

    const vehicleTitle = invoices[0] 
      ? `${invoices[0].vehicleMaker || ''} ${invoices[0].vehicleModel || ''}`.trim()
      : cleanQuery;

    return res.json({
      chassisNumber: cleanQuery,
      vehicleName: vehicleTitle || 'Vehicle',
      totalSalesCount: invoices.filter(i => i.category === 'SALES_RECEIPT').length,
      isBuybackDetected: invoices.length > 1 || receivingLetters.length > 0,
      financialSummary: {
        totalSalesRevenue,
        totalCycles: invoices.length,
        receivingLettersCount: receivingLetters.length,
        stockEntriesCount: stockRecords.length
      },
      timelineEvents,
      invoices,
      receivingLetters,
      stockRecords,
      transactions
    });
  } catch (error) {
    console.error('getVehicleHistory error:', error);
    return res.status(500).json({ message: 'Failed to fetch vehicle history', error: error.message });
  }
};

// 3. Record Showroom Buyback (Add returned car back into stock & post ledger)
const recordVehicleBuyback = async (req, res) => {
  try {
    const {
      chassisNumber,
      regNumber,
      vehicleMaker,
      vehicleModel,
      year,
      color,
      sellerName,
      sellerPhone,
      sellerCnic,
      buybackPrice,
      askingPrice,
      paymentMethod = 'CASH',
      bankAccountId,
      mileage,
      conditionNotes,
      careOf
    } = req.body;

    if (!vehicleModel || !buybackPrice) {
      return res.status(400).json({ message: 'Vehicle model and buyback price are required.' });
    }

    const numBuybackPrice = parseFloat(buybackPrice) || 0;
    const numAskingPrice = askingPrice ? parseFloat(askingPrice) : numBuybackPrice;

    const fullVehicleName = `${vehicleMaker || ''} ${vehicleModel || ''}`.trim() || 'Vehicle';
    const notesContent = `[BUYBACK from ${sellerName || 'Customer'}] Chassis: ${chassisNumber || 'N/A'}. ${conditionNotes || ''}`.trim();

    // 1. Create Showroom Current Stock Entry
    const newStock = await prisma.currentStock.create({
      data: {
        vehicle: fullVehicleName,
        model: vehicleModel || 'Car',
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'White',
        mileage: parseInt(mileage, 10) || 0,
        purchasePrice: String(numBuybackPrice),
        askingPrice: String(numAskingPrice),
        status: 'AVAILABLE',
        location: 'Main Showroom',
        notes: notesContent,
        careOf: careOf || req.user.name || 'AL Asr',
        regNumber: regNumber || null
      }
    });

    // 2. Post Accounting Journal Transaction (Debit: Inventory, Credit: Cash or Bank)
    try {
      let paymentAccount;
      if (paymentMethod === 'BANK' && bankAccountId) {
        paymentAccount = await prisma.account.findUnique({ where: { id: bankAccountId } });
      } else {
        paymentAccount = await prisma.account.findFirst({ where: { subType: 'CASH' } });
      }

      const inventoryAccount = await prisma.account.findFirst({ where: { code: '1050' } }) 
        || await prisma.account.findFirst({ where: { type: 'ASSET' } });

      if (paymentAccount && inventoryAccount) {
        const txnNumber = `TXN-BUYBACK-${Date.now().toString().slice(-6)}`;
        await prisma.transaction.create({
          data: {
            transactionNumber: txnNumber,
            date: new Date(),
            type: 'JOURNAL',
            referenceNumber: `STOCK-${newStock.id}`,
            chassisNumber: chassisNumber || null,
            amount: numBuybackPrice,
            description: `Showroom Buyback of ${fullVehicleName} from ${sellerName || 'Customer'} (Reg: ${regNumber || 'N/A'})`,
            createdById: req.user.id,
            entries: {
              create: [
                {
                  accountId: inventoryAccount.id,
                  type: 'DEBIT',
                  amount: numBuybackPrice
                },
                {
                  accountId: paymentAccount.id,
                  type: 'CREDIT',
                  amount: numBuybackPrice
                }
              ]
            }
          }
        });

        // Deduct payment account balance
        await prisma.account.update({
          where: { id: paymentAccount.id },
          data: { currentBalance: { decrement: numBuybackPrice } }
        });
      }
    } catch (accErr) {
      console.warn('Accounting entry creation skipped for buyback:', accErr.message);
    }

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'VEHICLE_BUYBACK_ADDED_TO_STOCK',
        details: `Recorded Buyback of ${fullVehicleName} (Chassis: ${chassisNumber || 'N/A'}, Plate: ${regNumber || 'N/A'}) from ${sellerName || 'Customer'} for Rs. ${numBuybackPrice.toLocaleString()}`
      }
    });

    return res.status(201).json({
      message: 'Vehicle successfully bought back and added into Showroom Current Stock!',
      stock: newStock
    });
  } catch (error) {
    console.error('recordVehicleBuyback error:', error);
    return res.status(500).json({ message: 'Failed to record vehicle buyback', error: error.message });
  }
};

module.exports = {
  getSoldCars,
  getVehicleHistory,
  recordVehicleBuyback
};
