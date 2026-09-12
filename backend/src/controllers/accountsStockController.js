const prisma = require('../config/db');
const { parsePakistaniPrice } = require('../utils/priceParser');

const safeInt = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const checkAccountsAccess = (req, res) => {
  const allowed = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD', 'ACCOUNTANT'];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Access denied: Accounts Current Stock is restricted to Accounts and Administrators.' });
    return false;
  }
  return true;
};

// 1. Get Accounts Current Stock
const getAccountsStock = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { vehicle: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { careOf: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const stock = await prisma.accountsStock.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const totalUnits = stock.length;
    const totalValuation = stock.reduce((sum, item) => sum + parsePakistaniPrice(item.askingPrice), 0);
    const totalPurchaseValuation = stock.reduce((sum, item) => sum + parsePakistaniPrice(item.purchasePrice), 0);
    const projectedProfit = totalValuation - totalPurchaseValuation;
    const availableUnits = stock.filter(item => item.status === 'AVAILABLE').length;
    const reservedUnits = stock.filter(item => item.status === 'RESERVED').length;
    const atCustomerUnits = stock.filter(item => item.status === 'AT_CUSTOMER' || item.status === 'At Customer').length;
    const soldUnits = stock.filter(item => item.status === 'SOLD').length;

    return res.json({
      stock,
      stats: {
        totalUnits,
        totalValuation,
        totalPurchaseValuation,
        projectedProfit,
        availableUnits,
        reservedUnits,
        atCustomerUnits,
        soldUnits,
        avgPrice: totalUnits > 0 ? Math.round(totalValuation / totalUnits) : 0,
        avgPurchasePrice: totalUnits > 0 ? Math.round(totalPurchaseValuation / totalUnits) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch accounts stock', error: error.message });
  }
};

// Helper to generate transaction number
const generateTxnNumber = async (prefix = 'TXN') => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.transaction.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${sequence}`;
};

// 2. Create Accounts Stock Item
const createAccountsStockItem = async (req, res) => {
  if (!checkAccountsAccess(req, res)) return;

  try {
    const { 
      vehicle, 
      model, 
      year, 
      color, 
      mileage, 
      askingPrice, 
      purchasePrice, 
      status, 
      location, 
      notes, 
      careOf, 
      regNumber, 
      chassisNumber,
      ledgerAccountId 
    } = req.body;

    const parsedAskingPrice = askingPrice !== undefined && askingPrice !== null && String(askingPrice).trim() !== '' ? parsePakistaniPrice(askingPrice) : null;
    const parsedPurchasePrice = purchasePrice !== undefined && purchasePrice !== null && String(purchasePrice).trim() !== '' ? parsePakistaniPrice(purchasePrice) : null;

    let linkedAccount = null;
    if (ledgerAccountId) {
      linkedAccount = await prisma.account.findUnique({ where: { id: ledgerAccountId } });
    }

    const newStock = await prisma.accountsStock.create({
      data: {
        vehicle: (vehicle && String(vehicle).trim()) ? String(vehicle).trim() : 'Vehicle',
        model: (model && String(model).trim()) ? String(model).trim() : 'Car',
        year: year ? String(year) : String(new Date().getFullYear()),
        color: color || 'White',
        mileage: safeInt(mileage, 0),
        askingPrice: parsedAskingPrice ? String(parsedAskingPrice) : '',
        purchasePrice: parsedPurchasePrice ? String(parsedPurchasePrice) : '',
        status: status || 'AVAILABLE',
        location: location || 'Main Showroom',
        notes: notes || null,
        careOf: careOf || (linkedAccount ? linkedAccount.name : 'AL Asr'),
        regNumber: regNumber || null,
        chassisNumber: chassisNumber || null,
        ledgerAccountId: linkedAccount ? linkedAccount.id : null,
        ledgerAccountName: linkedAccount ? linkedAccount.name : null
      }
    });

    // If purchased from a party ledger and purchase price > 0, post transaction to their ledger
    if (linkedAccount && parsedPurchasePrice && parsedPurchasePrice > 0) {
      const txnNumber = await generateTxnNumber('STK-PUR');
      const vehicleDesc = `${year || ''} ${vehicle || 'Vehicle'} ${model || 'Car'} (Reg: ${regNumber || 'Unregistered'}, Chassis: ${chassisNumber || 'N/A'})`.trim();
      
      // Check/create vehicle inventory asset account (code 1100)
      let inventoryAccount = await prisma.account.findFirst({ where: { code: '1100' } })
        || await prisma.account.findFirst({ where: { subType: 'INVENTORY' } });
      if (!inventoryAccount) {
        inventoryAccount = await prisma.account.create({
          data: {
            code: '1100',
            name: 'Showroom Vehicle Stock Inventory',
            type: 'ASSET',
            subType: 'INVENTORY',
            currentBalance: 0,
            description: 'Asset account representing showroom floor vehicle inventory value'
          }
        });
      }

      // 1. Transaction: Credit party ledger (amount payable to them), Debit vehicle inventory
      await prisma.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: new Date(),
          type: 'JOURNAL',
          amount: parsedPurchasePrice,
          description: `Vehicle Stock Purchase: ${vehicleDesc} from [${linkedAccount.name}]`,
          referenceType: 'STOCK',
          referenceId: newStock.id,
          referenceNumber: regNumber || chassisNumber || txnNumber,
          chassisNumber: chassisNumber || null,
          createdById: req.user.id,
          entries: {
            create: [
              {
                accountId: linkedAccount.id,
                type: 'CREDIT', // Credit party ledger -> Amount payable to them
                amount: parsedPurchasePrice,
                description: `Vehicle Purchase Payable for ${vehicleDesc}`
              },
              {
                accountId: inventoryAccount.id,
                type: 'DEBIT', // Debit inventory asset
                amount: parsedPurchasePrice,
                description: `Inventory Asset Acquisition for ${vehicleDesc}`
              }
            ]
          }
        }
      });

      // 2. Update linked party account's current balance (Credit increases payable liability / balance)
      const isLinkedDebit = ['ASSET', 'EXPENSE'].includes(linkedAccount.type);
      const delta = isLinkedDebit ? -parsedPurchasePrice : parsedPurchasePrice;
      await prisma.account.update({
        where: { id: linkedAccount.id },
        data: { currentBalance: { increment: delta } }
      });

      // 3. Update inventory asset account balance
      await prisma.account.update({
        where: { id: inventoryAccount.id },
        data: { currentBalance: { increment: parsedPurchasePrice } }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_ACCOUNTS_STOCK',
        details: `Added Accounts Stock: ${year} ${vehicle || 'Vehicle'} ${model || 'Car'} (Cost: Rs. ${parsedPurchasePrice ? parsedPurchasePrice.toLocaleString() : 0} | Asking: Rs. ${parsedAskingPrice ? parsedAskingPrice.toLocaleString() : 0}${linkedAccount ? ` | Purchased from: ${linkedAccount.name}` : ''})`
      }
    });

    return res.status(201).json(newStock);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create accounts stock entry', error: error.message });
  }
};

// 3. Update Accounts Stock Item
const updateAccountsStockItem = async (req, res) => {
  if (!checkAccountsAccess(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.accountsStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Accounts stock entry not found' });
    }

    const {
      vehicle,
      model,
      year,
      color,
      mileage,
      askingPrice,
      purchasePrice,
      status,
      location,
      notes,
      careOf,
      regNumber,
      chassisNumber
    } = req.body;

    const parsedAskingPrice = askingPrice !== undefined ? (askingPrice !== null && String(askingPrice).trim() !== '' ? String(parsePakistaniPrice(askingPrice)) : '') : existing.askingPrice;
    const parsedPurchasePrice = purchasePrice !== undefined ? (purchasePrice !== null && String(purchasePrice).trim() !== '' ? String(parsePakistaniPrice(purchasePrice)) : '') : existing.purchasePrice;

    const updateData = {
      vehicle: (vehicle !== undefined && vehicle !== null && String(vehicle).trim()) ? String(vehicle).trim() : existing.vehicle,
      model: (model !== undefined && model !== null && String(model).trim()) ? String(model).trim() : existing.model,
      year: year !== undefined ? String(year) : existing.year,
      color: color !== undefined ? String(color) : existing.color,
      mileage: mileage !== undefined ? safeInt(mileage, existing.mileage) : existing.mileage,
      askingPrice: parsedAskingPrice,
      purchasePrice: parsedPurchasePrice,
      status: status !== undefined ? status : existing.status,
      location: location !== undefined ? location : existing.location,
      notes: notes !== undefined ? notes : existing.notes,
      careOf: careOf !== undefined ? careOf : existing.careOf,
      regNumber: regNumber !== undefined ? regNumber : existing.regNumber,
      chassisNumber: chassisNumber !== undefined ? chassisNumber : existing.chassisNumber
    };

    const updated = await prisma.accountsStock.update({
      where: { id },
      data: updateData
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_ACCOUNTS_STOCK',
        details: `Updated Accounts Stock #${id}: ${updated.vehicle} ${updated.model}`
      }
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update accounts stock entry', error: error.message });
  }
};

// 4. Delete Accounts Stock Item
const deleteAccountsStockItem = async (req, res) => {
  if (!checkAccountsAccess(req, res)) return;

  try {
    const { id } = req.params;
    const existing = await prisma.accountsStock.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Accounts stock entry not found' });
    }

    await prisma.accountsStock.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_ACCOUNTS_STOCK',
        details: `Deleted Accounts Stock #${id}: ${existing.vehicle} ${existing.model}`
      }
    });

    return res.json({ message: 'Accounts stock entry deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete accounts stock entry', error: error.message });
  }
};

// 5. Clear all Accounts Stock records
const clearAllAccountsStock = async (req, res) => {
  if (!checkAccountsAccess(req, res)) return;

  try {
    const deleted = await prisma.accountsStock.deleteMany({});

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CLEAR_ALL_ACCOUNTS_STOCK',
        details: `Cleared all ${deleted.count} Accounts stock records.`
      }
    });

    return res.json({ message: `Successfully deleted all ${deleted.count} accounts stock entries.` });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to clear accounts stock', error: error.message });
  }
};

module.exports = {
  getAccountsStock,
  createAccountsStockItem,
  updateAccountsStockItem,
  deleteAccountsStockItem,
  clearAllAccountsStock
};
