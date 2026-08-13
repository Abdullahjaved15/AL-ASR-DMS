const prisma = require('../config/db');
const { getOrCreateVault } = require('./vaultController');

const defaultHeads = [
  { accountCode: '1001', accountName: 'Cash in Hand (Main Vault)', accountType: 'ASSET', description: 'Central company cash vault balance', isSystemAccount: true },
  { accountCode: '1002', accountName: 'Main Showroom Bank Account', accountType: 'ASSET', description: 'Primary dealership bank account', isSystemAccount: true },
  { accountCode: '1003', accountName: 'Customer Installment Receivables', accountType: 'ASSET', description: 'Outstanding customer installment balances', isSystemAccount: true },
  { accountCode: '2001', accountName: 'Customer Booking Advances', accountType: 'LIABILITY', description: 'Advance booking deposits held', isSystemAccount: true },
  { accountCode: '2002', accountName: 'Vendor & Seller Payables', accountType: 'LIABILITY', description: 'Vehicle purchase payables to sellers', isSystemAccount: true },
  { accountCode: '3001', accountName: 'Owner Capital / Retained Equity', accountType: 'EQUITY', description: 'Dealership owner capital equity', isSystemAccount: true },
  { accountCode: '4001', accountName: 'Vehicle Sales Revenue', accountType: 'REVENUE', description: 'Income from vehicle sales', isSystemAccount: true },
  { accountCode: '4002', accountName: 'Deal Commission Income', accountType: 'REVENUE', description: 'Brokerage and commission revenue', isSystemAccount: true },
  { accountCode: '5001', accountName: 'Media Team Expenses', accountType: 'EXPENSE', description: 'Marketing, social media ads, & media team budget', isSystemAccount: false },
  { accountCode: '5002', accountName: 'Showroom Rent & Utilities', accountType: 'EXPENSE', description: 'Property rent, electricity, and water bills', isSystemAccount: false },
  { accountCode: '5003', accountName: 'Staff Salaries & Sales Incentives', accountType: 'EXPENSE', description: 'Payroll and commission payouts', isSystemAccount: false },
  { accountCode: '5004', accountName: 'Vehicle Repair & Refurbishment', accountType: 'EXPENSE', description: 'Car detailing, mechanical repair, & maintenance', isSystemAccount: false }
];

const ensureDefaultHeads = async () => {
  const count = await prisma.accountHead.count();
  if (count === 0) {
    for (const head of defaultHeads) {
      await prisma.accountHead.create({ data: head });
    }
  }
};

const getChartOfAccounts = async (req, res) => {
  try {
    await ensureDefaultHeads();
    const { accountType, search } = req.query;

    const where = {};
    if (accountType) where.accountType = accountType;
    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const accounts = await prisma.accountHead.findMany({
      where,
      include: {
        _count: { select: { transactions: true } }
      },
      orderBy: { accountCode: 'asc' }
    });

    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch Chart of Accounts', error: error.message });
  }
};

const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await prisma.accountHead.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account head record not found' });
    }

    return res.json(account);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch account ledger statement', error: error.message });
  }
};

const createAccountHead = async (req, res) => {
  try {
    const { accountName, accountType, accountCode, description } = req.body;

    if (!accountName || !accountType) {
      return res.status(400).json({ message: 'Account Name and Account Type are required' });
    }

    const codeToUse = accountCode || `ACC-${Date.now().toString().slice(-4)}`;

    const account = await prisma.accountHead.create({
      data: {
        accountCode: codeToUse,
        accountName,
        accountType,
        description: description || null,
        isSystemAccount: false
      }
    });

    return res.status(201).json(account);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create account head', error: error.message });
  }
};

const recordAccountTransaction = async (req, res) => {
  try {
    const { accountHeadId, type, amount, description, referenceNo } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive transaction amount is required' });
    }

    const account = await prisma.accountHead.findUnique({ where: { id: accountHeadId } });
    if (!account) {
      return res.status(404).json({ message: 'Account head not found' });
    }

    const tx = await prisma.accountTransaction.create({
      data: {
        accountHeadId,
        type: type === 'INWARD' ? 'INWARD' : 'OUTWARD',
        amount: numAmount,
        description: description || `${type} transaction for ${account.accountName}`,
        referenceNo: referenceNo || null,
        createdById: req.user.id
      }
    });

    // Update account balance
    const newAccountBalance = type === 'INWARD'
      ? account.currentBalance + numAmount
      : account.currentBalance - numAmount;

    await prisma.accountHead.update({
      where: { id: accountHeadId },
      data: { currentBalance: newAccountBalance }
    });

    // Sync transaction with Central Company Vault
    try {
      const vault = await getOrCreateVault();
      const vaultType = type === 'INWARD' ? 'INFLOW' : 'OUTFLOW';
      const vaultCategory = account.accountType === 'EXPENSE' ? 'EXPENSE' : account.accountType === 'REVENUE' ? 'SALE' : 'OTHER';

      await prisma.vaultTransaction.create({
        data: {
          vaultId: vault.id,
          type: vaultType,
          amount: numAmount,
          category: vaultCategory,
          description: `[${account.accountName}] ${description}`,
          referenceNo: referenceNo || account.accountCode,
          createdById: req.user.id
        }
      });

      const newVaultBalance = vaultType === 'OUTFLOW' ? vault.balance - numAmount : vault.balance + numAmount;
      const newInflow = vaultType === 'INFLOW' ? vault.totalInflow + numAmount : vault.totalInflow;
      const newOutflow = vaultType === 'OUTFLOW' ? vault.totalOutflow + numAmount : vault.totalOutflow;

      await prisma.centralVault.update({
        where: { id: vault.id },
        data: { balance: newVaultBalance, totalInflow: newInflow, totalOutflow: newOutflow }
      });
    } catch (vaultErr) {
      console.warn('Vault auto-sync notice:', vaultErr.message);
    }

    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record account transaction', error: error.message });
  }
};

module.exports = { getChartOfAccounts, getAccountLedger, createAccountHead, recordAccountTransaction };
