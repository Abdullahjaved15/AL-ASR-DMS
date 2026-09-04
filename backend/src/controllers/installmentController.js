const prisma = require('../config/db');

// Helper to generate plan & transaction numbers
const generatePlanNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.installmentPlan.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `IP-${dateStr}-${sequence}`;
};

const generateTxnNumber = async (prefix = 'TXN') => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.transaction.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${sequence}`;
};

// 1. Get Installment Plans
const getInstallmentPlans = async (req, res) => {
  try {
    const { status, search = '', page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { planNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customerCnic: { contains: search, mode: 'insensitive' } },
        { vehicleName: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { registrationNo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [plans, totalCount, allPlansRaw] = await Promise.all([
      prisma.installmentPlan.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          items: { orderBy: { installmentNumber: 'asc' } },
          createdByUser: { select: { id: true, name: true } }
        }
      }),
      prisma.installmentPlan.count({ where: whereClause }),
      prisma.installmentPlan.findMany({
        where: whereClause,
        select: {
          totalPrice: true,
          advanceAmount: true,
          remainingAmount: true,
          status: true,
          items: { select: { status: true, dueDate: true, amount: true, paidAmount: true } }
        }
      })
    ]);

    const totalPortfolioValue = allPlansRaw.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalAdvanceCollected = allPlansRaw.reduce((sum, p) => sum + (p.advanceAmount || 0), 0);
    const totalOutstandingRemaining = allPlansRaw.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);
    
    // Calculate total collected through installments
    let totalInstallmentsCollected = 0;
    let overdueInstallmentsCount = 0;
    const now = new Date();

    allPlansRaw.forEach(plan => {
      plan.items?.forEach(item => {
        totalInstallmentsCollected += (item.paidAmount || 0);
        if (item.status === 'UNPAID' && new Date(item.dueDate) < now) {
          overdueInstallmentsCount++;
        }
      });
    });

    return res.json({
      plans,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalPlans: totalCount,
        totalPortfolioValue,
        totalAdvanceCollected,
        totalInstallmentsCollected,
        totalOutstandingRemaining,
        overdueInstallmentsCount
      }
    });
  } catch (error) {
    console.error('getInstallmentPlans error:', error);
    return res.status(500).json({ message: 'Failed to fetch installment plans', error: error.message });
  }
};

// 2. Get Single Plan Details
const getInstallmentPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await prisma.installmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { installmentNumber: 'asc' } },
        createdByUser: { select: { id: true, name: true, email: true } }
      }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Installment plan not found' });
    }

    return res.json(plan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch installment plan details', error: error.message });
  }
};

// 3. Create Installment Plan
const createInstallmentPlan = async (req, res) => {
  try {
    const {
      invoiceId,
      customerName,
      customerPhone,
      customerCnic,
      customerAddress,
      vehicleName,
      registrationNo,
      chassisNumber,
      totalPrice,
      advanceAmount = 0,
      totalInstallments = 12,
      installmentAmount,
      frequency = 'MONTHLY',
      startDate,
      notes
    } = req.body;

    if (!customerName || !vehicleName || !totalPrice || !totalInstallments) {
      return res.status(400).json({ message: 'Customer name, vehicle name, total price, and installments count are required' });
    }

    const numTotal = parseFloat(totalPrice);
    const numAdvance = parseFloat(advanceAmount) || 0;
    const numInstallmentsCount = parseInt(totalInstallments, 10);
    const numRemaining = Math.max(0, numTotal - numAdvance);

    const calculatedInstallmentAmt = installmentAmount 
      ? parseFloat(installmentAmount) 
      : Math.round(numRemaining / numInstallmentsCount);

    const planNumber = await generatePlanNumber();
    const start = startDate ? new Date(startDate) : new Date();

    // Generate schedule items
    const scheduleItems = [];
    for (let i = 1; i <= numInstallmentsCount; i++) {
      const dueDate = new Date(start);
      if (frequency === 'MONTHLY') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else if (frequency === 'QUARTERLY') {
        dueDate.setMonth(dueDate.getMonth() + (i * 3));
      } else {
        dueDate.setMonth(dueDate.getMonth() + i);
      }

      // Adjust last installment for rounding differences
      const isLast = i === numInstallmentsCount;
      const priorTotal = calculatedInstallmentAmt * (numInstallmentsCount - 1);
      const itemAmt = isLast ? Math.max(0, numRemaining - priorTotal) : calculatedInstallmentAmt;

      scheduleItems.push({
        installmentNumber: i,
        dueDate,
        amount: itemAmt,
        paidAmount: 0,
        status: 'UNPAID'
      });
    }

    const newPlan = await prisma.installmentPlan.create({
      data: {
        planNumber,
        invoiceId: invoiceId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        customerCnic: customerCnic || null,
        customerAddress: customerAddress || null,
        vehicleName: vehicleName.trim(),
        registrationNo: registrationNo || null,
        chassisNumber: chassisNumber || null,
        totalPrice: numTotal,
        advanceAmount: numAdvance,
        remainingAmount: numRemaining,
        totalInstallments: numInstallmentsCount,
        installmentAmount: calculatedInstallmentAmt,
        frequency,
        startDate: start,
        status: numRemaining === 0 ? 'COMPLETED' : 'ACTIVE',
        notes: notes || null,
        createdById: req.user.id,
        items: {
          create: scheduleItems
        }
      },
      include: {
        items: { orderBy: { installmentNumber: 'asc' } }
      }
    });

    return res.status(201).json({
      message: 'Installment plan created successfully',
      plan: newPlan
    });
  } catch (error) {
    console.error('createInstallmentPlan error:', error);
    return res.status(500).json({ message: 'Failed to create installment plan', error: error.message });
  }
};

// 4. Record Installment Payment
const recordInstallmentPayment = async (req, res) => {
  try {
    const { planId } = req.params;
    const {
      itemId,
      paymentMethod = 'CASH',
      bankAccountId,
      paidAmount,
      paidDate,
      receiptNumber,
      notes
    } = req.body;

    const numPaid = parseFloat(paidAmount);
    if (isNaN(numPaid) || numPaid <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const plan = await prisma.installmentPlan.findUnique({
      where: { id: planId },
      include: { items: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Installment plan not found' });
    }

    // Determine target item
    let targetItem = null;
    if (itemId) {
      targetItem = plan.items.find(i => i.id === itemId);
    } else {
      // Find first unpaid or partial item
      targetItem = plan.items.find(i => i.status !== 'PAID');
    }

    if (!targetItem) {
      return res.status(400).json({ message: 'All installments in this plan are already fully paid.' });
    }

    // Determine target cash or bank account
    let destinationAccount = null;
    if (paymentMethod === 'BANK') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Please select which bank account received this installment payment.' });
      }
      destinationAccount = await prisma.account.findUnique({ where: { id: bankAccountId } });
    } else {
      destinationAccount = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } });
    }

    if (!destinationAccount) {
      return res.status(400).json({ message: 'Destination Cash or Bank account not found' });
    }

    const receivablesAccount = await prisma.account.findFirst({ where: { code: '1050' } }) 
      || await prisma.account.findFirst({ where: { type: 'ASSET', subType: 'CUSTOMER' } });

    const paymentTimestamp = paidDate ? new Date(paidDate) : new Date();
    const finalReceiptNo = receiptNumber || `INST-${targetItem.installmentNumber}-${Date.now().toString().slice(-4)}`;
    const txnNumber = await generateTxnNumber('INST');

    const updatedPlan = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction (Double Entry)
      const txn = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          date: paymentTimestamp,
          type: 'INSTALLMENT_PAYMENT',
          amount: numPaid,
          description: `Installment #${targetItem.installmentNumber} payment received from [${plan.customerName}] for [${plan.vehicleName}] (Chassis: ${plan.chassisNumber || 'N/A'}) into [${destinationAccount.name}]`,
          referenceType: 'INSTALLMENT',
          referenceId: plan.id,
          referenceNumber: finalReceiptNo,
          chassisNumber: plan.chassisNumber || null,
          createdById: req.user.id,
          entries: {
            create: [
              {
                accountId: destinationAccount.id,
                type: 'DEBIT', // Cash or Bank Inflow
                amount: numPaid,
                description: `Installment received for ${plan.customerName}`
              },
              ...(receivablesAccount ? [{
                accountId: receivablesAccount.id,
                type: 'CREDIT', // Receivables reduced
                amount: numPaid,
                description: `Receivable clearance for ${plan.customerName}`
              }] : [])
            ]
          }
        }
      });

      // 2. Increment destination account balance
      await tx.account.update({
        where: { id: destinationAccount.id },
        data: { currentBalance: { increment: numPaid } }
      });

      // 3. Update InstallmentItem
      const newPaidTotal = (targetItem.paidAmount || 0) + numPaid;
      const isFullyPaid = newPaidTotal >= targetItem.amount;
      const itemStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

      await tx.installmentItem.update({
        where: { id: targetItem.id },
        data: {
          paidAmount: newPaidTotal,
          paidDate: paymentTimestamp,
          paymentMethod,
          bankAccountId: destinationAccount.id,
          receiptNumber: finalReceiptNo,
          status: itemStatus,
          transactionId: txn.id,
          notes: notes ? `${targetItem.notes ? targetItem.notes + ' | ' : ''}${notes}` : targetItem.notes
        }
      });

      // 4. Update Plan remaining amount
      const newPlanRemaining = Math.max(0, plan.remainingAmount - numPaid);
      const newPlanStatus = newPlanRemaining === 0 ? 'COMPLETED' : 'ACTIVE';

      return await tx.installmentPlan.update({
        where: { id: plan.id },
        data: {
          remainingAmount: newPlanRemaining,
          status: newPlanStatus
        },
        include: {
          items: { orderBy: { installmentNumber: 'asc' } }
        }
      });
    });

    return res.json({
      message: 'Installment payment recorded successfully',
      plan: updatedPlan
    });
  } catch (error) {
    console.error('recordInstallmentPayment error:', error);
    return res.status(500).json({ message: 'Failed to record installment payment', error: error.message });
  }
};

