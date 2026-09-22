const prisma = require('../config/db');
const { parsePakistaniPrice } = require('../utils/priceParser');

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
// 3. Create a new Account (3 Classification Types: BANK_ACCOUNT, CASH_ACCOUNT, OTHER)
const createAccount = async (req, res) => {
  try {
    const {
      code,
      name,
      classificationType, // 'BANK_ACCOUNT', 'CASH_ACCOUNT', 'OTHER'
      type,
      subType,
      bankName,
      accountNumber,
      branch,
      openingBalance = 0,
      description
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'Account name / title is required.' });
    }

    // Determine normalized classification type and subtype
    let finalType = type || 'LIABILITY';
    let finalSubType = subType || 'OTHER';

    if (subType === 'BANK' || type === 'BANK' || classificationType === 'BANK_ACCOUNT') {
      finalType = 'ASSET';
      finalSubType = 'BANK';
    } else if (subType === 'CASH' || type === 'CASH' || classificationType === 'CASH_ACCOUNT') {
      finalType = 'ASSET';
      finalSubType = 'CASH';
    } else if (type && ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(type)) {
      finalType = type;
      finalSubType = subType || (type === 'EXPENSE' ? 'EXPENSE' : 'OTHER');
    } else {
      finalType = 'LIABILITY';
      finalSubType = subType || 'OTHER';
    }

    // Auto-generate code if not provided
    let finalCode = code ? String(code).trim() : '';
    if (!finalCode) {
      let prefix = '3';
      if (finalSubType === 'CASH') prefix = '1';
      else if (finalSubType === 'BANK') prefix = '2';
      else if (finalType === 'ASSET') prefix = '1';
      else if (finalType === 'LIABILITY') prefix = '2';
      else if (finalType === 'EQUITY') prefix = '3';
      else if (finalType === 'REVENUE') prefix = '4';
      else if (finalType === 'EXPENSE') prefix = '5';
      else prefix = '3';
      
      const existingAccounts = await prisma.account.findMany({
        select: { code: true }
      });
      const codeSet = new Set(existingAccounts.map(a => String(a.code || '').trim()));
      
      let candidate = parseInt(`${prefix}001`, 10);
      while (codeSet.has(String(candidate))) {
        candidate++;
      }
      finalCode = String(candidate);
    }

    const existingCode = await prisma.account.findUnique({ where: { code: finalCode } });
    if (existingCode) {
      return res.status(400).json({ message: `Account code ${finalCode} is already taken. Please specify a unique code.` });
    }

    const numOpening = openingBalance !== undefined && openingBalance !== '' ? parsePakistaniPrice(openingBalance) : 0;

    const newAccount = await prisma.account.create({
      data: {
        code: finalCode,
        name: name.trim(),
        type: finalType,
        subType: finalSubType,
        bankName: finalSubType === 'BANK' ? (bankName || null) : null,
        accountNumber: finalSubType === 'BANK' ? (accountNumber || null) : null,
        branch: finalSubType === 'BANK' ? (branch || null) : null,
        openingBalance: numOpening,
        currentBalance: numOpening,
        description: description || null,
        isSystem: false,
        createdBy: req.user.id
      }
    });

    // If opening balance !== 0, log opening balance transaction
    if (numOpening !== 0) {
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(finalType);
      const entryType = isDebitNormal
        ? (numOpening > 0 ? 'DEBIT' : 'CREDIT')
        : (numOpening > 0 ? 'CREDIT' : 'DEBIT');

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
                type: entryType,
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
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim() }),
        ...(type && { type }),
        ...(subType && { subType }),
        ...(bankName !== undefined && { bankName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(branch !== undefined && { branch }),
        ...(description !== undefined && { description }),
        ...(openingBalance !== undefined && { openingBalance: parsePakistaniPrice(openingBalance) }),
        ...(currentBalance !== undefined && { currentBalance: parsePakistaniPrice(currentBalance) }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return res.json({ message: 'Account updated successfully', account: updated });
  } catch (error) {
    console.error('updateAccount error:', error);
    return res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
};

// 5. Delete Account (Accounts Head / Super Admin: Deletes ledger and its transaction history cleanly)
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true, securityCheques: true } }
      }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account / Ledger not found' });
    }

    const totalEntries = account._count?.entries || 0;

    // 1. Unlink from Security Cheques
    await prisma.securityCheque.updateMany({
      where: { bankAccountId: id },
      data: { bankAccountId: null }
    });

    // 2. Unlink from Invoices / Receipts
    await prisma.invoice.updateMany({
      where: { bankAccountId: id },
      data: { bankAccountId: null }
    });

    // 3. Unlink from Installment items
    await prisma.installmentItem.updateMany({
      where: { bankAccountId: id },
      data: { bankAccountId: null }
    });

    // 4. Unlink from Accounts Stock
    await prisma.accountsStock.updateMany({
      where: { ledgerAccountId: id },
      data: { ledgerAccountId: null, ledgerAccountName: null }
    });

    // 5. Delete all transaction entries for this account
    await prisma.transactionEntry.deleteMany({
      where: { accountId: id }
    });

    // 6. Delete the Account / Ledger
    await prisma.account.delete({ where: { id } });

    // 7. Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_ACCOUNT_LEDGER',
        details: `Accounts Head deleted ledger account "${account.name}" (${account.code})${totalEntries > 0 ? ` and cleaned up its ${totalEntries} transaction entries` : ''}.`
      }
    });

    return res.json({
      message: `Account "${account.name}" (${account.code}) and all its associated ledger entries have been deleted successfully.`
    });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};

