const prisma = require('../config/db');
const { getOrCreateVault } = require('./vaultController');

const getInstallmentPlans = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { planNumber: { contains: search, mode: 'insensitive' } },
        { vehicleDetails: { contains: search, mode: 'insensitive' } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const plans = await prisma.installmentPlan.findMany({
      where,
      include: {
        customer: true,
        seller: true,
        schedules: {
          orderBy: { installmentNo: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(plans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch installment plans', error: error.message });
  }
};

const createInstallmentPlan = async (req, res) => {
  try {
    const {
      customerId, customerName, cnic, phone, address, city,
      sellerId, vehicleDetails, totalAmount, downPayment, totalInstallments, startDate
    } = req.body;

    const numTotal = parseFloat(totalAmount) || 0;
    const numDown = parseFloat(downPayment) || 0;
    const countInst = parseInt(totalInstallments) || 12;

    if (numTotal <= 0 || countInst <= 0) {
      return res.status(400).json({ message: 'Valid total amount and installment count are required' });
    }

    // Resolve or create Customer
    let targetCustomerId = customerId;
    if (!targetCustomerId) {
      let customer = await prisma.customer.findFirst({
        where: cnic ? { cnic } : { customerName }
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            customerName: customerName || 'Installment Customer',
            cnic: cnic || null,
            phone: phone || null,
            address: address || null,
            city: city || null
          }
        });
      }
      targetCustomerId = customer.id;
    }

    const financedAmount = Math.max(0, numTotal - numDown);
    const monthlyInstallment = financedAmount / countInst;
    const planNumber = `INST-${Date.now().toString().slice(-6)}`;

    const plan = await prisma.installmentPlan.create({
      data: {
        planNumber,
        customerId: targetCustomerId,
        sellerId: sellerId || null,
        vehicleDetails: vehicleDetails || 'Vehicle Unit',
        totalAmount: numTotal,
        downPayment: numDown,
        financedAmount,
        monthlyInstallment,
        totalInstallments: countInst,
        status: 'ACTIVE'
      }
    });

    // Generate monthly schedule entries
    const start = startDate ? new Date(startDate) : new Date();
    const schedulesData = [];
    for (let i = 1; i <= countInst; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      schedulesData.push({
        planId: plan.id,
        installmentNo: i,
        dueDate,
        amount: monthlyInstallment,
        status: 'PENDING'
      });
    }

    await prisma.installmentSchedule.createMany({
      data: schedulesData
    });

    // If down payment paid, record vault inflow
    if (numDown > 0) {
      const vault = await getOrCreateVault();
      await prisma.vaultTransaction.create({
        data: {
          vaultId: vault.id,
          type: 'INFLOW',
          amount: numDown,
          category: 'INSTALLMENT',
          description: `Down payment for plan ${planNumber} (${vehicleDetails})`,
          referenceNo: planNumber,
          createdById: req.user.id
        }
      });

      await prisma.centralVault.update({
        where: { id: vault.id },
        data: {
          balance: vault.balance + numDown,
          totalInflow: vault.totalInflow + numDown
        }
      });
    }

    const fullPlan = await prisma.installmentPlan.findUnique({
      where: { id: plan.id },
      include: { customer: true, schedules: true }
    });

    return res.status(201).json(fullPlan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create installment plan', error: error.message });
  }
};

const payInstallment = async (req, res) => {
  try {
    const { scheduleId, paidAmount, remarks } = req.body;

    const schedule = await prisma.installmentSchedule.findUnique({
      where: { id: scheduleId },
      include: { plan: true }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Installment schedule record not found' });
    }

    const amountPaid = parseFloat(paidAmount) || schedule.amount;

    await prisma.installmentSchedule.update({
      where: { id: scheduleId },
      data: {
        paidAmount: amountPaid,
        paidDate: new Date(),
        status: 'PAID',
        remarks: remarks || 'Installment paid'
      }
    });

    // Check paid installments count on plan
    const updatedPlanSchedules = await prisma.installmentSchedule.findMany({
      where: { planId: schedule.planId }
    });

    const paidCount = updatedPlanSchedules.filter(s => s.status === 'PAID').length;
    const isCompleted = paidCount >= schedule.plan.totalInstallments;

    await prisma.installmentPlan.update({
      where: { id: schedule.planId },
      data: {
        paidInstallments: paidCount,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE'
      }
    });

    // Record vault inflow
    const vault = await getOrCreateVault();
    await prisma.vaultTransaction.create({
      data: {
        vaultId: vault.id,
        type: 'INFLOW',
        amount: amountPaid,
        category: 'INSTALLMENT',
        description: `Installment #${schedule.installmentNo} collection for plan ${schedule.plan.planNumber}`,
        referenceNo: schedule.plan.planNumber,
        createdById: req.user.id
      }
    });

    await prisma.centralVault.update({
      where: { id: vault.id },
      data: {
        balance: vault.balance + amountPaid,
        totalInflow: vault.totalInflow + amountPaid
      }
    });

    return res.json({ message: 'Installment payment recorded successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to process installment payment', error: error.message });
  }
};

const getDefaulterAlerts = async (req, res) => {
  try {
    const today = new Date();
    const overdueSchedules = await prisma.installmentSchedule.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: today }
      },
      include: {
        plan: {
          include: { customer: true, seller: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return res.json(overdueSchedules);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch defaulter alerts', error: error.message });
  }
};

module.exports = { getInstallmentPlans, createInstallmentPlan, payInstallment, getDefaulterAlerts };
