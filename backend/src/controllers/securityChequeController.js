const prisma = require('../config/db');

// Helper to generate transaction number
const generateTxnNumber = async (prefix = 'TXN') => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.transaction.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${sequence}`;
};

// 1. Get Security Cheques List
const getSecurityCheques = async (req, res) => {
  try {
    const { status, type, search = '', page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (type && type !== 'ALL') {
      whereClause.type = type;
    }
    if (search) {
      whereClause.OR = [
        { chequeNumber: { contains: search, mode: 'insensitive' } },
        { partyName: { contains: search, mode: 'insensitive' } },
        { partyPhone: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [cheques, totalCount, statsRaw] = await Promise.all([
      prisma.securityCheque.findMany({
        where: whereClause,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          bankAccount: { select: { id: true, code: true, name: true, bankName: true, currentBalance: true } },
          createdByUser: { select: { id: true, name: true, role: true } }
        }
      }),
      prisma.securityCheque.count({ where: whereClause }),
      prisma.securityCheque.findMany({
        where: whereClause,
        select: { amount: true, status: true, type: true }
      })
    ]);

    const totalIssuedActive = statsRaw
      .filter(c => c.type === 'ISSUED' && ['ISSUED', 'PRESENTED'].includes(c.status))
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalCleared = statsRaw
      .filter(c => c.status === 'CLEARED')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalBounced = statsRaw
      .filter(c => c.status === 'BOUNCED')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    return res.json({
      cheques,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalCount,
        totalIssuedActive,
        totalCleared,
        totalBounced
      }
    });
  } catch (error) {
    console.error('getSecurityCheques error:', error);
    return res.status(500).json({ message: 'Failed to fetch security cheques', error: error.message });
  }
};

// 2. Create Security Cheque
const createSecurityCheque = async (req, res) => {
  try {
    const {
      chequeNumber,
      type = 'ISSUED',
      bankAccountId,
      bankName,
      partyName,
      partyPhone,
      partyCnic,
      amount,
      issueDate,
      dueDate,
      chassisNumber,
      notes
    } = req.body;

    if (!chequeNumber || !partyName || !amount || !dueDate) {
      return res.status(400).json({ message: 'Cheque number, party name, amount, and due date are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    let finalBankName = bankName;
    if (bankAccountId) {
      const bankAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });
      if (bankAcc) {
        finalBankName = bankAcc.bankName || bankAcc.name;
      }
    }

    const cheque = await prisma.securityCheque.create({
      data: {
        chequeNumber: chequeNumber.trim(),
        type,
        bankAccountId: bankAccountId || null,
        bankName: finalBankName || 'N/A',
        partyName: partyName.trim(),
        partyPhone: partyPhone || null,
        partyCnic: partyCnic || null,
        amount: numAmount,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: new Date(dueDate),
        status: 'ISSUED',
        chassisNumber: chassisNumber || null,
        notes: notes || null,
        createdById: req.user.id
      },
      include: {
        bankAccount: true,
        createdByUser: { select: { id: true, name: true } }
      }
    });

    return res.status(201).json({
      message: 'Security cheque recorded successfully',
      cheque
    });
  } catch (error) {
    console.error('createSecurityCheque error:', error);
    return res.status(500).json({ message: 'Failed to record security cheque', error: error.message });
  }
};

// 3. Update Status (e.g. mark as CLEARED, PRESENTED, BOUNCED, CANCELLED, RETURNED)
const updateChequeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clearedBankAccountId, clearingDate, notes } = req.body;

    const cheque = await prisma.securityCheque.findUnique({
      where: { id },
      include: { bankAccount: true }
    });

    if (!cheque) {
      return res.status(404).json({ message: 'Security cheque not found' });
    }

    if (cheque.status === 'CLEARED') {
      return res.status(400).json({ message: 'Cheque is already cleared and locked.' });
    }

    const validStatuses = ['ISSUED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'RETURNED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid cheque status' });
    }

    // If status is becoming CLEARED, create bank ledger deduction
    if (status === 'CLEARED') {
      const targetBankId = clearedBankAccountId || cheque.bankAccountId;
      if (!targetBankId) {
        return res.status(400).json({ 
          message: 'Please select which Bank Account this security cheque cleared from.' 
        });
      }

      const bankAccount = await prisma.account.findUnique({ where: { id: targetBankId } });
      if (!bankAccount) {
        return res.status(404).json({ message: 'Designated bank account not found' });
      }

      const clrDate = clearingDate ? new Date(clearingDate) : new Date();
      const txnNumber = await generateTxnNumber('CHQ-CLR');

      const updatedCheque = await prisma.$transaction(async (tx) => {
        // Create Transaction
        const transaction = await tx.transaction.create({
          data: {
            transactionNumber: txnNumber,
            date: clrDate,
            type: 'SECURITY_CHEQUE_CLEARANCE',
            amount: cheque.amount,
            description: `Security Cheque #${cheque.chequeNumber} Cleared for [${cheque.partyName}] from [${bankAccount.name}]`,
            referenceType: 'CHEQUE',
            referenceNumber: cheque.chequeNumber,
            chassisNumber: cheque.chassisNumber || null,
            createdById: req.user.id,
            entries: {
              create: [
                {
                  accountId: bankAccount.id,
                  type: 'CREDIT', // Bank deduction
                  amount: cheque.amount,
                  description: `Cheque #${cheque.chequeNumber} cleared to ${cheque.partyName}`
                }
              ]
            }
          }
        });

        // Deduct from bank account balance
        await tx.account.update({
          where: { id: bankAccount.id },
          data: { currentBalance: { decrement: cheque.amount } }
        });

        // Update cheque record
        return await tx.securityCheque.update({
          where: { id },
          data: {
            status: 'CLEARED',
            clearedAt: clrDate,
            bankAccountId: bankAccount.id,
            transactionId: transaction.id,
            notes: notes ? `${cheque.notes ? cheque.notes + ' | ' : ''}${notes}` : cheque.notes
          },
          include: { bankAccount: true }
        });
      });

      return res.json({
        message: 'Security cheque cleared and bank account updated successfully',
        cheque: updatedCheque
      });
    }

    // Other status changes (PRESENTED, BOUNCED, CANCELLED, RETURNED)
    const updated = await prisma.securityCheque.update({
      where: { id },
      data: {
        status,
        notes: notes ? `${cheque.notes ? cheque.notes + ' | ' : ''}${notes}` : cheque.notes
      },
      include: { bankAccount: true }
    });

    return res.json({
      message: `Cheque status updated to ${status}`,
      cheque: updated
    });
  } catch (error) {
    console.error('updateChequeStatus error:', error);
    return res.status(500).json({ message: 'Failed to update cheque status', error: error.message });
  }
};