// 6. Get Account Ledger (Standard Accounting Running balance, debits, credits, timestamps)
const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, search = '' } = req.query;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.type);
    const normalBalanceType = isDebitNormal ? 'DEBIT' : 'CREDIT';

    // Calculate prior balance if filtering from a specific startDate
    let periodOpeningBalance = 0;
    if (startDate) {
      const priorEntries = await prisma.transactionEntry.findMany({
        where: {
          accountId: id,
          transaction: {
            date: { lt: new Date(startDate) }
          }
        },
        include: { transaction: true }
      });

      const hasPriorOB = priorEntries.some(e => 
        e.transaction?.transactionNumber?.startsWith('OB-') || 
        e.transaction?.description?.toLowerCase().includes('opening balance')
      );
      periodOpeningBalance = hasPriorOB ? 0 : (account.openingBalance || 0);
      for (const pe of priorEntries) {
        const amt = Number(pe.amount) || 0;
        if (isDebitNormal) {
          if (pe.type === 'DEBIT') {
            periodOpeningBalance += amt;
          } else {
            periodOpeningBalance -= amt;
          }
        } else {
          if (pe.type === 'CREDIT') {
            periodOpeningBalance += amt;
          } else {
            periodOpeningBalance -= amt;
          }
        }
      }
    } else {
      periodOpeningBalance = account.openingBalance || 0;
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

    if (search && search.trim()) {
      const q = search.trim();
      whereTxn.OR = [
        { transactionNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { chassisNumber: { contains: q, mode: 'insensitive' } }
      ];
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

    const hasOpeningBalanceTxnInEntries = !startDate && entries.some(e => 
      e.transaction?.transactionNumber?.startsWith('OB-') || 
      e.transaction?.description?.toLowerCase().includes('opening balance')
    );
    let running = hasOpeningBalanceTxnInEntries ? 0 : periodOpeningBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const statementEntries = entries.map(entry => {
      const amt = Number(entry.amount) || 0;
      const isDebit = entry.type === 'DEBIT';
      if (isDebit) {
        totalDebit += amt;
        if (isDebitNormal) {
          running += amt;
        } else {
          running -= amt;
        }
      } else {
        totalCredit += amt;
        if (isDebitNormal) {
          running -= amt;
        } else {
          running += amt;
        }
      }

      const runningBalType = isDebitNormal
        ? (running >= 0 ? 'Dr' : 'Cr')
        : (running >= 0 ? 'Cr' : 'Dr');

      return {
        id: entry.id,
        date: entry.transaction.date,
        transactionNumber: entry.transaction.transactionNumber,
        type: entry.transaction.type,
        entryType: entry.type,
        debitAmount: isDebit ? amt : 0,
        creditAmount: !isDebit ? amt : 0,
        amount: amt,
        description: entry.description || entry.transaction.description,
        referenceNumber: entry.transaction.referenceNumber,
        referenceType: entry.transaction.referenceType,
        chassisNumber: entry.transaction.chassisNumber,
        createdBy: entry.transaction.createdByUser?.name || 'System',
        runningBalance: running,
        runningBalanceAbs: Math.abs(running),
        runningBalanceType: runningBalType
      };
    });

    const openingBalType = isDebitNormal
      ? (periodOpeningBalance >= 0 ? 'Dr' : 'Cr')
      : (periodOpeningBalance >= 0 ? 'Cr' : 'Dr');

    const closingBalType = isDebitNormal
      ? (running >= 0 ? 'Dr' : 'Cr')
      : (running >= 0 ? 'Cr' : 'Dr');

    return res.json({
      account,
      normalBalanceType,
      isDebitNormal,
      openingBalance: periodOpeningBalance,
      openingBalanceAbs: Math.abs(periodOpeningBalance),
      openingBalanceType: openingBalType,
      totalDebit,
      totalCredit,
      netChange: isDebitNormal ? (totalDebit - totalCredit) : (totalCredit - totalDebit),
      closingBalance: running,
      closingBalanceAbs: Math.abs(running),
      closingBalanceType: closingBalType,
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

    const numAmount = parsePakistaniPrice(amount);
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

// 8. Receive Amount / Deposit into any Ledger or Bank Account
const receiveAmountInLedger = async (req, res) => {
  try {
    const {
      accountId,
      amount,
      receivedFrom,
      paymentMethod = 'CASH',
      bankAccountId,
      sourceAccountId,
      date,
      referenceNumber,
      chassisNumber,
      description,
      notes
    } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({ message: 'Target ledger account and amount are required.' });
    }

    const numAmount = parsePakistaniPrice(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid positive amount.' });
    }

    const targetAccount = await prisma.account.findUnique({ where: { id: accountId } });
    if (!targetAccount) {
      return res.status(404).json({ message: 'Target account not found.' });
    }

    let sourceAccount = null;
    if (sourceAccountId && sourceAccountId !== accountId) {
      sourceAccount = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    }

    const isTargetCashOrBank = targetAccount.subType === 'CASH' || targetAccount.subType === 'BANK';
    const isBankMethod = paymentMethod === 'BANK' || paymentMethod === 'BANK_TRANSFER' || (paymentMethod === 'CHEQUE' && !!bankAccountId);

    const txnDate = date ? new Date(date) : new Date();
    const txnNumber = await generateTxnNumber('RV');
    const fullDesc = description || `Amount Received into [${targetAccount.name}] from ${receivedFrom || 'Party'}${notes ? ` - ${notes}` : ''}`;

    const result = await prisma.$transaction(async (tx) => {
      let depositAccount = null;
      let entriesToCreate = [];

      if (isTargetCashOrBank) {
        // Target is already Cash or Bank
        depositAccount = targetAccount;

        // 1. Primary Entry (DEBIT into Cash / Bank)
        entriesToCreate.push({
          accountId: depositAccount.id,
          type: 'DEBIT',
          amount: numAmount,
          description: `Received from ${receivedFrom || 'Party'}: ${fullDesc}`
        });

        // 2. Offsetting Double-Entry (CREDIT into Source / Revenue)
        if (sourceAccount) {
          const isSourceNormalDebit = ['ASSET', 'EXPENSE'].includes(sourceAccount.type);
          entriesToCreate.push({
            accountId: sourceAccount.id,
            type: isSourceNormalDebit ? 'CREDIT' : 'DEBIT',
            amount: numAmount,
            description: `Credit/Settled into [${depositAccount.name}] from ${receivedFrom || 'Party'}`
          });

          const sourceDelta = isSourceNormalDebit ? -numAmount : numAmount;
          await tx.account.update({
            where: { id: sourceAccount.id },
            data: { currentBalance: { increment: sourceDelta } }
          });
        } else {
          // Fallback offset revenue/income ledger if no offset was explicitly selected
          let defaultIncome = await tx.account.findFirst({ where: { code: '4001' } })
            || await tx.account.findFirst({ where: { type: 'REVENUE' } });
          if (!defaultIncome) {
            defaultIncome = await tx.account.create({
              data: {
                code: '4001',
                name: 'Vehicle Sales & Inflow Revenue',
                type: 'REVENUE',
                subType: 'REVENUE',
                currentBalance: 0,
                description: 'Primary revenue and customer payment inflows'
              }
            });
          }
          if (defaultIncome.id !== depositAccount.id) {
            entriesToCreate.push({
              accountId: defaultIncome.id,
              type: 'CREDIT',
              amount: numAmount,
              description: `Revenue inflow from ${receivedFrom || 'Party'}`
            });
            await tx.account.update({
              where: { id: defaultIncome.id },
              data: { currentBalance: { increment: numAmount } }
            });
          }
        }

        await tx.account.update({
          where: { id: depositAccount.id },
          data: { currentBalance: { increment: numAmount } }
        });
      } else {
        // Target is a Customer, Supplier, Expense, Liability, Equity, or Revenue Ledger
        // Resolve Deposit (Inflow) Account: Cash in Hand Safe (1001) or designated Bank Account
        if (isBankMethod) {
          if (bankAccountId) {
            depositAccount = await tx.account.findUnique({ where: { id: bankAccountId } });
          }
          if (!depositAccount) {
            depositAccount = await tx.account.findFirst({ where: { subType: 'BANK', isActive: true } })
              || await tx.account.findFirst({ where: { subType: 'BANK' } });
          }
        } else {
          depositAccount = await tx.account.findFirst({ where: { subType: 'CASH', isActive: true } })
            || await tx.account.findFirst({ where: { subType: 'CASH' } });
          if (!depositAccount) {
            depositAccount = await tx.account.create({
              data: {
                code: '1001',
                name: 'Cash in Hand Safe',
                type: 'ASSET',
                subType: 'CASH',
                currentBalance: 0,
                description: 'Physical showroom safe cash'
              }
            });
          }
        }

        const methodLabel = isBankMethod ? `Bank Transfer [${depositAccount?.name || 'Bank'}]` : 'Cash in Hand Safe';

        // 1. DEBIT Deposit Account (Cash / Bank Inflow)
        if (depositAccount) {
          entriesToCreate.push({
            accountId: depositAccount.id,
            type: 'DEBIT',
            amount: numAmount,
            description: `Received via ${methodLabel} from ${receivedFrom || targetAccount.name}: ${fullDesc}`
          });

          await tx.account.update({
            where: { id: depositAccount.id },
            data: { currentBalance: { increment: numAmount } }
          });
        }

        // 2. CREDIT Target Ledger Account (reduces receivable for customer, credits liability/equity/revenue)
        entriesToCreate.push({
          accountId: targetAccount.id,
          type: 'CREDIT',
          amount: numAmount,
          description: `Payment received via ${methodLabel} from ${receivedFrom || 'Party'}`
        });

        const targetDelta = targetAccount.type === 'ASSET' || targetAccount.type === 'EXPENSE'
          ? -numAmount
          : numAmount;

        await tx.account.update({
          where: { id: targetAccount.id },
          data: { currentBalance: { increment: targetDelta } }
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: txnDate,
          type: 'RECEIPT_VOUCHER',
          amount: numAmount,
          description: fullDesc,
          referenceType: 'MANUAL',
          referenceNumber: referenceNumber || txnNumber,
          chassisNumber: chassisNumber || null,
          createdById: req.user.id,
          entries: {
            create: entriesToCreate
          }
        }
      });

      const updatedTarget = await tx.account.findUnique({ where: { id: targetAccount.id } });

      return { transaction, updatedAccount: updatedTarget, depositAccount };
    }, { timeout: 25000, maxWait: 15000 });

    try {
      await prisma.notification.create({
        data: {
          title: `💰 Amount Received: Rs. ${numAmount.toLocaleString()}`,
          message: `Rs. ${numAmount.toLocaleString()} received in [${targetAccount.name}] from "${receivedFrom || 'Party'}". Method: ${paymentMethod} (Deposited into ${result.depositAccount ? result.depositAccount.name : 'Safe'}).`,
          type: 'FINANCIAL_INFLOW',
          category: result.depositAccount?.subType === 'BANK' ? 'BANK' : 'CASH',
          amount: numAmount,
          targetRole: 'ACCOUNTS_HEAD'
        }
      });
    } catch (e) {
      // quiet fail
    }

    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'RECEIVE_AMOUNT_LEDGER',
          details: `Received Rs. ${numAmount.toLocaleString()} in ${targetAccount.name} (${targetAccount.code}) via ${result.depositAccount ? result.depositAccount.name : paymentMethod} from ${receivedFrom || 'Party'}`
        }
      });
    } catch (e) {
      // quiet fail
    }

    return res.status(201).json({
      message: `Successfully received Rs. ${numAmount.toLocaleString()} in ${targetAccount.name}`,
      transaction: result.transaction,
      account: result.updatedAccount
    });
  } catch (error) {
    console.error('receiveAmountInLedger error:', error);
    return res.status(500).json({ message: 'Failed to record received amount in ledger', error: error.message });
  }
};