// 5. Update Plan Details (Accounts Head / Super Admin)
const updateInstallmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerPhone,
      customerCnic,
      customerAddress,
      vehicleName,
      registrationNo,
      chassisNumber,
      status,
      notes,
      totalPrice,
      advanceAmount,
      remainingAmount
    } = req.body;

    const plan = await prisma.installmentPlan.findUnique({ where: { id } });
    if (!plan) {
      return res.status(404).json({ message: 'Installment plan not found' });
    }

    const updated = await prisma.installmentPlan.update({
      where: { id },
      data: {
        customerName: customerName !== undefined ? customerName.trim() : plan.customerName,
        customerPhone: customerPhone !== undefined ? customerPhone : plan.customerPhone,
        customerCnic: customerCnic !== undefined ? customerCnic : plan.customerCnic,
        customerAddress: customerAddress !== undefined ? customerAddress : plan.customerAddress,
        vehicleName: vehicleName !== undefined ? vehicleName.trim() : plan.vehicleName,
        registrationNo: registrationNo !== undefined ? registrationNo : plan.registrationNo,
        chassisNumber: chassisNumber !== undefined ? chassisNumber : plan.chassisNumber,
        status: status !== undefined ? status : plan.status,
        notes: notes !== undefined ? notes : plan.notes,
        totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : plan.totalPrice,
        advanceAmount: advanceAmount !== undefined ? parseFloat(advanceAmount) : plan.advanceAmount,
        remainingAmount: remainingAmount !== undefined ? parseFloat(remainingAmount) : plan.remainingAmount
      },
      include: {
        items: { orderBy: { installmentNumber: 'asc' } }
      }
    });

    return res.json({ message: 'Installment plan updated successfully', plan: updated });
  } catch (error) {
    console.error('updateInstallmentPlan error:', error);
    return res.status(500).json({ message: 'Failed to update installment plan', error: error.message });
  }
};

// 6. Delete Plan (Accounts Head / Super Admin)
const deleteInstallmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await prisma.installmentPlan.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Installment plan not found' });
    }

    // Cascade delete schedule items and unlink invoice
    await prisma.$transaction(async (tx) => {
      await tx.installmentItem.deleteMany({ where: { installmentPlanId: id } });
      await tx.invoice.updateMany({ where: { installmentPlanId: id }, data: { installmentPlanId: null, isInstallmentSale: false } });
      await tx.installmentPlan.delete({ where: { id } });
    });

    return res.json({ message: 'Installment plan deleted successfully' });
  } catch (error) {
    console.error('deleteInstallmentPlan error:', error);
    return res.status(500).json({ message: 'Failed to delete installment plan', error: error.message });
  }
};

module.exports = {
  getInstallmentPlans,
  getInstallmentPlanById,
  createInstallmentPlan,
  recordInstallmentPayment,
  updateInstallmentPlan,
  deleteInstallmentPlan
};
