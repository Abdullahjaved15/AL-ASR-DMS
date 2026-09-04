const prisma = require('../config/db');

// Helper to generate transaction number
const generateTxnNumber = async (prefix = 'TXN') => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.transaction.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${sequence}`;
};

// 1. Get Chart of Accounts (COA)
const getAccounts = async (req, res) => {
  try {
    const { type, subType, search = '', includeInactive = 'false' } = req.query;

    const whereClause = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }
    if (type && type !== 'ALL') {
      whereClause.type = type;
    }
    if (subType && subType !== 'ALL') {
      whereClause.subType = subType;
    }
    if (search) {
      whereClause.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const accounts = await prisma.account.findMany({
      where: whereClause,
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { entries: true, securityCheques: true }
        }
      }
    });

    // Summary calculations
    const assetAccounts = accounts.filter(a => a.type === 'ASSET');
    const liabilityAccounts = accounts.filter(a => a.type === 'LIABILITY');
    const equityAccounts = accounts.filter(a => a.type === 'EQUITY');
    const revenueAccounts = accounts.filter(a => a.type === 'REVENUE');
    const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE');

    const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const cashInHandAccount = accounts.find(a => a.subType === 'CASH') || null;
    const bankAccounts = accounts.filter(a => a.subType === 'BANK');
    const totalBankBalance = bankAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return res.json({
      accounts,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        cashInHandBalance: cashInHandAccount ? cashInHandAccount.currentBalance : 0,
        totalBankBalance,
        totalLiquidity: (cashInHandAccount ? cashInHandAccount.currentBalance : 0) + totalBankBalance
      }
    });
  } catch (error) {
    console.error('getAccounts error:', error);
    return res.status(500).json({ message: 'Failed to fetch Chart of Accounts', error: error.message });
  }
};

// 2. Get Quick Bank & Cash Accounts List for dropdowns
const getBankAndCashAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        OR: [
          { subType: 'CASH' },
          { subType: 'BANK' }
        ]
      },
      orderBy: [{ subType: 'asc' }, { name: 'asc' }]
    });

    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bank and cash accounts', error: error.message });
  }
};

// 3. Create a new Account
const createAccount = async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      subType,
      bankName,
      accountNumber,
      branch,
      openingBalance = 0,
      description
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Account name and type are required' });
    }

    // Auto-generate code if not provided
    let finalCode = code ? String(code).trim() : '';
    if (!finalCode) {
      const typePrefixMap = { ASSET: '1', LIABILITY: '2', EQUITY: '3', REVENUE: '4', EXPENSE: '5' };
      const prefix = typePrefixMap[type] || '9';
      
      const existingAccounts = await prisma.account.findMany({
        select: { code: true }
      });
      const codeSet = new Set(existingAccounts.map(a => String(a.code || '').trim()));
      
      let candidate = parseInt(`${prefix}001`, 10);
      if (type === 'ASSET') {
        if (subType === 'CASH') candidate = 1001;
        else if (subType === 'BANK') candidate = 1010;
        else if (subType === 'CUSTOMER') candidate = 1050;
        else if (subType === 'INVENTORY') candidate = 1100;
      } else if (type === 'LIABILITY') {
        if (subType === 'VENDOR') candidate = 2001;
        else if (subType === 'LOAN') candidate = 2050;
      }
      
      while (codeSet.has(String(candidate))) {
        candidate++;
      }
      finalCode = String(candidate);
    }

    const existingCode = await prisma.account.findUnique({ where: { code: finalCode } });
    if (existingCode) {
      return res.status(400).json({ message: `Account code ${finalCode} is already taken. Please specify a unique code.` });
    }

    const numOpening = parseFloat(openingBalance) || 0;

    const newAccount = await prisma.account.create({
      data: {
        code: finalCode,
        name: name.trim(),
        type,
        subType: subType || 'OTHER',
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        branch: branch || null,
        openingBalance: numOpening,
        currentBalance: numOpening,
        description: description || null,
        isSystem: false,
        createdBy: req.user.id
      }
    });

    // If opening balance > 0, log opening balance transaction
    if (numOpening !== 0) {
      const txnNumber = await generateTxnNumber('OB');
      await prisma.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: new Date(),
          type: 'JOURNAL',
          amount: Math.abs(numOpening),
          description: `Opening Balance for ${newAccount.name}`,
          referenceType: 'MANUAL',
          referenceNumber: newAccount.code,
          createdById: req.user.id,
          entries: {
            create: [
              {
                accountId: newAccount.id,
                type: ['ASSET', 'EXPENSE'].includes(type) ? 'DEBIT' : 'CREDIT',
                amount: Math.abs(numOpening),
                description: `Opening Balance for ${newAccount.name}`
              }
            ]
          }
        }
      });
    }

    return res.status(201).json({
      message: 'Account created successfully',
      account: newAccount
    });
  } catch (error) {
    console.error('createAccount error:', error);
    return res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
};

// 4. Update Account (Accounts Head / Super Admin)
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      type,
      subType,
      bankName,
      accountNumber,
      branch,
      description,
      openingBalance,
      currentBalance,
      isActive
    } = req.body;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check code uniqueness if changed
    if (code && code !== account.code) {
      const existing = await prisma.account.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ message: `Account code ${code} is already in use.` });
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : account.name,
        code: code !== undefined ? code.trim() : account.code,
        type: type !== undefined ? type : account.type,
        subType: subType !== undefined ? subType : account.subType,
        bankName: bankName !== undefined ? bankName : account.bankName,
        accountNumber: accountNumber !== undefined ? accountNumber : account.accountNumber,
        branch: branch !== undefined ? branch : account.branch,
        description: description !== undefined ? description : account.description,
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : account.openingBalance,
        currentBalance: currentBalance !== undefined ? parseFloat(currentBalance) : account.currentBalance,
        isActive: isActive !== undefined ? Boolean(isActive) : account.isActive
      }
    });

    return res.json({ message: 'Account updated successfully', account: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
};

// 5. Delete Account (Accounts Head / Super Admin only)
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;

    const account = await prisma.account.findUnique({
      where: { id },
      include: { _count: { select: { entries: true, securityCheques: true } } }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.isSystem && force !== 'true') {
      return res.status(400).json({ message: 'System core accounts are protected. To delete, please confirm force delete.' });
    }

    if ((account._count.entries > 0 || account._count.securityCheques > 0) && force !== 'true') {
      return res.status(400).json({ 
        message: `Account has ${account._count.entries} transaction entries and ${account._count.securityCheques} cheques. Please confirm force delete to remove all linked records.`,
        requiresForce: true
      });
    }

    // Cascade delete linked entries & security cheques if forced
    await prisma.$transaction(async (tx) => {
      await tx.transactionEntry.deleteMany({ where: { accountId: id } });
      await tx.securityCheque.updateMany({ where: { bankAccountId: id }, data: { bankAccountId: null } });
      await tx.installmentItem.updateMany({ where: { bankAccountId: id }, data: { bankAccountId: null } });
      await tx.invoice.updateMany({ where: { bankAccountId: id }, data: { bankAccountId: null } });
      await tx.account.delete({ where: { id } });
    });

    return res.json({ message: `Account ${account.name} deleted successfully` });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};

// 6. Get Account Ledger (Running balance, debits, credits, timestamps)
const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, search = '' } = req.query;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const whereTxn = {};
    if (startDate || endDate) {
      whereTxn.date = {};
      if (startDate) whereTxn.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereTxn.date.lte = end;
      }
    }

    const entries = await prisma.transactionEntry.findMany({
      where: {
        accountId: id,
        transaction: whereTxn
      },
      orderBy: { transaction: { date: 'asc' } },
      include: {
        transaction: {
          include: {
            createdByUser: { select: { id: true, name: true, role: true } }
          }
        }
      }
    });

    // Calculate running balance
    // For ASSET and EXPENSE: Debit increases balance, Credit decreases
    // For LIABILITY, EQUITY, REVENUE: Credit increases balance, Debit decreases
    const isNormalDebit = ['ASSET', 'EXPENSE'].includes(account.type);

    const hasOpeningBalanceTxn = entries.some(e => 
      e.transaction?.transactionNumber?.startsWith('OB-') || 
      e.transaction?.description?.toLowerCase().includes('opening balance')
    );
    let running = hasOpeningBalanceTxn ? 0 : (account.openingBalance || 0);
    let totalDebit = 0;
    let totalCredit = 0;

    const statementEntries = entries.map(entry => {
      const amt = entry.amount;
      if (entry.type === 'DEBIT') {
        totalDebit += amt;
        running += isNormalDebit ? amt : -amt;
      } else {
        totalCredit += amt;
        running += isNormalDebit ? -amt : amt;
      }

      return {
        id: entry.id,
        date: entry.transaction.date,
        transactionNumber: entry.transaction.transactionNumber,
        type: entry.transaction.type,
        entryType: entry.type,
        amount: amt,
        description: entry.description || entry.transaction.description,
        referenceNumber: entry.transaction.referenceNumber,
        referenceType: entry.transaction.referenceType,
        chassisNumber: entry.transaction.chassisNumber,
        createdBy: entry.transaction.createdByUser?.name || 'System',
        runningBalance: running
      };
    });

    return res.json({
      account,
      openingBalance: account.openingBalance || 0,
      totalDebit,
      totalCredit,
      closingBalance: running,
      entries: statementEntries.reverse() // show most recent first in UI
    });
  } catch (error) {
    console.error('getAccountLedger error:', error);
    return res.status(500).json({ message: 'Failed to fetch ledger statement', error: error.message });
  }
};

// 7. Fund Transfers (Cash to Bank, Bank to Bank, Bank to Cash)
const transferFunds = async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      date,
      referenceNumber,
      notes
    } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ message: 'Source account, destination account, and amount are required' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ message: 'Source and destination accounts cannot be the same' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer amount' });
    }

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: fromAccountId } }),
      prisma.account.findUnique({ where: { id: toAccountId } })
    ]);

    if (!fromAccount || !toAccount) {
      return res.status(404).json({ message: 'One or both accounts not found' });
    }

    const transferDate = date ? new Date(date) : new Date();
    const txnNumber = await generateTxnNumber('TRF');
    const description = `Fund Transfer from [${fromAccount.name}] to [${toAccount.name}]${notes ? ` - ${notes}` : ''}`;

    // Execute in database transaction to guarantee atomic balances & double entry
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Header Transaction
      const transaction = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: transferDate,
          type: 'FUNDS_TRANSFER',
          amount: numAmount,
          description,
          referenceType: 'TRANSFER',
          referenceNumber: referenceNumber || txnNumber,
          createdById: req.user.id,
          entries: {
            create: [
              {
                accountId: fromAccount.id,
                type: 'CREDIT', // Outflow from source
                amount: numAmount,
                description: `Transfer Out to ${toAccount.name}`
              },
              {
                accountId: toAccount.id,
                type: 'DEBIT', // Inflow into destination
                amount: numAmount,
                description: `Transfer In from ${fromAccount.name}`
              }
            ]
          }
        },
        include: { entries: true }
      });

      // 2. Update balances
      // From account (Credit reduces ASSET)
      await tx.account.update({
        where: { id: fromAccount.id },
        data: { currentBalance: { decrement: numAmount } }
      });

      // To account (Debit increases ASSET)
      await tx.account.update({
        where: { id: toAccount.id },
        data: { currentBalance: { increment: numAmount } }
      });

      return transaction;
    });

    return res.status(201).json({
      message: 'Funds transferred successfully',
      transaction: result
    });
  } catch (error) {
    console.error('transferFunds error:', error);
    return res.status(500).json({ message: 'Failed to process fund transfer', error: error.message });
  }
};

module.exports = {
  getAccounts,
  getBankAndCashAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountLedger,
  transferFunds
};