// 9. Pay Amount / Record Outflow through Payment Voucher (PV)
const payAmountFromLedger = async (req, res) => {
  try {
    const {
      accountId,
      amount,
      paidTo,
      paymentMethod = 'CASH',
      bankAccountId,
      targetAccountId,
      date,
      referenceNumber,
      chassisNumber,
      description,
      notes
    } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({ message: 'Source account and amount are required.' });
    }

    const numAmount = parsePakistaniPrice(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid positive amount.' });
    }

    const sourceAccount = await prisma.account.findUnique({ where: { id: accountId } });
    if (!sourceAccount) {
      return res.status(404).json({ message: 'Source account not found.' });
    }

    let targetAccount = null;
    if (targetAccountId && targetAccountId !== accountId) {
      targetAccount = await prisma.account.findUnique({ where: { id: targetAccountId } });
    }

    const isSourceCashOrBank = sourceAccount.subType === 'CASH' || sourceAccount.subType === 'BANK';
    const isBankMethod = paymentMethod === 'BANK' || paymentMethod === 'BANK_TRANSFER' || (paymentMethod === 'CHEQUE' && !!bankAccountId);

    const txnDate = date ? new Date(date) : new Date();
    const txnNumber = await generateTxnNumber('PV');
    const fullDesc = description || `Payment Voucher from [${sourceAccount.name}] to ${paidTo || 'Party'}${notes ? ` - ${notes}` : ''}`;

    const result = await prisma.$transaction(async (tx) => {
      let disbursingAccount = null;
      let entriesToCreate = [];

      if (isSourceCashOrBank) {
        // Disbursing directly from Cash or Bank
        disbursingAccount = sourceAccount;

        // 1. Primary Entry (CREDIT outflow from Cash / Bank)
        entriesToCreate.push({
          accountId: disbursingAccount.id,
          type: 'CREDIT',
          amount: numAmount,
          description: `Payment Voucher to ${paidTo || 'Party'}: ${fullDesc}`
        });

        // 2. Offsetting Double-Entry (DEBIT Expense / Target Account)
        if (targetAccount) {
          const isTargetNormalDebit = ['ASSET', 'EXPENSE'].includes(targetAccount.type);
          entriesToCreate.push({
            accountId: targetAccount.id,
            type: isTargetNormalDebit ? 'DEBIT' : 'CREDIT',
            amount: numAmount,
            description: `Paid from [${disbursingAccount.name}] to ${paidTo || 'Party'}`
          });

          const targetDelta = isTargetNormalDebit ? numAmount : -numAmount;
          await tx.account.update({
            where: { id: targetAccount.id },
            data: { currentBalance: { increment: targetDelta } }
          });
        } else {
          // Fallback default expense ledger if no expense was explicitly selected
          let defaultExpense = await tx.account.findFirst({ where: { code: '5001' } })
            || await tx.account.findFirst({ where: { type: 'EXPENSE' } });
          if (!defaultExpense) {
            defaultExpense = await tx.account.create({
              data: {
                code: '5001',
                name: 'General Showroom Expenses & Payouts',
                type: 'EXPENSE',
                subType: 'EXPENSE',
                currentBalance: 0,
                description: 'General operational and showroom expense payouts'
              }
            });
          }
          if (defaultExpense.id !== disbursingAccount.id) {
            entriesToCreate.push({
              accountId: defaultExpense.id,
              type: 'DEBIT',
              amount: numAmount,
              description: `Expense payout to ${paidTo || 'Party'}`
            });
            await tx.account.update({
              where: { id: defaultExpense.id },
              data: { currentBalance: { increment: numAmount } }
            });
          }
        }

        await tx.account.update({
          where: { id: disbursingAccount.id },
          data: { currentBalance: { increment: -numAmount } }
        });
      } else {
        // Source is an Expense, Supplier Payable, Customer, or other Ledger
        // Resolve Disbursing (Outflow) Account: Cash in Hand Safe (1001) or designated Bank Account
        if (isBankMethod) {
          if (bankAccountId) {
            disbursingAccount = await tx.account.findUnique({ where: { id: bankAccountId } });
          }
          if (!disbursingAccount) {
            disbursingAccount = await tx.account.findFirst({ where: { subType: 'BANK', isActive: true } })
              || await tx.account.findFirst({ where: { subType: 'BANK' } });
          }
        } else {
          disbursingAccount = await tx.account.findFirst({ where: { subType: 'CASH', isActive: true } })
            || await tx.account.findFirst({ where: { subType: 'CASH' } });
          if (!disbursingAccount) {
            disbursingAccount = await tx.account.create({
              data: {
                code: '1001',
                name: 'Cash in Hand Safe',
                type: 'ASSET',
                subType: 'CASH',
                currentBalance: 0,
                description: 'Physical showroom safe cash'
              }
            });
          }
        }

        const methodLabel = isBankMethod ? `Bank Account [${disbursingAccount?.name || 'Bank'}]` : 'Cash in Hand Safe';

        // 1. CREDIT Disbursing Account (Cash / Bank Outflow)
        if (disbursingAccount) {
          entriesToCreate.push({
            accountId: disbursingAccount.id,
            type: 'CREDIT',
            amount: numAmount,
            description: `Payment Voucher disbursed via ${methodLabel} to ${paidTo || 'Party'}: ${fullDesc}`
          });

          await tx.account.update({
            where: { id: disbursingAccount.id },
            data: { currentBalance: { increment: -numAmount } }
          });
        }

        // 2. DEBIT Source Ledger Account (records expense, reduces payable liability)
        entriesToCreate.push({
          accountId: sourceAccount.id,
          type: 'DEBIT',
          amount: numAmount,
          description: `Disbursed via ${methodLabel} to ${paidTo || 'Party'}`
        });

        const sourceDelta = sourceAccount.type === 'EXPENSE' || sourceAccount.type === 'ASSET'
          ? numAmount
          : -numAmount;

        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalance: { increment: sourceDelta } }
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: txnDate,
          type: 'PAYMENT_VOUCHER',
          amount: numAmount,
          description: fullDesc,
          referenceType: 'PAYMENT_VOUCHER',
          referenceNumber: referenceNumber || txnNumber,
          chassisNumber: chassisNumber || null,
          createdById: req.user.id,
          entries: {
            create: entriesToCreate
          }
        }
      });

      const updatedSource = await tx.account.findUnique({ where: { id: sourceAccount.id } });

      return { transaction, updatedAccount: updatedSource, disbursingAccount };
    }, { timeout: 25000, maxWait: 15000 });

    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'PAY_AMOUNT_LEDGER',
          details: `Generated Payment Voucher ${result.transaction.transactionNumber} for Rs. ${numAmount.toLocaleString()} from ${sourceAccount.name} (${sourceAccount.code}) via ${result.disbursingAccount ? result.disbursingAccount.name : paymentMethod} to ${paidTo || 'Party'}`
        }
      });
    } catch (e) {
      // quiet fail
    }

    return res.status(201).json({
      message: `Successfully generated Payment Voucher (${result.transaction.transactionNumber}) for Rs. ${numAmount.toLocaleString()} from ${sourceAccount.name}`,
      transaction: result.transaction,
      account: result.updatedAccount
    });
  } catch (error) {
    console.error('payAmountFromLedger error:', error);
    return res.status(500).json({ message: 'Failed to record payment from ledger', error: error.message });
  }
};

module.exports = {
  getAccounts,
  getBankAndCashAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountLedger,
  transferFunds,
  receiveAmountInLedger,
  payAmountFromLedger
};
