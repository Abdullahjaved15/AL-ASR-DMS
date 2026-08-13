const prisma = require('../config/db');

const getOrCreateVault = async () => {
  let vault = await prisma.centralVault.findFirst({
    include: {
      transactions: {
        take: 50,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!vault) {
    vault = await prisma.centralVault.create({
      data: {
        accountName: 'Main Company Vault',
        accountNumber: 'VAULT-001',
        balance: 0,
        totalInflow: 0,
        totalOutflow: 0
      },
      include: {
        transactions: true
      }
    });
  }

  return vault;
};

const getVaultSummary = async (req, res) => {
  try {
    const vault = await getOrCreateVault();
    return res.json(vault);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch Central Vault summary', error: error.message });
  }
};

const recordTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, referenceNo } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive amount is required' });
    }

    const vault = await getOrCreateVault();

    const tx = await prisma.vaultTransaction.create({
      data: {
        vaultId: vault.id,
        type: type === 'OUTFLOW' ? 'OUTFLOW' : 'INFLOW',
        amount: numAmount,
        category: category || 'OTHER',
        description: description || 'Vault manual entry',
        referenceNo: referenceNo || null,
        createdById: req.user.id
      }
    });

    const newBalance = type === 'OUTFLOW' 
      ? vault.balance - numAmount 
      : vault.balance + numAmount;

    const newInflow = type === 'INFLOW' ? vault.totalInflow + numAmount : vault.totalInflow;
    const newOutflow = type === 'OUTFLOW' ? vault.totalOutflow + numAmount : vault.totalOutflow;

    await prisma.centralVault.update({
      where: { id: vault.id },
      data: {
        balance: newBalance,
        totalInflow: newInflow,
        totalOutflow: newOutflow
      }
    });

    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record vault transaction', error: error.message });
  }
};

module.exports = { getVaultSummary, recordTransaction, getOrCreateVault };