// 4. Update Cheque Details (Accounts Head / Super Admin)
const updateSecurityCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      chequeNumber,
      bankAccountId,
      bankName,
      partyName,
      partyPhone,
      partyCnic,
      amount,
      issueDate,
      dueDate,
      chassisNumber,
      notes
    } = req.body;

    const cheque = await prisma.securityCheque.findUnique({ where: { id } });
    if (!cheque) {
      return res.status(404).json({ message: 'Security cheque not found' });
    }

    if (cheque.status === 'CLEARED') {
      return res.status(400).json({ message: 'Cannot edit cleared cheque' });
    }

    const updated = await prisma.securityCheque.update({
      where: { id },
      data: {
        chequeNumber: chequeNumber !== undefined ? chequeNumber.trim() : cheque.chequeNumber,
        bankAccountId: bankAccountId !== undefined ? bankAccountId : cheque.bankAccountId,
        bankName: bankName !== undefined ? bankName : cheque.bankName,
        partyName: partyName !== undefined ? partyName.trim() : cheque.partyName,
        partyPhone: partyPhone !== undefined ? partyPhone : cheque.partyPhone,
        partyCnic: partyCnic !== undefined ? partyCnic : cheque.partyCnic,
        amount: amount !== undefined ? parseFloat(amount) : cheque.amount,
        issueDate: issueDate !== undefined ? new Date(issueDate) : cheque.issueDate,
        dueDate: dueDate !== undefined ? new Date(dueDate) : cheque.dueDate,
        chassisNumber: chassisNumber !== undefined ? chassisNumber : cheque.chassisNumber,
        notes: notes !== undefined ? notes : cheque.notes
      },
      include: { bankAccount: true }
    });

    return res.json({ message: 'Security cheque updated successfully', cheque: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update security cheque', error: error.message });
  }
};

// 5. Delete Security Cheque (Accounts Head / Super Admin)
const deleteSecurityCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const cheque = await prisma.securityCheque.findUnique({ where: { id } });

    if (!cheque) {
      return res.status(404).json({ message: 'Security cheque not found' });
    }

    if (cheque.status === 'CLEARED') {
      return res.status(400).json({ message: 'Cannot delete a cleared security cheque' });
    }

    await prisma.securityCheque.delete({ where: { id } });
    return res.json({ message: 'Security cheque deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete security cheque', error: error.message });
  }
};

module.exports = {
  getSecurityCheques,
  createSecurityCheque,
  updateChequeStatus,
  updateSecurityCheque,
  deleteSecurityCheque
};
