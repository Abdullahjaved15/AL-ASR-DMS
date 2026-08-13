const prisma = require('../config/db');

const getSecurityCheques = async (req, res) => {
  try {
    const { status, type, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { chequeNumber: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { accountHolder: { contains: search, mode: 'insensitive' } }
      ];
    }

    const cheques = await prisma.securityCheque.findMany({
      where,
      orderBy: { dueDate: 'asc' }
    });

    return res.json(cheques);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch security cheques', error: error.message });
  }
};

const createSecurityCheque = async (req, res) => {
  try {
    const { chequeNumber, bankName, accountHolder, type, amount, issueDate, dueDate, notes } = req.body;

    if (!chequeNumber || !bankName || !accountHolder || !amount) {
      return res.status(400).json({ message: 'Cheque Number, Bank Name, Account Holder, and Amount are required' });
    }

    const cheque = await prisma.securityCheque.create({
      data: {
        chequeNumber,
        bankName,
        accountHolder,
        type: type === 'ISSUED' ? 'ISSUED' : 'RECEIVED',
        amount: parseFloat(amount) || 0,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        status: 'ISSUED',
        notes: notes || null
      }
    });

    return res.status(201).json(cheque);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record security cheque', error: error.message });
  }
};

const updateChequeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const cheque = await prisma.securityCheque.update({
      where: { id },
      data: {
        status: status || 'CLEARED',
        notes: notes !== undefined ? notes : undefined
      }
    });

    return res.json(cheque);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update cheque status', error: error.message });
  }
};

module.exports = { getSecurityCheques, createSecurityCheque, updateChequeStatus };
