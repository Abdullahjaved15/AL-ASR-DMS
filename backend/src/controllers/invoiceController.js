const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const { parsePakistaniPrice } = require('../utils/priceParser');

// Helper to upload image to Cloudinary if it's a base64 string
const handleCloudinaryUpload = async (photoStr, folderName) => {
  if (!photoStr) return null;
  if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
    return photoStr;
  }
  if (photoStr.startsWith('data:image/')) {
    try {
      const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
      if (useCloudinary) {
        const uploadRes = await cloudinary.uploader.upload(photoStr, {
          folder: `dealership/${folderName}`
        });
        return uploadRes.secure_url;
      }
    } catch (err) {
      console.warn('Cloudinary upload warning:', err.message);
    }
  }
  return photoStr;
};

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '', approvalStatus = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (category === 'CANCELLED_BOOKINGS' || category === 'CANCELLED_BOOKING') {
      whereClause.category = 'BOOKING_RECEIPT';
      whereClause.bookingStatus = 'CANCELLED';
    } else {
      whereClause.isDeleted = false;
      if (category && category !== 'ALL') {
        whereClause.category = category;
      }
    }

    if (approvalStatus && approvalStatus !== 'ALL') {
      whereClause.approvalStatus = approvalStatus;
    }

    if (search) {
      whereClause.AND = [
        category && category !== 'ALL' ? { category } : {},
        approvalStatus && approvalStatus !== 'ALL' ? { approvalStatus } : {},
        {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { registrationNo: { contains: search, mode: 'insensitive' } },
            { buyerName: { contains: search, mode: 'insensitive' } },
            { buyerPhone: { contains: search, mode: 'insensitive' } },
            { buyerCnic: { contains: search, mode: 'insensitive' } },
            { sellerName: { contains: search, mode: 'insensitive' } },
            { sellerPhone: { contains: search, mode: 'insensitive' } },
            { sellerCnic: { contains: search, mode: 'insensitive' } },
            { payeeName: { contains: search, mode: 'insensitive' } },
            { headOfAccount: { contains: search, mode: 'insensitive' } },
            { vehicleMaker: { contains: search, mode: 'insensitive' } },
            { vehicleModel: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [invoices, totalCount, statsRaw, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          createdByUser: { select: { id: true, name: true, email: true, role: true } },
          approvedByUser: { select: { id: true, name: true, email: true, role: true } },
          images: { orderBy: { uploadedAt: 'desc' } }
        }
      }),
      prisma.invoice.count({ where: whereClause }),
      prisma.invoice.findMany({
        where: { isDeleted: false },
        select: {
          totalPrice: true,
          saleAmount: true,
          commissionAmount: true,
          totalAmount: true,
          approvalStatus: true
        }
      }),
      prisma.invoice.count({ where: { isDeleted: false, approvalStatus: 'PENDING' } }),
      prisma.invoice.count({ where: { isDeleted: false, approvalStatus: 'APPROVED' } }),
      prisma.invoice.count({ where: { isDeleted: false, approvalStatus: 'REJECTED' } })
    ]);

    const totalSalesVolume = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalPrice || inv.saleAmount), 0);
    const totalCommissionEarned = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.commissionAmount), 0);
    const grandTotalValue = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalAmount), 0) || (totalSalesVolume + totalCommissionEarned);

    const approvedSalesVolume = statsRaw
      .filter(inv => inv.approvalStatus === 'APPROVED')
      .reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalPrice || inv.saleAmount), 0);
    const pendingSalesVolume = statsRaw
      .filter(inv => inv.approvalStatus === 'PENDING')
      .reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalPrice || inv.saleAmount), 0);

    return res.json({
      invoices,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: statsRaw.length
        }
      },
      stats: {
        totalInvoices: totalCount,
        totalSalesVolume,
        totalCommissionEarned,
        grandTotalValue,
        approvedSalesVolume,
        pendingSalesVolume,
        pendingApprovalsCount: pendingCount,
        approvedCount,
        rejectedCount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        approvedByUser: { select: { id: true, name: true, email: true, role: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.json(invoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoice details', error: error.message });
  }
};

// Search active booking receipts by customer phone number
const findActiveBookingByPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || String(phone).trim() === '') {
      return res.json({ bookings: [] });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    if (cleanDigits.length < 5) {
      return res.json({ bookings: [] });
    }

    // Fetch candidate booking receipts that are active and not deleted/converted
    const allBookings = await prisma.invoice.findMany({
      where: {
        category: 'BOOKING_RECEIPT',
        isDeleted: false,
        bookingStatus: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const matched = allBookings.filter(b => {
      const bDigits = String(b.buyerPhone || b.customerPhone || '').replace(/\D/g, '');
      return bDigits && (bDigits.includes(cleanDigits) || cleanDigits.includes(bDigits));
    });

    return res.json({ bookings: matched });
  } catch (error) {
    console.error('findActiveBookingByPhone error:', error);
    return res.status(500).json({ message: 'Failed to search booking receipts', error: error.message });
  }
};

// Helper to find or auto-create Customer Ledger Account in Chart of Accounts
const findOrCreateCustomerAccount = async (customerName, customerPhone) => {
  if (!customerName || customerName === 'N/A' || String(customerName).trim() === '') return null;
  const cleanName = String(customerName).trim();
  let acc = await prisma.account.findFirst({
    where: {
      name: { equals: cleanName, mode: 'insensitive' },
      subType: 'CUSTOMER'
    }
  }) || await prisma.account.findFirst({
    where: {
      name: { equals: cleanName, mode: 'insensitive' }
    }
  });

  if (!acc) {
    const maxAcc = await prisma.account.findFirst({
      where: { code: { startsWith: '12' } },
      orderBy: { code: 'desc' }
    });
    let nextCode = '1201';
    if (maxAcc && !isNaN(Number(maxAcc.code))) {
      nextCode = String(Number(maxAcc.code) + 1);
    }
    acc = await prisma.account.create({
      data: {
        code: nextCode,
        name: cleanName,
        type: 'ASSET',
        subType: 'CUSTOMER',
        currentBalance: 0,
        description: `Customer Ledger for ${cleanName}${customerPhone ? ' (Phone: ' + customerPhone + ')' : ''}`
      }
    });
  }
  return acc;
};

// Comprehensive Helper to Synchronize Double-Entry Ledger Transactions for Invoices & Vouchers
const syncInvoiceLedgerTransactions = async (invoiceId, userId) => {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return null;

  // 1. Revert and delete any existing transactions for this invoice
  const existingTxns = await prisma.transaction.findMany({
    where: {
      OR: [
        { referenceId: inv.id },
        { referenceNumber: inv.invoiceNumber }
      ]
    },
    include: { entries: true }
  });

  for (const txn of existingTxns) {
    for (const entry of txn.entries) {
      const acc = await prisma.account.findUnique({ where: { id: entry.accountId } });
      if (acc) {
        if (entry.type === 'DEBIT') {
          if (['ASSET', 'EXPENSE'].includes(acc.type)) {
            await prisma.account.update({
              where: { id: acc.id },
              data: { currentBalance: { decrement: entry.amount } }
            });
          } else {
            await prisma.account.update({
              where: { id: acc.id },
              data: { currentBalance: { increment: entry.amount } }
            });
          }
        } else if (entry.type === 'CREDIT') {
          if (['ASSET', 'EXPENSE'].includes(acc.type)) {
            await prisma.account.update({
              where: { id: acc.id },
              data: { currentBalance: { increment: entry.amount } }
            });
          } else {
            await prisma.account.update({
              where: { id: acc.id },
              data: { currentBalance: { decrement: entry.amount } }
            });
          }
        }
      }
    }
    await prisma.transaction.delete({ where: { id: txn.id } });
  }

  // 2. Gatekeeper: Only post double-entry ledger transactions to Bank / Cash accounts if approved by Accounts Head!
  if (inv.approvalStatus !== 'APPROVED') {
    return null;
  }

  // 3. Post fresh double-entry transactions
  const todayDate = inv.date || new Date();
  const countTxn = await prisma.transaction.count();
  const txnSeq = String(countTxn + 1).padStart(4, '0');
  const dateCode = new Date(todayDate).toISOString().slice(0, 10).replace(/-/g, '');
  const finalUserId = userId || inv.createdBy;

  if (inv.category === 'PAYMENT_VOUCHER') {
    const paymentAmt = parsePakistaniPrice(inv.cashAmount || inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0);
    if (paymentAmt > 0) {
      let sourceAccount = null;
      if (inv.paymentMethod === 'BANK' && inv.bankAccountId) {
        sourceAccount = await prisma.account.findUnique({ where: { id: inv.bankAccountId } });
      }
      if (!sourceAccount) {
        sourceAccount = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } })
          || await prisma.account.findFirst({ where: { subType: 'CASH' } });
      }
      if (!sourceAccount) {
        sourceAccount = await prisma.account.create({
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

      let targetAccount = null;
      if (inv.headOfAccount && String(inv.headOfAccount).trim() !== '') {
        const cleanHead = String(inv.headOfAccount).trim();
        targetAccount = await prisma.account.findFirst({
          where: {
            OR: [
              { id: cleanHead },
              { code: cleanHead },
              { name: { equals: cleanHead, mode: 'insensitive' } },
              { name: { contains: cleanHead, mode: 'insensitive' } }
            ]
          }
        });

        if (!targetAccount) {
          const maxAcc = await prisma.account.findFirst({
            where: { code: { startsWith: '5' } },
            orderBy: { code: 'desc' }
          });
          let nextCode = '5001';
          if (maxAcc && !isNaN(Number(maxAcc.code))) {
            nextCode = String(Number(maxAcc.code) + 1);
          }
          targetAccount = await prisma.account.create({
            data: {
              code: nextCode,
              name: cleanHead,
              type: 'EXPENSE',
              subType: 'EXPENSE',
              currentBalance: 0,
              description: `Auto-created ledger account for ${cleanHead}`
            }
          });
        }
      }

      if (!targetAccount) {
        targetAccount = await prisma.account.findFirst({ where: { type: 'EXPENSE', isActive: true } })
          || await prisma.account.findFirst({ where: { type: 'EXPENSE' } });
      }

      if (!targetAccount) {
        targetAccount = await prisma.account.create({
          data: {
            code: '5001',
            name: 'General & Miscellaneous Expenses',
            type: 'EXPENSE',
            subType: 'EXPENSE',
            currentBalance: 0,
            description: 'General operational and voucher expenses'
          }
        });
      }

      await prisma.transaction.create({
        data: {
          transactionNumber: `PV-${dateCode}-${txnSeq}`,
          date: todayDate,
          type: 'PAYMENT_VOUCHER',
          amount: paymentAmt,
          description: `Payment Voucher ${inv.invoiceNumber} to [${inv.payeeName || inv.buyerName || 'Payee'}] via [${sourceAccount.name}] - Head: [${targetAccount.name}] ${inv.remarks || inv.onAccount ? '(' + (inv.remarks || inv.onAccount) + ')' : ''}`,
          referenceType: 'INVOICE',
          referenceId: inv.id,
          referenceNumber: inv.invoiceNumber,
          chassisNumber: inv.chassisNumber || null,
          createdById: finalUserId,
          entries: {
            create: [
              {
                accountId: sourceAccount.id,
                type: 'CREDIT',
                amount: paymentAmt,
                description: `Payment to ${inv.payeeName || inv.buyerName || 'Payee'}`
              },
              {
                accountId: targetAccount.id,
                type: 'DEBIT',
                amount: paymentAmt,
                description: `Payment Voucher for [${targetAccount.name}]: ${inv.payeeName || inv.buyerName || 'Payee'}`
              }
            ]
          }
        }
      });

      // Update balances
      await prisma.account.update({
        where: { id: sourceAccount.id },
        data: { currentBalance: { decrement: paymentAmt } }
      });

      if (['EXPENSE', 'ASSET'].includes(targetAccount.type)) {
        await prisma.account.update({
          where: { id: targetAccount.id },
          data: { currentBalance: { increment: paymentAmt } }
        });
      } else {
        await prisma.account.update({
          where: { id: targetAccount.id },
          data: { currentBalance: { decrement: paymentAmt } }
        });
      }
    }
  } else if (inv.category === 'SALES_RECEIPT' && inv.isInstallmentSale) {
    // ----------------------------------------------------
    // INSTALLMENT SALE DOUBLE-ENTRY LEDGER POSTING
    // ----------------------------------------------------
    // e.g. Buyer bought 70 Lac car, paid 35 Lac Advance, 35 Lac Remaining in Installments.
    // Inflow: Advance (35 Lac) DEBITs Cash in Hand / Bank.
    // Receivable: Remaining (35 Lac) DEBITs Buyer / Customer Ledger.
    // Revenue: Total (70 Lac) CREDITs Vehicle Sales Revenue.
    const numericTotalPrice = parsePakistaniPrice(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0);
    const numericAdvance = parsePakistaniPrice(inv.advanceAmount || 0);
    const numericRemaining = inv.remainingAmount !== undefined && inv.remainingAmount !== null && inv.remainingAmount !== ''
      ? parsePakistaniPrice(inv.remainingAmount)
      : Math.max(0, numericTotalPrice - numericAdvance);

    let cashAdv = 0;
    let bankAdv = 0;

    if (inv.paymentMethod === 'BANK') {
      bankAdv = numericAdvance;
    } else if (inv.paymentMethod === 'SPLIT') {
      const splitCash = parsePakistaniPrice(inv.cashAmountReceived);
      const splitBank = parsePakistaniPrice(inv.bankAmountReceived);
      if (splitCash + splitBank > 0) {
        const ratio = splitCash / (splitCash + splitBank);
        cashAdv = Math.round(numericAdvance * ratio);
        bankAdv = numericAdvance - cashAdv;
      } else {
        cashAdv = numericAdvance;
      }
    } else {
      cashAdv = numericAdvance;
    }

    let cashAccount = null;
    if (cashAdv > 0) {
      cashAccount = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } })
        || await prisma.account.findFirst({ where: { subType: 'CASH' } });
      if (!cashAccount) {
        cashAccount = await prisma.account.create({
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

    let bankAccount = null;
    if (bankAdv > 0) {
      if (inv.bankAccountId) {
        bankAccount = await prisma.account.findUnique({ where: { id: inv.bankAccountId } });
      }
      if (!bankAccount) {
        bankAccount = await prisma.account.findFirst({ where: { subType: 'BANK', isActive: true } })
          || await prisma.account.findFirst({ where: { subType: 'BANK' } });
      }
    }

    // Buyer / Customer Ledger Account
    const customerAccount = await findOrCreateCustomerAccount(inv.buyerName || inv.customerName, inv.buyerPhone || inv.customerPhone);

    // Sales Revenue Account
    let revenueAccount = await prisma.account.findFirst({ where: { code: '4001' } }) 
      || await prisma.account.findFirst({ where: { type: 'REVENUE' } });
    if (!revenueAccount) {
      revenueAccount = await prisma.account.create({
        data: {
          code: '4001',
          name: 'Vehicle Sales Revenue',
          type: 'REVENUE',
          subType: 'REVENUE',
          currentBalance: 0,
          description: 'Primary revenue from vehicle sales & installments'
        }
      });
    }

    const entriesToCreate = [];

    // 1. Debit Cash Safe for Advance
    if (cashAdv > 0 && cashAccount) {
      entriesToCreate.push({
        accountId: cashAccount.id,
        type: 'DEBIT',
        amount: cashAdv,
        description: `Advance Cash received from ${inv.buyerName || 'Customer'} for ${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}`
      });
    }

    // 2. Debit Bank Account for Advance
    if (bankAdv > 0 && bankAccount) {
      entriesToCreate.push({
        accountId: bankAccount.id,
        type: 'DEBIT',
        amount: bankAdv,
        description: `Advance Bank transfer from ${inv.buyerName || 'Customer'} into ${bankAccount.name}`
      });
    }

    // 3. Debit Customer Ledger for Remaining Installments Receivable
    if (numericRemaining > 0 && customerAccount) {
      entriesToCreate.push({
        accountId: customerAccount.id,
        type: 'DEBIT',
        amount: numericRemaining,
        description: `Installment balance receivable from [${inv.buyerName || 'Customer'}] for [${inv.vehicleMaker || ''} ${inv.vehicleModel || ''} - Chassis: ${inv.chassisNumber || 'N/A'}]`
      });
    }

    // 4. Credit Vehicle Sales Revenue for Full Deal Price
    if (numericTotalPrice > 0 && revenueAccount) {
      entriesToCreate.push({
        accountId: revenueAccount.id,
        type: 'CREDIT',
        amount: numericTotalPrice,
        description: `Vehicle Sales Revenue from ${inv.buyerName || 'Customer'} (${inv.vehicleMaker || ''} ${inv.vehicleModel || ''})`
      });
    }

    if (entriesToCreate.length > 0) {
      await prisma.transaction.create({
        data: {
          transactionNumber: `INST-SALE-${dateCode}-${txnSeq}`,
          date: todayDate,
          type: 'SALES_INVOICE',
          amount: numericTotalPrice,
          description: `Installment Sale #${inv.invoiceNumber} to [${inv.buyerName || 'Customer'}] for [${inv.vehicleMaker || ''} ${inv.vehicleModel || ''} - Chassis: ${inv.chassisNumber || 'N/A'}] (Total: Rs. ${numericTotalPrice}, Advance Inflow: Rs. ${numericAdvance}, Installments Balance: Rs. ${numericRemaining})`,
          referenceType: 'INVOICE',
          referenceId: inv.id,
          referenceNumber: inv.invoiceNumber,
          chassisNumber: inv.chassisNumber || null,
          createdById: finalUserId,
          entries: { create: entriesToCreate }
        }
      });

      if (cashAdv > 0 && cashAccount) {
        await prisma.account.update({
          where: { id: cashAccount.id },
          data: { currentBalance: { increment: cashAdv } }
        });
      }
      if (bankAdv > 0 && bankAccount) {
        await prisma.account.update({
          where: { id: bankAccount.id },
          data: { currentBalance: { increment: bankAdv } }
        });
      }
      if (numericRemaining > 0 && customerAccount) {
        await prisma.account.update({
          where: { id: customerAccount.id },
          data: { currentBalance: { increment: numericRemaining } }
        });
      }
      if (numericTotalPrice > 0 && revenueAccount) {
        await prisma.account.update({
          where: { id: revenueAccount.id },
          data: { currentBalance: { increment: numericTotalPrice } }
        });
      }
    }
  } else {
    // SALES_RECEIPT, BOOKING_RECEIPT, DELIVERY_LETTER
    const numericTotalPrice = parsePakistaniPrice(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0);
    const numericAdvance = parsePakistaniPrice(inv.advanceAmount || 0);
    const numericRemaining = inv.remainingAmount !== undefined && inv.remainingAmount !== null && inv.remainingAmount !== ''
      ? parsePakistaniPrice(inv.remainingAmount)
      : Math.max(0, numericTotalPrice - numericAdvance);

    const isConsignment = Boolean(inv.category === 'SALES_RECEIPT' && inv.isCustomerVehicle);
    let effectiveTotalReceived = 0;

    const isTradeIn = Boolean(inv.isTradeIn);
    const numericTradeInValuation = isTradeIn ? parsePakistaniPrice(inv.tradeInValuation) : 0;
    const numericTradeInCash = isTradeIn ? parsePakistaniPrice(inv.tradeInCashAdvance || 0) : 0;
    const hasTradeInInventory = isTradeIn && numericTradeInValuation > 0 && !(inv.category === 'SALES_RECEIPT' && inv.linkedBookingId);

    if (isConsignment) {
      // Customer-owned vehicle: Dealership does NOT receive total car price into Safe/Bank.
      // The car sale price is paid directly to the customer/seller who brought the vehicle.
      // ONLY the commission earned by dealership is deposited into Safe/Bank.
      effectiveTotalReceived = parsePakistaniPrice(inv.commissionAmount || 0);
    } else if (inv.category === 'BOOKING_RECEIPT') {
      if (isTradeIn) {
        // For Booking Receipt with Trade-in / Car Exchange:
        // Monetary inflow is the extra monetary advance portion (if any)
        const explicitCashAdv = parsePakistaniPrice(inv.tradeInCashAdvance || 0);
        const computedMonetaryAdv = Math.max(0, numericAdvance - numericTradeInValuation);
        effectiveTotalReceived = explicitCashAdv > 0 ? explicitCashAdv : computedMonetaryAdv;
      } else {
        effectiveTotalReceived = numericAdvance > 0 ? numericAdvance : numericTotalPrice;
      }
    } else if (inv.category === 'SALES_RECEIPT') {
      if (inv.linkedBookingId) {
        // Converted from booking receipt: advance was already collected in booking.
        // ONLY collect remaining balance into cash safe / bank now!
        effectiveTotalReceived = numericRemaining;
      } else if (isTradeIn) {
        // Direct Sales Receipt with Trade-In:
        // Liquid inflow into Cash/Bank is total price minus trade-in car value
        const explicitCashAdv = parsePakistaniPrice(inv.tradeInCashAdvance || 0);
        const computedMonetaryAdv = Math.max(0, numericTotalPrice - numericTradeInValuation);
        effectiveTotalReceived = explicitCashAdv > 0 ? explicitCashAdv : computedMonetaryAdv;
      } else {
        effectiveTotalReceived = numericAdvance > 0 ? numericRemaining : numericTotalPrice;
      }
    } else {
      // DELIVERY_LETTER or fallback
      effectiveTotalReceived = numericAdvance > 0 ? numericRemaining : numericTotalPrice;
    }

    let cashReceived = 0;
    let bankReceived = 0;

    if (isConsignment) {
      if (inv.paymentMethod === 'BANK') {
        bankReceived = effectiveTotalReceived;
      } else if (inv.paymentMethod === 'SPLIT') {
        const splitCash = parsePakistaniPrice(inv.cashAmountReceived);
        const splitBank = parsePakistaniPrice(inv.bankAmountReceived);
        if (splitCash + splitBank > 0) {
          const ratio = splitCash / (splitCash + splitBank);
          cashReceived = Math.round(effectiveTotalReceived * ratio);
          bankReceived = effectiveTotalReceived - cashReceived;
        } else {
          cashReceived = effectiveTotalReceived;
        }
      } else {
        cashReceived = effectiveTotalReceived;
      }
    } else {
      if (inv.paymentMethod === 'CASH') {
        cashReceived = effectiveTotalReceived;
        bankReceived = 0;
      } else if (inv.paymentMethod === 'BANK') {
        bankReceived = effectiveTotalReceived;
        cashReceived = 0;
      } else if (inv.paymentMethod === 'SPLIT') {
        const splitCash = parsePakistaniPrice(inv.cashAmountReceived);
        const splitBank = parsePakistaniPrice(inv.bankAmountReceived);
        if (splitCash + splitBank > 0) {
          if (splitCash + splitBank === effectiveTotalReceived) {
            cashReceived = splitCash;
            bankReceived = splitBank;
          } else {
            const ratio = splitCash / (splitCash + splitBank);
            cashReceived = Math.round(effectiveTotalReceived * ratio);
            bankReceived = effectiveTotalReceived - cashReceived;
          }
        } else {
          cashReceived = effectiveTotalReceived;
          bankReceived = 0;
        }
      } else {
        cashReceived = effectiveTotalReceived;
        bankReceived = 0;
      }
    }

    const totalReceived = cashReceived + bankReceived;

    if (totalReceived > 0 || hasTradeInInventory) {
      let inventoryAccount = null;
      if (hasTradeInInventory) {
        inventoryAccount = await prisma.account.findFirst({ where: { code: '1100' } })
          || await prisma.account.findFirst({ where: { subType: 'INVENTORY' } });
        if (!inventoryAccount) {
          inventoryAccount = await prisma.account.create({
            data: {
              code: '1100',
              name: 'Showroom Vehicle Stock Inventory',
              type: 'ASSET',
              subType: 'INVENTORY',
              currentBalance: 0,
              description: 'Physical vehicle stock inventory asset'
            }
          });
        }
      }

      let cashAccount = null;
      if (cashReceived > 0) {
        cashAccount = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } })
          || await prisma.account.findFirst({ where: { subType: 'CASH' } });
        if (!cashAccount) {
          cashAccount = await prisma.account.create({
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

      let bankAccount = null;
      if (bankReceived > 0) {
        if (inv.bankAccountId) {
          bankAccount = await prisma.account.findUnique({ where: { id: inv.bankAccountId } });
        }
        if (!bankAccount) {
          bankAccount = await prisma.account.findFirst({ where: { subType: 'BANK', isActive: true } })
            || await prisma.account.findFirst({ where: { subType: 'BANK' } });
        }
      }

      let revenueAccount = null;
      if (isConsignment) {
        revenueAccount = await prisma.account.findFirst({ where: { code: '4002' } })
          || await prisma.account.findFirst({ where: { name: { contains: 'Commission', mode: 'insensitive' } } });
        if (!revenueAccount) {
          revenueAccount = await prisma.account.create({
            data: {
              code: '4002',
              name: 'Vehicle Sales Commission Revenue',
              type: 'REVENUE',
              subType: 'REVENUE',
              currentBalance: 0,
              description: 'Commission revenue on customer-owned / consignment vehicle sales'
            }
          });
        }
      } else {
        revenueAccount = await prisma.account.findFirst({ where: { code: '4001' } }) 
          || await prisma.account.findFirst({ where: { type: 'REVENUE' } });
        if (!revenueAccount) {
          revenueAccount = await prisma.account.create({
            data: {
              code: '4001',
              name: 'Vehicle Sales Revenue',
              type: 'REVENUE',
              subType: 'REVENUE',
              currentBalance: 0,
              description: 'Primary revenue from vehicle sales & bookings'
            }
          });
        }
      }

      const entriesToCreate = [];

      if (hasTradeInInventory && inventoryAccount) {
        entriesToCreate.push({
          accountId: inventoryAccount.id,
          type: 'DEBIT',
          amount: numericTradeInValuation,
          description: `Trade-in Car [${inv.tradeInVehicle || ''} ${inv.tradeInModel || ''} (${inv.tradeInYear || ''})] accepted as advance credit from [${inv.buyerName || 'Customer'}]`
        });
      }

      if (cashReceived > 0 && cashAccount) {
        entriesToCreate.push({
          accountId: cashAccount.id,
          type: 'DEBIT',
          amount: cashReceived,
          description: isConsignment
            ? `Consignment Commission Cash (Vehicle: ${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}, Seller: ${inv.sellerName || 'Customer'})`
            : `Cash received from ${inv.buyerName || 'Customer'} for ${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}`
        });
      }

      if (bankReceived > 0 && bankAccount) {
        entriesToCreate.push({
          accountId: bankAccount.id,
          type: 'DEBIT',
          amount: bankReceived,
          description: isConsignment
            ? `Consignment Commission Bank (Vehicle: ${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}, Seller: ${inv.sellerName || 'Customer'})`
            : `Bank transfer from ${inv.buyerName || 'Customer'} into ${bankAccount.name}`
        });
      }

      const totalCredited = totalReceived + (hasTradeInInventory ? numericTradeInValuation : 0);

      if (revenueAccount && totalCredited > 0) {
        entriesToCreate.push({
          accountId: revenueAccount.id,
          type: 'CREDIT',
          amount: totalCredited,
          description: isConsignment
            ? `Commission earned on customer vehicle sale (${inv.vehicleMaker || ''} ${inv.vehicleModel || ''} - Reg: ${inv.registrationNo || 'N/A'}, Seller: ${inv.sellerName || 'Customer'}, Buyer: ${inv.buyerName || 'Customer'})`
            : isTradeIn
            ? `Sales revenue/advance from ${inv.buyerName || 'Customer'} (${hasTradeInInventory ? `Trade-in Car Rs. ${numericTradeInValuation.toLocaleString()}` : ''}${cashReceived > 0 ? ` + Cash Rs. ${cashReceived.toLocaleString()}` : ''}${bankReceived > 0 ? ` + Bank Rs. ${bankReceived.toLocaleString()}` : ''})`
            : `Sales revenue from ${inv.buyerName || 'Customer'}`
        });
      }

      if (entriesToCreate.length > 0) {
        const txnDesc = isConsignment
          ? `Consignment Sale Commission ${inv.invoiceNumber} for [${inv.vehicleMaker || ''} ${inv.vehicleModel || ''}] (Seller: ${inv.sellerName || 'Customer'} -> Buyer: ${inv.buyerName || 'Customer'}) - Comm: Rs. ${totalReceived} (Car Sale Price Rs. ${numericTotalPrice} directly given to seller)`
          : isTradeIn
          ? `Trade-In Exchange & Booking ${inv.invoiceNumber} for [${inv.buyerName || 'Customer'}] - Trade-In Stock: Rs. ${numericTradeInValuation.toLocaleString()}${totalReceived > 0 ? `, Cash/Bank: Rs. ${totalReceived.toLocaleString()}` : ''}`
          : `Receipt ${inv.invoiceNumber} for [${inv.buyerName || 'Customer'}] (${inv.vehicleMaker || ''} ${inv.vehicleModel || ''} - Chassis: ${inv.chassisNumber || 'N/A'}) - Cash: Rs. ${cashReceived}, Bank: Rs. ${bankReceived}`;

        await prisma.transaction.create({
          data: {
            transactionNumber: `REC-${dateCode}-${txnSeq}`,
            date: todayDate,
            type: 'RECEIPT_VOUCHER',
            amount: totalCredited,
            description: txnDesc,
            referenceType: 'INVOICE',
            referenceId: inv.id,
            referenceNumber: inv.invoiceNumber,
            chassisNumber: inv.chassisNumber || null,
            createdById: finalUserId,
            entries: { create: entriesToCreate }
          }
        });

        if (hasTradeInInventory && inventoryAccount) {
          await prisma.account.update({
            where: { id: inventoryAccount.id },
            data: { currentBalance: { increment: numericTradeInValuation } }
          });
        }
        if (cashReceived > 0 && cashAccount) {
          await prisma.account.update({
            where: { id: cashAccount.id },
            data: { currentBalance: { increment: cashReceived } }
          });
        }
        if (bankReceived > 0 && bankAccount) {
          await prisma.account.update({
            where: { id: bankAccount.id },
            data: { currentBalance: { increment: bankReceived } }
          });
        }
        if (revenueAccount && totalCredited > 0) {
          await prisma.account.update({
            where: { id: revenueAccount.id },
            data: { currentBalance: { increment: totalCredited } }
          });
        }
      }
    }
  }
};

const createInvoice = async (req, res) => {
  try {
    const {
      category,
      registrationNo,
      sellerName,
      sellerFatherName,
      sellerCnic,
      sellerAddress,
      sellerPhone,
      sellerPhoto,
      buyerName,
      buyerFatherName,
      buyerCnic,
      buyerAddress,
      buyerPhone,
      buyerPhoto,
      vehicleMaker,
      vehicleModel,
      carYear,
      engineNumber,
      chassisNumber,
      powerCapacity,
      color,
      postOffice,
      lastToken,
      regName,
      regFatherName,
      regAddress,
      // Transaction Agreement
      agreedAmount,
      agreedAmountHalf,
      agreedAmountWords,
      agreementTime,
      agreementDay,
      // Additional Voucher Specific Fields
      payeeName,
      headOfAccount,
      inWords,
      bankStatus,
      chequeNo,
      dueDate,
      onAccount,
      accountOf,
      time,
      cashAmount,
      statusBoxNotes,
      // Imported Vehicle
      isImported,
      billOfEntryNo,
      portName,
      clearanceDate,
      importerName,
      // Financials
      totalPrice,
      advanceAmount,
      remainingAmount,
      paymentDuration,
      dated,
      // Legacy fallback
      customerName,
      customerPhone,
      customerCity,
      carVehicle,
      carModel,
      carRegNumber,
      saleAmount,
      commissionPercent,
      paymentStatus,
      remarks,
      // Witnesses
      witness1Name,
      witness1Cnic,
      witness2Name,
      witness2Cnic,
      // Accounts & Payment Mode Fields
      paymentMethod,
      bankAccountId,
      cashAmountReceived,
      bankAmountReceived,
      isInstallmentSale,
      totalInstallments,
      installmentAmount,
      installmentFrequency,
      installmentStartDate,
      deliveryStatus,
      isDoubleSaleLiability,
      linkedChassisSaleId,
      // Booking & Sales Receipt Linking Fields
      linkedBookingId,
      linkedBookingNumber,
      bookingStatus,
      // Consignment & Salesman Fields
      isCustomerVehicle,
      salesmanName,
      salesmanId,
      // Accounts Current Stock Link
      accountsStockId,
      // Vehicle Trade-In / Car Exchange Fields
      isTradeIn,
      tradeInVehicle,
      tradeInModel,
      tradeInYear,
      tradeInColor,
      tradeInRegNumber,
      tradeInChassisNumber,
      tradeInEngineNumber,
      tradeInValuation,
      tradeInCashAdvance
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : null;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : null;

    const finalBuyerName = buyerName || customerName || 'N/A';
    const finalVehicleMaker = vehicleMaker || carVehicle || 'N/A';
    const finalVehicleModel = vehicleModel || carModel || 'N/A';

    const isTradeInSale = Boolean(isTradeIn);
    const numericTradeInValuation = isTradeInSale ? parsePakistaniPrice(tradeInValuation) : 0;
    const numericTradeInCash = isTradeInSale ? parsePakistaniPrice(tradeInCashAdvance) : 0;

    const numericTotalPrice = parsePakistaniPrice(totalPrice || agreedAmount || saleAmount);
    const numericAdvance = isTradeInSale
      ? (numericTradeInValuation + numericTradeInCash)
      : parsePakistaniPrice(advanceAmount);
    const numericRemaining = remainingAmount !== undefined && remainingAmount !== null && remainingAmount !== '' 
      ? parsePakistaniPrice(remainingAmount) 
      : Math.max(0, numericTotalPrice - numericAdvance);
    const numericCommPercent = parseFloat(String(commissionPercent || 0).replace(/[^0-9.]/g, '')) || 0;
    
    // If commissionAmount is explicitly provided (or calculated from percentage)
    let calculatedCommission = 0;
    if (req.body.commissionAmount !== undefined && req.body.commissionAmount !== null && String(req.body.commissionAmount).trim() !== '') {
      calculatedCommission = parsePakistaniPrice(req.body.commissionAmount);
    } else if (numericCommPercent > 0) {
      calculatedCommission = (numericTotalPrice * numericCommPercent) / 100;
    }
    const totalAmountCalculated = numericTotalPrice + calculatedCommission;

    // Auto-detect matching active booking receipt if creating a sales receipt
    let finalLinkedBookingId = linkedBookingId || null;
    let finalLinkedBookingNumber = linkedBookingNumber || null;

    if (category === 'SALES_RECEIPT' && !finalLinkedBookingId && (buyerPhone || customerPhone)) {
      const cleanDigits = String(buyerPhone || customerPhone).replace(/\D/g, '');
      if (cleanDigits.length >= 7) {
        const potentialBookings = await prisma.invoice.findMany({
          where: {
            category: 'BOOKING_RECEIPT',
            isDeleted: false,
            bookingStatus: 'ACTIVE'
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
        const matched = potentialBookings.find(b => {
          const bDigits = String(b.buyerPhone || b.customerPhone || '').replace(/\D/g, '');
          return bDigits && (bDigits.includes(cleanDigits) || cleanDigits.includes(bDigits));
        });
        if (matched) {
          finalLinkedBookingId = matched.id;
          finalLinkedBookingNumber = matched.invoiceNumber;
        }
      }
    }

    // Generate unique prefix based on category
    let prefix = 'REC';
    if (category === 'DELIVERY_LETTER') prefix = 'DL';
    else if (category === 'PAYMENT_VOUCHER') prefix = 'PV';
    else if (category === 'BOOKING_RECEIPT') prefix = 'BK';

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `${prefix}-${dateStr}-${randomSuffix}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        category: category || 'SALES_RECEIPT',
        date: new Date(),
        registrationNo: registrationNo || carRegNumber || null,
        
        // Seller Details
        sellerName: sellerName || null,
        sellerFatherName: sellerFatherName || null,
        sellerCnic: sellerCnic || null,
        sellerAddress: sellerAddress || null,
        sellerPhone: sellerPhone || null,
        sellerPhoto: finalSellerPhoto,

        // Buyer Details
        buyerName: finalBuyerName,
        buyerFatherName: buyerFatherName || null,
        buyerCnic: buyerCnic || null,
        buyerAddress: buyerAddress || customerCity || null,
        buyerPhone: buyerPhone || customerPhone || null,
        buyerPhoto: finalBuyerPhoto,

        // Vehicle Details
        vehicleMaker: finalVehicleMaker,
        vehicleModel: finalVehicleModel,
        carYear: carYear !== undefined && carYear !== null ? String(carYear) : null,
        engineNumber: engineNumber || null,
        chassisNumber: chassisNumber || null,
        powerCapacity: powerCapacity || null,
        color: color || null,
        postOffice: postOffice || null,
        lastToken: lastToken || null,
        regName: regName || null,
        regFatherName: regFatherName || null,
        regAddress: regAddress || null,

        // Additional Voucher Specific Fields
        payeeName: payeeName || buyerName || customerName || null,
        headOfAccount: headOfAccount || null,
        inWords: inWords || agreedAmountWords || null,
        bankStatus: bankStatus || null,
        chequeNo: chequeNo || null,
        dueDate: dueDate || null,
        onAccount: onAccount || null,
        accountOf: accountOf || null,
        time: time || agreementTime || null,
        cashAmount: cashAmount !== undefined && cashAmount !== null ? String(cashAmount) : null,
        statusBoxNotes: statusBoxNotes || null,

        // Transaction Agreement
        agreedAmount: agreedAmount !== undefined && agreedAmount !== null ? String(agreedAmount) : String(numericTotalPrice),
        agreedAmountHalf: agreedAmountHalf !== undefined && agreedAmountHalf !== null ? String(agreedAmountHalf) : String(numericTotalPrice / 2),
        agreedAmountWords: agreedAmountWords || null,
        agreementTime: agreementTime || null,
        agreementDay: agreementDay || null,

        // Imported Vehicle
        isImported: Boolean(isImported),
        billOfEntryNo: billOfEntryNo || null,
        portName: portName || null,
        clearanceDate: clearanceDate || null,
        importerName: importerName || null,

        // Financials & Balances
        totalPrice: totalPrice !== undefined && totalPrice !== null ? String(totalPrice) : String(numericTotalPrice),
        advanceAmount: advanceAmount !== undefined && advanceAmount !== null ? String(advanceAmount) : String(numericAdvance),
        remainingAmount: remainingAmount !== undefined && remainingAmount !== null ? String(remainingAmount) : String(numericRemaining),
        paymentDuration: paymentDuration || null,
        dated: dated || new Date().toISOString().slice(0, 10),

        // Legacy compatibility fields
        customerName: finalBuyerName,
        customerPhone: buyerPhone || customerPhone || null,
        customerCity: buyerAddress || customerCity || null,
        carVehicle: finalVehicleMaker,
        carModel: finalVehicleModel,
        carYear: carYear ? String(carYear) : null,
        carRegNumber: registrationNo || carRegNumber || null,
        saleAmount: saleAmount !== undefined && saleAmount !== null ? String(saleAmount) : String(numericTotalPrice),
        commissionPercent: commissionPercent !== undefined && commissionPercent !== null ? String(commissionPercent) : String(numericCommPercent),
        commissionAmount: String(calculatedCommission),
        totalAmount: String(totalAmountCalculated),
        paymentStatus: paymentStatus || 'PAID',

        // Accounts & Payment Mode Fields
        paymentMethod: paymentMethod || 'CASH',
        bankAccountId: bankAccountId || null,
        cashAmountReceived: cashAmountReceived !== undefined && cashAmountReceived !== null ? String(cashAmountReceived) : null,
        bankAmountReceived: bankAmountReceived !== undefined && bankAmountReceived !== null ? String(bankAmountReceived) : null,
        isInstallmentSale: Boolean(isInstallmentSale),
        installmentPlanId: null, // will update below if installment plan created
        deliveryStatus: deliveryStatus || (category === 'DELIVERY_LETTER' ? 'DELIVERED' : 'DELIVERED'),
        isDoubleSaleLiability: Boolean(isDoubleSaleLiability || deliveryStatus === 'UNDELIVERED'),
        linkedChassisSaleId: linkedChassisSaleId || null,

        // Consignment & Salesman Attribution
        isCustomerVehicle: Boolean(isCustomerVehicle),
        salesmanName: salesmanName || null,
        salesmanId: salesmanId || null,

        // Vehicle Trade-In / Car Exchange Fields
        isTradeIn: isTradeInSale,
        tradeInVehicle: tradeInVehicle || null,
        tradeInModel: tradeInModel || null,
        tradeInYear: tradeInYear ? String(tradeInYear) : null,
        tradeInColor: tradeInColor || null,
        tradeInRegNumber: tradeInRegNumber || null,
        tradeInChassisNumber: tradeInChassisNumber || null,
        tradeInEngineNumber: tradeInEngineNumber || null,
        tradeInValuation: String(numericTradeInValuation),
        tradeInCashAdvance: String(numericTradeInCash),
        tradeInStockId: null,

        // Booking & Sales Receipt Linking Fields
        linkedBookingId: finalLinkedBookingId,
        linkedBookingNumber: finalLinkedBookingNumber,
        bookingStatus: category === 'BOOKING_RECEIPT' ? (bookingStatus || 'ACTIVE') : (finalLinkedBookingId ? 'CONVERTED_TO_SALE' : (bookingStatus || 'ACTIVE')),
        linkedSaleId: null,
        linkedSaleNumber: null,

        // Witnesses
        witness1Name: witness1Name || null,
        witness1Cnic: witness1Cnic || null,
        witness2Name: witness2Name || null,
        witness2Cnic: witness2Cnic || null,

        // Accounts Head & Admins Approval Workflow
        approvalStatus: (['ACCOUNTS_HEAD', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) ? 'APPROVED' : 'PENDING',
        approvedById: (['ACCOUNTS_HEAD', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) ? req.user.id : null,
        approvedAt: (['ACCOUNTS_HEAD', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) ? new Date() : null,
        approvalNotes: (['ACCOUNTS_HEAD', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) ? `Auto-approved upon creation by ${req.user.role}` : null,

        createdBy: req.user.id
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        approvedByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    // If this Sales Receipt was linked to a Booking Receipt, mark the Booking Receipt as deleted/converted
    // so it disappears from active invoices & active bookings list, while preserving it in customer trade history!
    if (finalLinkedBookingId) {
      try {
        await prisma.invoice.update({
          where: { id: finalLinkedBookingId },
          data: {
            bookingStatus: 'CONVERTED_TO_SALE',
            isDeleted: true,
            deletedAt: new Date(),
            deletedReason: `CONVERTED_TO_SALE_${newInvoice.invoiceNumber}`,
            linkedSaleId: newInvoice.id,
            linkedSaleNumber: newInvoice.invoiceNumber
          }
        });
      } catch (bkUpdateErr) {
        console.warn('Failed to delete/convert linked booking receipt:', bkUpdateErr.message);
      }
    }

    // ----------------------------------------------------
    // AUTOMATED FINANCIAL LEDGER POSTINGS (DOUBLE ENTRY)
    // ----------------------------------------------------
    try {
      const isApprovedOnCreation = newInvoice.approvalStatus === 'APPROVED';

      if (isApprovedOnCreation) {
        await syncInvoiceLedgerTransactions(newInvoice.id, req.user.id);
      }

      // Notification Dispatch
      const paymentAmt = parsePakistaniPrice(cashAmount || totalPrice || agreedAmount || saleAmount);
      
      if (!isApprovedOnCreation) {
        // High-priority approval request notification sent to Accounts Head
        const isBooking = category === 'BOOKING_RECEIPT';
        const totalReceived = isBooking 
          ? (numericAdvance > 0 ? numericAdvance : numericTotalPrice)
          : (numericAdvance > 0 ? numericRemaining : numericTotalPrice);
        const typeLabel = isBooking ? 'Booking Receipt' : (category === 'PAYMENT_VOUCHER' ? 'Payment Voucher' : 'Sales Receipt');

        await prisma.notification.create({
          data: {
            targetRole: 'ACCOUNTS_HEAD',
            title: `⏳ Pending Approval: ${typeLabel} #${invoiceNumber} (Rs. ${totalReceived.toLocaleString()})`,
            message: `${typeLabel} #${invoiceNumber} for ${finalVehicleMaker} ${finalVehicleModel} generated by ${req.user.name || 'Super Admin'}. Amount: Rs. ${totalReceived.toLocaleString()} (${paymentMethod || 'CASH'}). Accounts Head approval required before posting funds into accounts.`,
            type: 'APPROVAL_REQUEST',
            category: paymentMethod || 'CASH',
            amount: totalReceived,
            referenceId: newInvoice.id
          }
        });
      } else {
        // Notification for direct approved creation by Accounts Head
        if (category === 'PAYMENT_VOUCHER' && paymentAmt > 0) {
          await prisma.notification.create({
            data: {
              targetRole: 'SUPER_ADMIN',
              title: `💵 Payment Voucher Outflow: Rs. ${paymentAmt.toLocaleString()}`,
              message: `Payment Voucher #${invoiceNumber} issued to ${payeeName || finalBuyerName} for Head [${headOfAccount || 'Showroom Payment'}] via [${paymentMethod || 'CASH'}] - Rs. ${paymentAmt.toLocaleString()}`,
              type: 'PAYMENT_VOUCHER',
              category: paymentMethod || 'CASH',
              amount: paymentAmt,
              referenceId: newInvoice.id
            }
          });
        } else if (category !== 'PAYMENT_VOUCHER') {
          const isBooking = category === 'BOOKING_RECEIPT';
          const totalReceived = isBooking 
            ? (numericAdvance > 0 ? numericAdvance : numericTotalPrice)
            : (numericAdvance > 0 ? numericRemaining : numericTotalPrice);

          if (totalReceived > 0) {
            const typeLabel = isBooking ? 'Booking Receipt' : 'Sales Receipt';
            await prisma.notification.create({
              data: {
                targetRole: 'SUPER_ADMIN',
                title: isBooking ? `📅 New Booking Inflow: Rs. ${totalReceived.toLocaleString()}` : `💰 New Sales Inflow: Rs. ${totalReceived.toLocaleString()}`,
                message: `${typeLabel} #${invoiceNumber} generated for ${finalVehicleMaker} ${finalVehicleModel} (Chassis: ${chassisNumber || 'N/A'}). Received Rs. ${totalReceived.toLocaleString()} from Customer ${finalBuyerName} by ${req.user.name || 'Accounts Head'}.${finalLinkedBookingNumber ? ' (Adjusted Booking: #' + finalLinkedBookingNumber + ')' : ''}`,
                type: category || 'FINANCIAL_INFLOW',
                category: paymentMethod || 'CASH',
                amount: totalReceived,
                referenceId: newInvoice.id
              }
            });
          }
        }
      }
    } catch (accountError) {
      console.error('Automated ledger posting error (non-fatal):', accountError);
    }

        // ----------------------------------------------------
        // AUTOMATED INSTALLMENT PLAN CREATION (IF CHECKED)
        // ----------------------------------------------------
        if (Boolean(isInstallmentSale) && numericRemaining > 0) {
          const numInstallments = parseInt(req.body.totalInstallments, 10) || 12;
          const instFrequency = req.body.installmentFrequency || 'MONTHLY';
          const calculatedInstallmentAmt = req.body.installmentAmount 
            ? parseFloat(req.body.installmentAmount) 
            : Math.round(numericRemaining / numInstallments);

          const ipCount = await prisma.installmentPlan.count();
          const ipPlanNumber = `IP-${dateStr}-${String(ipCount + 1).padStart(4, '0')}`;
          const start = req.body.installmentStartDate ? new Date(req.body.installmentStartDate) : new Date();

          const scheduleItems = [];
          for (let i = 1; i <= numInstallments; i++) {
            const dueDate = new Date(start);
            if (instFrequency === 'MONTHLY') dueDate.setMonth(dueDate.getMonth() + i);
            else if (instFrequency === 'QUARTERLY') dueDate.setMonth(dueDate.getMonth() + (i * 3));
            else dueDate.setMonth(dueDate.getMonth() + i);

            const isLast = i === numInstallments;
            const priorTotal = calculatedInstallmentAmt * (numInstallments - 1);
            const itemAmt = isLast ? Math.max(0, numericRemaining - priorTotal) : calculatedInstallmentAmt;

            scheduleItems.push({
              installmentNumber: i,
              dueDate,
              amount: itemAmt,
              paidAmount: 0,
              status: 'UNPAID'
            });
          }

          const createdPlan = await prisma.installmentPlan.create({
            data: {
              planNumber: ipPlanNumber,
              invoiceId: newInvoice.id,
              customerName: finalBuyerName,
              customerPhone: buyerPhone || customerPhone || null,
              customerCnic: buyerCnic || null,
              customerAddress: buyerAddress || customerCity || null,
              vehicleName: `${finalVehicleMaker} ${finalVehicleModel}`.trim(),
              registrationNo: registrationNo || carRegNumber || null,
              chassisNumber: chassisNumber || null,
              totalPrice: numericTotalPrice,
              advanceAmount: numericAdvance,
              remainingAmount: numericRemaining,
              totalInstallments: numInstallments,
              installmentAmount: calculatedInstallmentAmt,
              frequency: instFrequency,
              startDate: start,
              status: 'ACTIVE',
              notes: `Auto-generated from Sales Receipt ${invoiceNumber}`,
              createdById: req.user.id,
              items: { create: scheduleItems }
            }
          });

          await prisma.invoice.update({
            where: { id: newInvoice.id },
            data: { installmentPlanId: createdPlan.id }
          });
        }

    // If not a customer-owned vehicle and category is SALES_RECEIPT, delete selected vehicle from Accounts Current Stock
    if ((category === 'SALES_RECEIPT' || !category) && !Boolean(isCustomerVehicle)) {
      try {
        let stockToDelete = null;
        if (accountsStockId) {
          stockToDelete = await prisma.accountsStock.findUnique({ where: { id: accountsStockId } });
        } else if (chassisNumber && String(chassisNumber).trim()) {
          stockToDelete = await prisma.accountsStock.findFirst({
            where: { chassisNumber: { equals: String(chassisNumber).trim(), mode: 'insensitive' } }
          });
        } else if (registrationNo && String(registrationNo).trim()) {
          stockToDelete = await prisma.accountsStock.findFirst({
            where: { regNumber: { equals: String(registrationNo).trim(), mode: 'insensitive' } }
          });
        }

        if (stockToDelete) {
          await prisma.accountsStock.delete({ where: { id: stockToDelete.id } });
          await prisma.activityLog.create({
            data: {
              userId: req.user.id,
              action: 'DELETE_ACCOUNTS_STOCK',
              details: `Auto-deleted vehicle ${stockToDelete.vehicle} ${stockToDelete.model} (Chassis: ${stockToDelete.chassisNumber || 'N/A'}, Reg: ${stockToDelete.regNumber || 'N/A'}) from Accounts Current Stock upon Sales Receipt #${invoiceNumber}`
            }
          });
        }
      } catch (delStockErr) {
        console.warn('Failed to auto-delete accounts stock on sales receipt:', delStockErr.message);
      }
    }

    // If this is a Trade-In Sale / Exchange (Booking Receipt or Sales Receipt), auto-create Accounts Current Stock for the customer's old car
    if (isTradeInSale && numericTradeInValuation > 0) {
      try {
        // If linked to an existing booking that already created the trade-in stock item, inherit it
        let existingBookingStock = null;
        if (finalLinkedBookingId) {
          const linkedBooking = await prisma.invoice.findUnique({ where: { id: finalLinkedBookingId } });
          if (linkedBooking && linkedBooking.tradeInStockId) {
            existingBookingStock = await prisma.accountsStock.findUnique({ where: { id: linkedBooking.tradeInStockId } });
            if (existingBookingStock) {
              await prisma.invoice.update({
                where: { id: newInvoice.id },
                data: { tradeInStockId: existingBookingStock.id }
              });
            }
          }
        }

        if (!existingBookingStock) {
          const tradeInStock = await prisma.accountsStock.create({
            data: {
              vehicle: (tradeInVehicle && String(tradeInVehicle).trim()) ? String(tradeInVehicle).trim() : 'Customer Trade-In',
              model: (tradeInModel && String(tradeInModel).trim()) ? String(tradeInModel).trim() : 'Car',
              year: tradeInYear ? String(tradeInYear) : '',
              color: tradeInColor || 'White',
              mileage: 0,
              regNumber: tradeInRegNumber ? String(tradeInRegNumber).trim() : null,
              chassisNumber: tradeInChassisNumber ? String(tradeInChassisNumber).trim() : null,
              purchasePrice: String(numericTradeInValuation),
              askingPrice: String(numericTradeInValuation),
              status: 'AVAILABLE',
              location: 'Main Showroom',
              careOf: finalBuyerName || 'Customer Trade-In',
              notes: `Trade-In Old Car received as PKR ${numericTradeInValuation.toLocaleString()} advance credit for ${category || 'Invoice'} #${invoiceNumber}`
            }
          });

          await prisma.invoice.update({
            where: { id: newInvoice.id },
            data: { tradeInStockId: tradeInStock.id }
          });

          await prisma.activityLog.create({
            data: {
              userId: req.user.id,
              action: 'CREATE_ACCOUNTS_STOCK',
              details: `Auto-added Trade-In Vehicle ${tradeInStock.vehicle} ${tradeInStock.model} (Valuation: Rs. ${numericTradeInValuation.toLocaleString()}) to Accounts Current Stock upon ${category || 'Invoice'} #${invoiceNumber}`
            }
          });
        }
      } catch (tradeErr) {
        console.warn('Failed to auto-create Accounts Current Stock for trade-in vehicle:', tradeErr.message);
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SALES_RECEIPT',
        details: `Created ${category || 'Sales Receipt'} ${invoiceNumber} for ${finalBuyerName} (${finalVehicleMaker} ${finalVehicleModel} - Total: Rs. ${numericTotalPrice})`
      }
    });

    const finalResult = await prisma.invoice.findUnique({
      where: { id: newInvoice.id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    return res.status(201).json(finalResult);
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(500).json({ message: 'Failed to create sales receipt', error: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Sales receipt not found' });
    }

    const {
      category,
      registrationNo,
      sellerName,
      sellerFatherName,
      sellerCnic,
      sellerAddress,
      sellerPhone,
      sellerPhoto,
      buyerName,
      buyerFatherName,
      buyerCnic,
      buyerAddress,
      buyerPhone,
      buyerPhoto,
      vehicleMaker,
      vehicleModel,
      carYear,
      engineNumber,
      chassisNumber,
      powerCapacity,
      color,
      postOffice,
      lastToken,
      regName,
      regFatherName,
      regAddress,
      agreedAmount,
      agreedAmountHalf,
      agreedAmountWords,
      agreementTime,
      agreementDay,
      payeeName,
      headOfAccount,
      inWords,
      bankStatus,
      chequeNo,
      dueDate,
      onAccount,
      accountOf,
      time,
      cashAmount,
      statusBoxNotes,
      totalPrice,
      advanceAmount,
      remainingAmount,
      paymentDuration,
      dated,
      witness1Name,
      witness1Cnic,
      witness2Name,
      witness2Cnic,
      // Accounts & Payment Mode Fields
      paymentMethod,
      bankAccountId,
      cashAmountReceived,
      bankAmountReceived,
      isInstallmentSale,
      totalInstallments,
      installmentAmount,
      installmentFrequency,
      installmentStartDate,
      deliveryStatus,
      isDoubleSaleLiability,
      linkedChassisSaleId,
      // Booking & Sales Receipt Linking Fields
      linkedBookingId,
      linkedBookingNumber,
      bookingStatus,
      // Consignment & Salesman Fields
      isCustomerVehicle,
      salesmanName,
      salesmanId,
      commissionAmount,
      commissionPercent,
      // Accounts Current Stock Link
      accountsStockId,
      // Vehicle Trade-In / Car Exchange Fields
      isTradeIn,
      tradeInVehicle,
      tradeInModel,
      tradeInYear,
      tradeInColor,
      tradeInRegNumber,
      tradeInChassisNumber,
      tradeInEngineNumber,
      tradeInValuation,
      tradeInCashAdvance
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : existing.sellerPhoto;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : existing.buyerPhoto;

    const finalBuyerName = buyerName || existing.buyerName;
    const finalVehicleMaker = vehicleMaker || existing.vehicleMaker;
    const finalVehicleModel = vehicleModel || existing.vehicleModel;

    const isTradeInSale = isTradeIn !== undefined ? Boolean(isTradeIn) : existing.isTradeIn;
    const numericTradeInValuation = isTradeInSale ? parsePakistaniPrice(tradeInValuation !== undefined ? tradeInValuation : existing.tradeInValuation) : 0;
    const numericTradeInCash = isTradeInSale ? parsePakistaniPrice(tradeInCashAdvance !== undefined ? tradeInCashAdvance : existing.tradeInCashAdvance) : 0;

    const numericTotalPrice = parsePakistaniPrice(totalPrice || agreedAmount || existing.totalPrice || existing.agreedAmount);
    const numericAdvance = isTradeInSale
      ? (numericTradeInValuation + numericTradeInCash)
      : parsePakistaniPrice(advanceAmount !== undefined ? advanceAmount : existing.advanceAmount);
    const numericRemaining = remainingAmount !== undefined && remainingAmount !== null && remainingAmount !== '' 
      ? parsePakistaniPrice(remainingAmount) 
      : Math.max(0, numericTotalPrice - numericAdvance);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existing.category,
        registrationNo: registrationNo !== undefined ? registrationNo : existing.registrationNo,
        sellerName: sellerName !== undefined ? sellerName : existing.sellerName,
        sellerFatherName: sellerFatherName !== undefined ? sellerFatherName : existing.sellerFatherName,
        sellerCnic: sellerCnic !== undefined ? sellerCnic : existing.sellerCnic,
        sellerAddress: sellerAddress !== undefined ? sellerAddress : existing.sellerAddress,
        sellerPhone: sellerPhone !== undefined ? sellerPhone : existing.sellerPhone,
        sellerPhoto: finalSellerPhoto,

        buyerName: finalBuyerName,
        buyerFatherName: buyerFatherName !== undefined ? buyerFatherName : existing.buyerFatherName,
        buyerCnic: buyerCnic !== undefined ? buyerCnic : existing.buyerCnic,
        buyerAddress: buyerAddress !== undefined ? buyerAddress : existing.buyerAddress,
        buyerPhone: buyerPhone !== undefined ? buyerPhone : existing.buyerPhone,
        buyerPhoto: finalBuyerPhoto,

        vehicleMaker: finalVehicleMaker,
        vehicleModel: finalVehicleModel,
        carYear: carYear !== undefined ? String(carYear) : existing.carYear,
        engineNumber: engineNumber !== undefined ? engineNumber : existing.engineNumber,
        chassisNumber: chassisNumber !== undefined ? chassisNumber : existing.chassisNumber,
        powerCapacity: powerCapacity !== undefined ? powerCapacity : existing.powerCapacity,
        color: color !== undefined ? color : existing.color,
        postOffice: postOffice !== undefined ? postOffice : existing.postOffice,
        lastToken: lastToken !== undefined ? lastToken : existing.lastToken,
        regName: regName !== undefined ? regName : existing.regName,
        regFatherName: regFatherName !== undefined ? regFatherName : existing.regFatherName,
        regAddress: regAddress !== undefined ? regAddress : existing.regAddress,

        agreedAmount: agreedAmount !== undefined ? (agreedAmount ? String(parsePakistaniPrice(agreedAmount)) : '') : (existing.agreedAmount || String(numericTotalPrice)),
        agreedAmountHalf: agreedAmountHalf !== undefined ? (agreedAmountHalf ? String(parsePakistaniPrice(agreedAmountHalf)) : '') : (existing.agreedAmountHalf || String(Math.round(numericTotalPrice / 2))),
        agreedAmountWords: agreedAmountWords !== undefined ? agreedAmountWords : existing.agreedAmountWords,
        agreementTime: agreementTime !== undefined ? agreementTime : existing.agreementTime,
        agreementDay: agreementDay !== undefined ? agreementDay : existing.agreementDay,

        payeeName: payeeName !== undefined ? payeeName : existing.payeeName,
        headOfAccount: headOfAccount !== undefined ? headOfAccount : existing.headOfAccount,
        inWords: inWords !== undefined ? inWords : existing.inWords,
        bankStatus: bankStatus !== undefined ? bankStatus : existing.bankStatus,
        chequeNo: chequeNo !== undefined ? chequeNo : existing.chequeNo,
        dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
        onAccount: onAccount !== undefined ? onAccount : existing.onAccount,
        accountOf: accountOf !== undefined ? accountOf : existing.accountOf,
        time: time !== undefined ? time : existing.time,
        cashAmount: cashAmount !== undefined ? (cashAmount !== null && String(cashAmount).trim() !== '' ? String(parsePakistaniPrice(cashAmount)) : null) : existing.cashAmount,
        statusBoxNotes: statusBoxNotes !== undefined ? statusBoxNotes : existing.statusBoxNotes,

        totalPrice: totalPrice !== undefined ? (totalPrice ? String(parsePakistaniPrice(totalPrice)) : '') : (existing.totalPrice || String(numericTotalPrice)),
        advanceAmount: advanceAmount !== undefined ? (advanceAmount ? String(parsePakistaniPrice(advanceAmount)) : '') : (existing.advanceAmount || String(numericAdvance)),
        remainingAmount: remainingAmount !== undefined ? (remainingAmount ? String(parsePakistaniPrice(remainingAmount)) : '') : (existing.remainingAmount || String(numericRemaining)),
        paymentDuration: paymentDuration !== undefined ? paymentDuration : existing.paymentDuration,
        dated: dated !== undefined ? dated : existing.dated,

        commissionAmount: commissionAmount !== undefined ? (commissionAmount !== null && String(commissionAmount).trim() !== '' ? String(parsePakistaniPrice(commissionAmount)) : '') : existing.commissionAmount,
        commissionPercent: commissionPercent !== undefined ? (commissionPercent ? String(commissionPercent) : '') : existing.commissionPercent,

        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        bankAccountId: bankAccountId !== undefined ? bankAccountId : existing.bankAccountId,
        cashAmountReceived: cashAmountReceived !== undefined ? (cashAmountReceived ? String(parsePakistaniPrice(cashAmountReceived)) : null) : existing.cashAmountReceived,
        bankAmountReceived: bankAmountReceived !== undefined ? (bankAmountReceived ? String(parsePakistaniPrice(bankAmountReceived)) : null) : existing.bankAmountReceived,
        isInstallmentSale: isInstallmentSale !== undefined ? Boolean(isInstallmentSale) : existing.isInstallmentSale,
        deliveryStatus: deliveryStatus !== undefined ? deliveryStatus : existing.deliveryStatus,
        isDoubleSaleLiability: isDoubleSaleLiability !== undefined ? Boolean(isDoubleSaleLiability) : existing.isDoubleSaleLiability,
        linkedChassisSaleId: linkedChassisSaleId !== undefined ? linkedChassisSaleId : existing.linkedChassisSaleId,

        // Consignment & Salesman Attribution
        isCustomerVehicle: isCustomerVehicle !== undefined ? Boolean(isCustomerVehicle) : existing.isCustomerVehicle,
        salesmanName: salesmanName !== undefined ? salesmanName : existing.salesmanName,
        salesmanId: salesmanId !== undefined ? salesmanId : existing.salesmanId,

        // Vehicle Trade-In / Car Exchange Fields
        isTradeIn: isTradeInSale,
        tradeInVehicle: tradeInVehicle !== undefined ? tradeInVehicle : existing.tradeInVehicle,
        tradeInModel: tradeInModel !== undefined ? tradeInModel : existing.tradeInModel,
        tradeInYear: tradeInYear !== undefined ? (tradeInYear ? String(tradeInYear) : null) : existing.tradeInYear,
        tradeInColor: tradeInColor !== undefined ? tradeInColor : existing.tradeInColor,
        tradeInRegNumber: tradeInRegNumber !== undefined ? tradeInRegNumber : existing.tradeInRegNumber,
        tradeInChassisNumber: tradeInChassisNumber !== undefined ? tradeInChassisNumber : existing.tradeInChassisNumber,
        tradeInEngineNumber: tradeInEngineNumber !== undefined ? tradeInEngineNumber : existing.tradeInEngineNumber,
        tradeInValuation: String(numericTradeInValuation),
        tradeInCashAdvance: String(numericTradeInCash),

        // Booking & Sales Receipt Linking Fields
        linkedBookingId: linkedBookingId !== undefined ? linkedBookingId : existing.linkedBookingId,
        linkedBookingNumber: linkedBookingNumber !== undefined ? linkedBookingNumber : existing.linkedBookingNumber,
        bookingStatus: bookingStatus !== undefined ? bookingStatus : existing.bookingStatus,

        witness1Name: witness1Name !== undefined ? witness1Name : existing.witness1Name,
        witness1Cnic: witness1Cnic !== undefined ? witness1Cnic : existing.witness1Cnic,
        witness2Name: witness2Name !== undefined ? witness2Name : existing.witness2Name,
        witness2Cnic: witness2Cnic !== undefined ? witness2Cnic : existing.witness2Cnic
      }
    });

    // ----------------------------------------------------
    // SYNC INSTALLMENT PLAN ON INVOICE UPDATE
    // ----------------------------------------------------
    const finalIsInstallment = isInstallmentSale !== undefined ? Boolean(isInstallmentSale) : existing.isInstallmentSale;
    if (finalIsInstallment && numericRemaining > 0) {
      const numInstallments = parseInt(req.body.totalInstallments || existing.totalInstallments || 12, 10);
      const instFrequency = req.body.installmentFrequency || existing.installmentFrequency || 'MONTHLY';
      const calculatedInstallmentAmt = req.body.installmentAmount 
        ? parseFloat(req.body.installmentAmount) 
        : Math.round(numericRemaining / numInstallments);
      const start = req.body.installmentStartDate ? new Date(req.body.installmentStartDate) : new Date();

      let existingPlan = null;
      if (existing.installmentPlanId) {
        existingPlan = await prisma.installmentPlan.findUnique({ where: { id: existing.installmentPlanId } });
      }
      if (!existingPlan) {
        existingPlan = await prisma.installmentPlan.findFirst({ where: { invoiceId: id } });
      }

      const scheduleItems = [];
      for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(start);
        if (instFrequency === 'MONTHLY') dueDate.setMonth(dueDate.getMonth() + i);
        else if (instFrequency === 'QUARTERLY') dueDate.setMonth(dueDate.getMonth() + (i * 3));
        else dueDate.setMonth(dueDate.getMonth() + i);

        const isLast = i === numInstallments;
        const priorTotal = calculatedInstallmentAmt * (numInstallments - 1);
        const itemAmt = isLast ? Math.max(0, numericRemaining - priorTotal) : calculatedInstallmentAmt;

        scheduleItems.push({
          installmentNumber: i,
          dueDate,
          amount: itemAmt,
          paidAmount: 0,
          status: 'UNPAID'
        });
      }

      if (existingPlan) {
        await prisma.installmentItem.deleteMany({ where: { planId: existingPlan.id } });
        await prisma.installmentPlan.update({
          where: { id: existingPlan.id },
          data: {
            customerName: finalBuyerName,
            customerPhone: buyerPhone || customerPhone || existing.buyerPhone || null,
            customerCnic: buyerCnic || existing.buyerCnic || null,
            customerAddress: buyerAddress || customerCity || existing.buyerAddress || null,
            vehicleName: `${finalVehicleMaker} ${finalVehicleModel}`.trim(),
            registrationNo: registrationNo || existing.registrationNo || null,
            chassisNumber: chassisNumber || existing.chassisNumber || null,
            totalPrice: numericTotalPrice,
            advanceAmount: numericAdvance,
            remainingAmount: numericRemaining,
            totalInstallments: numInstallments,
            installmentAmount: calculatedInstallmentAmt,
            frequency: instFrequency,
            startDate: start,
            status: numericRemaining === 0 ? 'COMPLETED' : 'ACTIVE',
            items: { create: scheduleItems }
          }
        });
        if (!existing.installmentPlanId) {
          await prisma.invoice.update({
            where: { id },
            data: { installmentPlanId: existingPlan.id }
          });
        }
      } else {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const ipCount = await prisma.installmentPlan.count();
        const ipPlanNumber = `IP-${dateStr}-${String(ipCount + 1).padStart(4, '0')}`;

        const createdPlan = await prisma.installmentPlan.create({
          data: {
            planNumber: ipPlanNumber,
            invoiceId: id,
            customerName: finalBuyerName,
            customerPhone: buyerPhone || customerPhone || existing.buyerPhone || null,
            customerCnic: buyerCnic || existing.buyerCnic || null,
            customerAddress: buyerAddress || customerCity || existing.buyerAddress || null,
            vehicleName: `${finalVehicleMaker} ${finalVehicleModel}`.trim(),
            registrationNo: registrationNo || existing.registrationNo || null,
            chassisNumber: chassisNumber || existing.chassisNumber || null,
            totalPrice: numericTotalPrice,
            advanceAmount: numericAdvance,
            remainingAmount: numericRemaining,
            totalInstallments: numInstallments,
            installmentAmount: calculatedInstallmentAmt,
            frequency: instFrequency,
            startDate: start,
            status: 'ACTIVE',
            notes: `Auto-generated from Sales Receipt ${existing.invoiceNumber}`,
            createdById: req.user.id,
            items: { create: scheduleItems }
          }
        });
        await prisma.invoice.update({
          where: { id },
          data: { installmentPlanId: createdPlan.id }
        });
      }
    } else if (!finalIsInstallment && existing.installmentPlanId) {
      try {
        await prisma.installmentItem.deleteMany({ where: { planId: existing.installmentPlanId } });
        await prisma.installmentPlan.delete({ where: { id: existing.installmentPlanId } });
        await prisma.invoice.update({
          where: { id },
          data: { installmentPlanId: null }
        });
      } catch (ipRemoveErr) {
        console.warn('Failed to remove installment plan on toggle off:', ipRemoveErr.message);
      }
    }

    if (linkedBookingId || existing.linkedBookingId) {
      const targetBookingId = linkedBookingId || existing.linkedBookingId;
      try {
        await prisma.invoice.update({
          where: { id: targetBookingId },
          data: {
            bookingStatus: 'CONVERTED_TO_SALE',
            linkedSaleId: id,
            linkedSaleNumber: existing.invoiceNumber
          }
        });
      } catch (bkErr) {
        console.warn('Failed to update linked booking receipt state on update:', bkErr.message);
      }
    }

    if ((category === 'SALES_RECEIPT' || existing.category === 'SALES_RECEIPT') && !Boolean(isCustomerVehicle)) {
      try {
        let stockToDelete = null;
        if (accountsStockId) {
          stockToDelete = await prisma.accountsStock.findUnique({ where: { id: accountsStockId } });
        }
        if (stockToDelete) {
          await prisma.accountsStock.delete({ where: { id: stockToDelete.id } });
          await prisma.activityLog.create({
            data: {
              userId: req.user.id,
              action: 'DELETE_ACCOUNTS_STOCK',
              details: `Auto-deleted vehicle ${stockToDelete.vehicle} ${stockToDelete.model} (Chassis: ${stockToDelete.chassisNumber || 'N/A'}, Reg: ${stockToDelete.regNumber || 'N/A'}) from Accounts Current Stock upon updated Sales Receipt #${existing.invoiceNumber}`
            }
          });
        }
      } catch (stockErr) {
        console.warn('Could not auto-delete accounts stock item on sales receipt update:', stockErr.message);
      }
    }

    // ----------------------------------------------------
    // SYNC TRADE-IN VEHICLE IN ACCOUNTS CURRENT STOCK ON UPDATE
    // ----------------------------------------------------
    if (isTradeInSale && numericTradeInValuation > 0) {
      try {
        let existingTradeStock = null;
        if (existing.tradeInStockId) {
          existingTradeStock = await prisma.accountsStock.findUnique({ where: { id: existing.tradeInStockId } });
        }
        if (!existingTradeStock && (tradeInChassisNumber || tradeInRegNumber)) {
          existingTradeStock = await prisma.accountsStock.findFirst({
            where: {
              OR: [
                ...(tradeInChassisNumber ? [{ chassisNumber: { equals: String(tradeInChassisNumber).trim(), mode: 'insensitive' } }] : []),
                ...(tradeInRegNumber ? [{ regNumber: { equals: String(tradeInRegNumber).trim(), mode: 'insensitive' } }] : [])
              ]
            }
          });
        }

        if (existingTradeStock) {
          await prisma.accountsStock.update({
            where: { id: existingTradeStock.id },
            data: {
              vehicle: (tradeInVehicle && String(tradeInVehicle).trim()) ? String(tradeInVehicle).trim() : existingTradeStock.vehicle,
              model: (tradeInModel && String(tradeInModel).trim()) ? String(tradeInModel).trim() : existingTradeStock.model,
              year: tradeInYear !== undefined ? (tradeInYear ? String(tradeInYear) : '') : existingTradeStock.year,
              color: tradeInColor !== undefined ? (tradeInColor || 'White') : existingTradeStock.color,
              regNumber: tradeInRegNumber !== undefined ? (tradeInRegNumber ? String(tradeInRegNumber).trim() : null) : existingTradeStock.regNumber,
              chassisNumber: tradeInChassisNumber !== undefined ? (tradeInChassisNumber ? String(tradeInChassisNumber).trim() : null) : existingTradeStock.chassisNumber,
              purchasePrice: String(numericTradeInValuation),
              askingPrice: String(numericTradeInValuation),
              careOf: finalBuyerName || existingTradeStock.careOf,
              notes: `Trade-In Old Car received as PKR ${numericTradeInValuation.toLocaleString()} advance credit for ${existing.category || 'Invoice'} #${existing.invoiceNumber}`
            }
          });
          if (!existing.tradeInStockId) {
            await prisma.invoice.update({
              where: { id },
              data: { tradeInStockId: existingTradeStock.id }
            });
          }
        } else {
          const tradeInStock = await prisma.accountsStock.create({
            data: {
              vehicle: (tradeInVehicle && String(tradeInVehicle).trim()) ? String(tradeInVehicle).trim() : 'Customer Trade-In',
              model: (tradeInModel && String(tradeInModel).trim()) ? String(tradeInModel).trim() : 'Car',
              year: tradeInYear ? String(tradeInYear) : '',
              color: tradeInColor || 'White',
              mileage: 0,
              regNumber: tradeInRegNumber ? String(tradeInRegNumber).trim() : null,
              chassisNumber: tradeInChassisNumber ? String(tradeInChassisNumber).trim() : null,
              purchasePrice: String(numericTradeInValuation),
              askingPrice: String(numericTradeInValuation),
              status: 'AVAILABLE',
              location: 'Main Showroom',
              careOf: finalBuyerName || 'Customer Trade-In',
              notes: `Trade-In Old Car received as PKR ${numericTradeInValuation.toLocaleString()} advance credit for ${existing.category || 'Invoice'} #${existing.invoiceNumber}`
            }
          });
          await prisma.invoice.update({
            where: { id },
            data: { tradeInStockId: tradeInStock.id }
          });
        }
      } catch (tradeErr) {
        console.warn('Failed to sync Accounts Current Stock for trade-in vehicle on update:', tradeErr.message);
      }
    } else if (!isTradeInSale && existing.tradeInStockId) {
      try {
        await prisma.accountsStock.delete({ where: { id: existing.tradeInStockId } });
        await prisma.invoice.update({
          where: { id },
          data: { tradeInStockId: null }
        });
      } catch (delTradeErr) {
        console.warn('Failed to delete trade-in stock on disable:', delTradeErr.message);
      }
    }

    // Reset approval status to PENDING if edited by someone other than Accounts Head / Super Admin / Admin
    if (!['ACCOUNTS_HEAD', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) && existing.approvalStatus === 'APPROVED') {
      await prisma.invoice.update({
        where: { id },
        data: {
          approvalStatus: 'PENDING',
          approvedById: null,
          approvedAt: null,
          approvalNotes: `Pending re-approval after edit by ${req.user.name || 'Salesman'}`
        }
      });
    }

    try {
      await syncInvoiceLedgerTransactions(id, req.user.id);
    } catch (syncErr) {
      console.error('Failed to sync invoice transactions on update:', syncErr);
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SALES_RECEIPT',
        details: `Updated Sales Receipt ${existing.invoiceNumber} for ${finalBuyerName}`
      }
    });

    const finalUpdatedResult = await prisma.invoice.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        approvedByUser: { select: { id: true, name: true, email: true, role: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    return res.json(finalUpdatedResult);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update sales receipt', error: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // If this was a Sales Receipt linked to a Booking Receipt, roll back the booking receipt to ACTIVE
    if (existing.linkedBookingId) {
      try {
        await prisma.invoice.update({
          where: { id: existing.linkedBookingId },
          data: {
            bookingStatus: 'ACTIVE',
            linkedSaleId: null,
            linkedSaleNumber: null
          }
        });
      } catch (revertErr) {
        console.warn('Failed to revert linked booking receipt status on deletion:', revertErr.message);
      }
    }

    // Delete linked installment plan if any
    if (existing.installmentPlanId) {
      try {
        await prisma.installmentItem.deleteMany({ where: { planId: existing.installmentPlanId } });
        await prisma.installmentPlan.delete({ where: { id: existing.installmentPlanId } });
      } catch (ipDelErr) {
        console.warn('Failed to delete linked installment plan on invoice deletion:', ipDelErr.message);
      }
    }

    // Delete linked trade-in stock item if any
    if (existing.tradeInStockId) {
      try {
        await prisma.accountsStock.delete({ where: { id: existing.tradeInStockId } });
      } catch (tradeDelErr) {
        console.warn('Failed to delete linked trade-in stock on invoice deletion:', tradeDelErr.message);
      }
    }

    // Revert and delete any linked transactions from the ledger
    try {
      const existingTxns = await prisma.transaction.findMany({
        where: {
          OR: [
            { referenceId: id },
            { referenceNumber: existing.invoiceNumber }
          ]
        },
        include: { entries: true }
      });

      for (const txn of existingTxns) {
        for (const entry of txn.entries) {
          const acc = await prisma.account.findUnique({ where: { id: entry.accountId } });
          if (acc) {
            if (entry.type === 'DEBIT') {
              if (['ASSET', 'EXPENSE'].includes(acc.type)) {
                await prisma.account.update({
                  where: { id: acc.id },
                  data: { currentBalance: { decrement: entry.amount } }
                });
              } else {
                await prisma.account.update({
                  where: { id: acc.id },
                  data: { currentBalance: { increment: entry.amount } }
                });
              }
            } else if (entry.type === 'CREDIT') {
              if (['ASSET', 'EXPENSE'].includes(acc.type)) {
                await prisma.account.update({
                  where: { id: acc.id },
                  data: { currentBalance: { increment: entry.amount } }
                });
              } else {
                await prisma.account.update({
                  where: { id: acc.id },
                  data: { currentBalance: { decrement: entry.amount } }
                });
              }
            }
          }
        }
        await prisma.transaction.delete({ where: { id: txn.id } });
      }
    } catch (txnDeleteErr) {
      console.warn('Failed to revert transactions on invoice deletion:', txnDeleteErr.message);
    }

    await prisma.invoice.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_INVOICE',
        details: `Deleted invoice ${existing.invoiceNumber}`
      }
    });

    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
  }
};

// ----------------------------------------------------
// CANCEL BOOKING RECEIPT & ISSUE REFUND PAYMENT VOUCHER
// ----------------------------------------------------
const cancelBookingAndIssueRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      refundPaymentMethod = 'CASH', 
      bankAccountId = null, 
      cancellationReason = '', 
      refundDate = null 
    } = req.body;

    const booking = await prisma.invoice.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ message: 'Booking receipt not found' });
    }

    if (booking.category !== 'BOOKING_RECEIPT') {
      return res.status(400).json({ message: 'Only booking receipts can be cancelled via this refund procedure' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ message: 'This booking receipt is already cancelled' });
    }

    if (booking.bookingStatus === 'CONVERTED_TO_SALE') {
      return res.status(400).json({ message: 'Cannot cancel a booking that has already been converted to a completed sale' });
    }

    const advancePaid = parsePakistaniPrice(booking.advanceAmount || booking.totalPrice || booking.agreedAmount || 0);

    // 1. Generate Payment Voucher for the Refund
    const today = refundDate ? new Date(refundDate) : new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const voucherNumber = `PV-${dateStr}-${randomSuffix}`;

    const finalPayeeName = booking.buyerName || booking.customerName || 'Customer';
    const vehicleDesc = `${booking.vehicleMaker || ''} ${booking.vehicleModel || ''}`.trim() || 'Vehicle';

    const refundVoucher = await prisma.invoice.create({
      data: {
        invoiceNumber: voucherNumber,
        category: 'PAYMENT_VOUCHER',
        date: today,
        registrationNo: booking.registrationNo || null,
        
        // Payee & Buyer Info
        buyerName: finalPayeeName,
        buyerPhone: booking.buyerPhone || booking.customerPhone || null,
        buyerCnic: booking.buyerCnic || null,
        buyerAddress: booking.buyerAddress || booking.customerCity || null,
        payeeName: finalPayeeName,

        // Head of Account
        headOfAccount: 'Booking Advance Refund (کسٹمر بکنگ ایڈوانس واپسی)',
        onAccount: `Advance refund for cancelled booking #${booking.invoiceNumber}`,
        remarks: `Refund of advance payment on cancellation of Booking #${booking.invoiceNumber} (${vehicleDesc})${cancellationReason ? ' - ' + cancellationReason : ''}`,

        // Vehicle info
        vehicleMaker: booking.vehicleMaker || null,
        vehicleModel: booking.vehicleModel || null,
        carYear: booking.carYear || null,
        chassisNumber: booking.chassisNumber || null,
        color: booking.color || null,

        // Financials (Amount Refunded)
        totalPrice: String(advancePaid),
        agreedAmount: String(advancePaid),
        cashAmount: String(advancePaid),
        saleAmount: String(advancePaid),
        totalAmount: String(advancePaid),
        paymentStatus: 'PAID',

        // Payment Mode
        paymentMethod: refundPaymentMethod || 'CASH',
        bankAccountId: refundPaymentMethod === 'BANK' ? bankAccountId : null,

        // References
        linkedBookingId: booking.id,
        linkedBookingNumber: booking.invoiceNumber,

        createdBy: req.user.id
      }
    });

    // 2. Synchronize Double-Entry Ledger Transactions for the Payment Voucher (Debits Refund/Expense, Credits Safe/Bank)
    if (advancePaid > 0) {
      try {
        await syncInvoiceLedgerTransactions(refundVoucher.id, req.user.id);
      } catch (ledgerErr) {
        console.error('Ledger sync error on refund voucher (non-fatal):', ledgerErr.message);
      }
    }

    // 3. Mark the Booking Receipt as CANCELLED and Deleted from Active Invoices
    const updatedBooking = await prisma.invoice.update({
      where: { id: booking.id },
      data: {
        bookingStatus: 'CANCELLED',
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: `CANCELLED_REFUNDED_${refundVoucher.invoiceNumber}`,
        linkedVoucherId: refundVoucher.id,
        linkedVoucherNumber: refundVoucher.invoiceNumber,
        cancellationReason: cancellationReason || 'Customer requested booking cancellation',
        cancelledAt: new Date()
      }
    });

    // 4. Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CANCEL_BOOKING_REFUND',
        details: `Cancelled Booking ${booking.invoiceNumber} and issued Refund Payment Voucher ${refundVoucher.invoiceNumber} for Rs. ${advancePaid.toLocaleString()}`
      }
    });

    // 5. Notification Dispatch
    try {
      await prisma.notification.create({
        data: {
          targetRole: 'ACCOUNTS_HEAD',
          title: `❌ Booking Cancelled & Refunded: Rs. ${advancePaid.toLocaleString()}`,
          message: `Booking #${booking.invoiceNumber} (${vehicleDesc}) was cancelled for Customer ${finalPayeeName}. Payment Voucher #${refundVoucher.invoiceNumber} issued for refund via [${refundPaymentMethod}].`,
          type: 'PAYMENT_VOUCHER',
          category: refundPaymentMethod,
          amount: advancePaid,
          referenceId: refundVoucher.id
        }
      });
    } catch (notifErr) {
      console.warn('Notification error on cancellation:', notifErr.message);
    }

    return res.json({
      message: 'Booking cancelled successfully and refund Payment Voucher generated',
      paymentVoucher: refundVoucher,
      bookingReceipt: updatedBooking
    });
  } catch (error) {
    console.error('cancelBookingAndIssueRefund error:', error);
    return res.status(500).json({ message: 'Failed to cancel booking and generate refund voucher', error: error.message });
  }
};

const uploadInvoiceImages = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice / Receipt not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }

    const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    const createdImages = [];

    for (const file of req.files) {
      let imageUrl = `/uploads/${file.filename}`;
      let cloudinaryPublicId = null;

      if (useCloudinary) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'velocity_dms/invoices',
            tags: ['signed_receipt', invoice.invoiceNumber]
          });
          imageUrl = result.secure_url;
          cloudinaryPublicId = result.public_id;

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload fallback to local storage:', cloudErr.message);
        }
      }

      const img = await prisma.invoiceImage.create({
        data: {
          invoiceId: id,
          imageUrl: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId
        }
      });
      createdImages.push(img);
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_RECEIPT_IMAGE',
        details: `Uploaded ${createdImages.length} signed receipt photo(s) for invoice ${invoice.invoiceNumber}`
      }
    });

    return res.status(201).json({ message: 'Signed receipt images uploaded successfully', images: createdImages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload signed receipt images', error: error.message });
  }
};

const deleteInvoiceImage = async (req, res) => {
  try {
    const { invoiceId, imageId } = req.params;

    const image = await prisma.invoiceImage.findUnique({ where: { id: imageId } });
    if (!image || image.invoiceId !== invoiceId) {
      return res.status(404).json({ message: 'Receipt image not found' });
    }

    if (image.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary image destroy error:', cloudErr.message);
      }
    }

    await prisma.invoiceImage.delete({ where: { id: imageId } });

    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Signed receipt image deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete receipt image', error: error.message });
  }
};

// ----------------------------------------------------
// SALESMAN INCENTIVES AGGREGATION CONTROLLER
// ----------------------------------------------------
const getSalesmanIncentives = async (req, res) => {
  try {
    const { salesman, search, startDate, endDate } = req.query;

    const whereClause = {
      category: 'SALES_RECEIPT'
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date.lte = end;
      }
    }

    const [allSales, users] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        include: {
          createdByUser: { select: { id: true, name: true, email: true, role: true } }
        }
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true }
      })
    ]);

    // Group sales by Salesman Name (case-insensitive / normalized)
    const salesmanMap = new Map();

    allSales.forEach(inv => {
      const sName = (inv.salesmanName && inv.salesmanName.trim() !== '')
        ? inv.salesmanName.trim()
        : (inv.createdByUser?.name || 'Direct Showroom Staff');

      const sKey = sName.toLowerCase();
      if (!salesmanMap.has(sKey)) {
        const matchedUser = users.find(u => u.name.toLowerCase() === sKey || u.id === inv.salesmanId);
        salesmanMap.set(sKey, {
          salesmanName: sName,
          salesmanId: inv.salesmanId || matchedUser?.id || null,
          role: matchedUser?.role || 'SALES_EXECUTIVE',
          email: matchedUser?.email || null,
          totalVehiclesSold: 0,
          totalSalesVolume: 0,
          totalCommissionEarned: 0,
          consignmentSalesCount: 0,
          showroomSalesCount: 0,
          soldVehicles: []
        });
      }

      const sm = salesmanMap.get(sKey);
      const vehiclePrice = parsePakistaniPrice(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0);
      const commAmt = parsePakistaniPrice(inv.commissionAmount || 0);

      sm.totalVehiclesSold += 1;
      sm.totalSalesVolume += vehiclePrice;
      sm.totalCommissionEarned += commAmt;

      if (inv.isCustomerVehicle) {
        sm.consignmentSalesCount += 1;
      } else {
        sm.showroomSalesCount += 1;
      }

      sm.soldVehicles.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        registrationNo: inv.registrationNo,
        vehicleMaker: inv.vehicleMaker,
        vehicleModel: inv.vehicleModel,
        carYear: inv.carYear,
        color: inv.color,
        chassisNumber: inv.chassisNumber,
        price: vehiclePrice,
        isCustomerVehicle: Boolean(inv.isCustomerVehicle),
        commissionAmount: commAmt,
        commissionPercent: inv.commissionPercent || '0',
        buyerName: inv.buyerName,
        buyerPhone: inv.buyerPhone,
        sellerName: inv.sellerName,
        sellerPhone: inv.sellerPhone,
        paymentMethod: inv.paymentMethod,
        deliveryStatus: inv.deliveryStatus
      });
    });

    let salesmenList = Array.from(salesmanMap.values());

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      salesmenList = salesmenList.filter(s => 
        s.salesmanName.toLowerCase().includes(q) ||
        s.soldVehicles.some(v => 
          (v.vehicleMaker && v.vehicleMaker.toLowerCase().includes(q)) ||
          (v.vehicleModel && v.vehicleModel.toLowerCase().includes(q)) ||
          (v.registrationNo && v.registrationNo.toLowerCase().includes(q)) ||
          (v.buyerName && v.buyerName.toLowerCase().includes(q)) ||
          (v.sellerName && v.sellerName.toLowerCase().includes(q))
        )
      );
    }

    if (salesman && salesman !== 'ALL') {
      salesmenList = salesmenList.filter(s => s.salesmanName.toLowerCase() === salesman.toLowerCase());
    }

    // Sort by total sold cars descending
    salesmenList.sort((a, b) => b.totalVehiclesSold - a.totalVehiclesSold || b.totalSalesVolume - a.totalSalesVolume);

    const overallStats = {
      totalSalesmenCount: salesmenList.length,
      totalVehiclesSold: salesmenList.reduce((acc, s) => acc + s.totalVehiclesSold, 0),
      totalSalesVolume: salesmenList.reduce((acc, s) => acc + s.totalSalesVolume, 0),
      totalCommissionEarned: salesmenList.reduce((acc, s) => acc + s.totalCommissionEarned, 0)
    };

    return res.json({
      salesmen: salesmenList,
      overallStats
    });
  } catch (error) {
    console.error('getSalesmanIncentives error:', error);
    return res.status(500).json({ message: 'Failed to fetch salesman incentives', error: error.message });
  }
};

// ----------------------------------------------------
// CUSTOMER & TRADE HISTORY CONTROLLER (BUYERS & SELLERS)
// ----------------------------------------------------
const getCustomerTradeHistory = async (req, res) => {
  try {
    const { search = '', type = 'ALL' } = req.query;

    const [salesInvoices, bookingInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: { category: 'SALES_RECEIPT' },
        orderBy: { date: 'desc' }
      }),
      prisma.invoice.findMany({
        where: { category: 'BOOKING_RECEIPT' },
        orderBy: { date: 'desc' }
      })
    ]);

    const buyerMap = new Map();
    const sellerMap = new Map();

    salesInvoices.forEach(inv => {
      const price = parsePakistaniPrice(inv.totalPrice || inv.agreedAmount || inv.saleAmount || 0);
      const commAmt = parsePakistaniPrice(inv.commissionAmount || 0);

      // 1. BUYER MAPPING
      const bName = inv.buyerName ? inv.buyerName.trim() : null;
      const bPhone = inv.buyerPhone ? inv.buyerPhone.trim() : '';
      const bCnic = inv.buyerCnic ? inv.buyerCnic.trim() : '';
      const bAddress = inv.buyerAddress ? inv.buyerAddress.trim() : '';

      if (bName && bName.toLowerCase() !== 'n/a') {
        const bKey = (bPhone.replace(/\D/g, '').length >= 7)
          ? `PHONE_${bPhone.replace(/\D/g, '')}`
          : (bCnic.replace(/\D/g, '').length >= 9)
            ? `CNIC_${bCnic.replace(/\D/g, '')}`
            : `NAME_${bName.toLowerCase()}`;

        if (!buyerMap.has(bKey)) {
          buyerMap.set(bKey, {
            customerKey: bKey,
            type: 'BUYER',
            name: bName,
            fatherName: inv.buyerFatherName || '',
            phone: bPhone,
            cnic: bCnic,
            address: bAddress,
            totalVehiclesBought: 0,
            totalSpent: 0,
            totalBookingsCount: 0,
            purchasedVehicles: [],
            bookingHistory: []
          });
        }

        const bData = buyerMap.get(bKey);
        bData.totalVehiclesBought += 1;
        bData.totalSpent += price;
        if (!bData.phone && bPhone) bData.phone = bPhone;
        if (!bData.cnic && bCnic) bData.cnic = bCnic;
        if (!bData.address && bAddress) bData.address = bAddress;

        bData.purchasedVehicles.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          vehicleMaker: inv.vehicleMaker || '',
          vehicleModel: inv.vehicleModel || '',
          carYear: inv.carYear || '',
          registrationNo: inv.registrationNo || '',
          chassisNumber: inv.chassisNumber || '',
          color: inv.color || '',
          price,
          advanceAmount: parsePakistaniPrice(inv.advanceAmount || 0),
          remainingAmount: parsePakistaniPrice(inv.remainingAmount || 0),
          linkedBookingNumber: inv.linkedBookingNumber || null,
          sellerName: inv.sellerName || 'AL-ASR Showroom Stock',
          sellerPhone: inv.sellerPhone || '',
          salesmanName: inv.salesmanName || 'Showroom Staff',
          paymentMethod: inv.paymentMethod || 'CASH',
          deliveryStatus: inv.deliveryStatus || 'DELIVERED',
          isCustomerVehicle: Boolean(inv.isCustomerVehicle)
        });
      }

      // 2. SELLER MAPPING
      const sName = inv.sellerName ? inv.sellerName.trim() : null;
      const sPhone = inv.sellerPhone ? inv.sellerPhone.trim() : '';
      const sCnic = inv.sellerCnic ? inv.sellerCnic.trim() : '';
      const sAddress = inv.sellerAddress ? inv.sellerAddress.trim() : '';

      if (sName && sName.toLowerCase() !== 'n/a') {
        const sKey = (sPhone.replace(/\D/g, '').length >= 7)
          ? `PHONE_${sPhone.replace(/\D/g, '')}`
          : (sCnic.replace(/\D/g, '').length >= 9)
            ? `CNIC_${sCnic.replace(/\D/g, '')}`
            : `NAME_${sName.toLowerCase()}`;

        if (!sellerMap.has(sKey)) {
          sellerMap.set(sKey, {
            customerKey: sKey,
            type: 'SELLER',
            name: sName,
            fatherName: inv.sellerFatherName || '',
            phone: sPhone,
            cnic: sCnic,
            address: sAddress,
            totalVehiclesSold: 0,
            totalVolume: 0,
            totalCommissionPaid: 0,
            consignmentCount: 0,
            directShowroomCount: 0,
            soldVehicles: []
          });
        }

        const sData = sellerMap.get(sKey);
        sData.totalVehiclesSold += 1;
        sData.totalVolume += price;
        sData.totalCommissionPaid += commAmt;
        if (inv.isCustomerVehicle) sData.consignmentCount += 1;
        else sData.directShowroomCount += 1;
        if (!sData.phone && sPhone) sData.phone = sPhone;
        if (!sData.cnic && sCnic) sData.cnic = sCnic;
        if (!sData.address && sAddress) sData.address = sAddress;

        sData.soldVehicles.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          vehicleMaker: inv.vehicleMaker || '',
          vehicleModel: inv.vehicleModel || '',
          carYear: inv.carYear || '',
          registrationNo: inv.registrationNo || '',
          chassisNumber: inv.chassisNumber || '',
          color: inv.color || '',
          price,
          commissionAmount: commAmt,
          isCustomerVehicle: Boolean(inv.isCustomerVehicle),
          buyerName: inv.buyerName || 'Customer',
          buyerPhone: inv.buyerPhone || '',
          salesmanName: inv.salesmanName || 'Showroom Staff',
          paymentMethod: inv.paymentMethod || 'CASH',
          deliveryStatus: inv.deliveryStatus || 'DELIVERED'
        });
      }
    });

    // Populate Booking History for Buyers
    bookingInvoices.forEach(bk => {
      const bkName = bk.buyerName || bk.customerName ? (bk.buyerName || bk.customerName).trim() : null;
      const bkPhone = bk.buyerPhone || bk.customerPhone ? (bk.buyerPhone || bk.customerPhone).trim() : '';
      const bkCnic = bk.buyerCnic ? bk.buyerCnic.trim() : '';
      const bkAddress = bk.buyerAddress ? bk.buyerAddress.trim() : '';

      if (bkName && bkName.toLowerCase() !== 'n/a') {
        const bKey = (bkPhone.replace(/\D/g, '').length >= 7)
          ? `PHONE_${bkPhone.replace(/\D/g, '')}`
          : (bkCnic.replace(/\D/g, '').length >= 9)
            ? `CNIC_${bkCnic.replace(/\D/g, '')}`
            : `NAME_${bkName.toLowerCase()}`;

        if (!buyerMap.has(bKey)) {
          buyerMap.set(bKey, {
            customerKey: bKey,
            type: 'BUYER',
            name: bkName,
            fatherName: bk.buyerFatherName || '',
            phone: bkPhone,
            cnic: bkCnic,
            address: bkAddress,
            totalVehiclesBought: 0,
            totalSpent: 0,
            totalBookingsCount: 0,
            purchasedVehicles: [],
            bookingHistory: []
          });
        }

        const bData = buyerMap.get(bKey);
        bData.totalBookingsCount = (bData.totalBookingsCount || 0) + 1;
        if (!bData.phone && bkPhone) bData.phone = bkPhone;
        if (!bData.cnic && bkCnic) bData.cnic = bkCnic;
        if (!bData.address && bkAddress) bData.address = bkAddress;

        bData.bookingHistory.push({
          id: bk.id,
          bookingNumber: bk.invoiceNumber,
          date: bk.date,
          vehicleMaker: bk.vehicleMaker || '',
          vehicleModel: bk.vehicleModel || '',
          carYear: bk.carYear || '',
          registrationNo: bk.registrationNo || '',
          chassisNumber: bk.chassisNumber || '',
          advanceAmount: parsePakistaniPrice(bk.advanceAmount || 0),
          totalPrice: parsePakistaniPrice(bk.totalPrice || 0),
          isDeleted: Boolean(bk.isDeleted),
          bookingStatus: bk.bookingStatus || (bk.isDeleted ? 'CONVERTED_TO_SALE' : 'ACTIVE'),
          linkedSaleId: bk.linkedSaleId || null,
          linkedSaleNumber: bk.linkedSaleNumber || null,
          linkedVoucherId: bk.linkedVoucherId || null,
          linkedVoucherNumber: bk.linkedVoucherNumber || null,
          cancellationReason: bk.cancellationReason || null,
          cancelledAt: bk.cancelledAt || null,
          salesmanName: bk.salesmanName || 'Showroom Staff'
        });
      }
    });

    let buyersList = Array.from(buyerMap.values());
    let sellersList = Array.from(sellerMap.values());

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      buyersList = buyersList.filter(b => 
        b.name.toLowerCase().includes(q) ||
        (b.phone && b.phone.includes(q)) ||
        (b.cnic && b.cnic.includes(q)) ||
        b.purchasedVehicles.some(v => 
          v.vehicleMaker.toLowerCase().includes(q) ||
          v.vehicleModel.toLowerCase().includes(q) ||
          v.registrationNo.toLowerCase().includes(q) ||
          v.chassisNumber.toLowerCase().includes(q)
        )
      );

      sellersList = sellersList.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.cnic && s.cnic.includes(q)) ||
        s.soldVehicles.some(v => 
          v.vehicleMaker.toLowerCase().includes(q) ||
          v.vehicleModel.toLowerCase().includes(q) ||
          v.registrationNo.toLowerCase().includes(q) ||
          v.chassisNumber.toLowerCase().includes(q)
        )
      );
    }

    buyersList.sort((a, b) => b.totalVehiclesBought - a.totalVehiclesBought || b.totalSpent - a.totalSpent);
    sellersList.sort((a, b) => b.totalVehiclesSold - a.totalVehiclesSold || b.totalVolume - a.totalVolume);

    return res.json({
      buyers: buyersList,
      sellers: sellersList,
      stats: {
        totalUniqueBuyers: buyerMap.size,
        totalUniqueSellers: sellerMap.size,
        totalPurchasesRecorded: salesInvoices.length
      }
    });
  } catch (error) {
    console.error('getCustomerTradeHistory error:', error);
    return res.status(500).json({ message: 'Failed to fetch customer trade history', error: error.message });
  }
};

// Accounts Head Sales / Voucher Approval Handler
const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body || {};

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { createdByUser: true }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice / Receipt not found' });
    }

    if (invoice.approvalStatus === 'APPROVED') {
      return res.status(400).json({ message: 'Invoice is already approved and posted to accounts.' });
    }

    // 1. Update invoice approval status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || 'Approved by Accounts Head'
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        approvedByUser: { select: { id: true, name: true, email: true, role: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    // 2. Synchronize double-entry ledger transactions and credit Bank / Cash in Hand accounts
    await syncInvoiceLedgerTransactions(id, req.user.id);

    // 3. Activity Log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE_INVOICE_SALES',
        details: `Accounts Head approved ${invoice.category} #${invoice.invoiceNumber} (${invoice.vehicleMaker || ''} ${invoice.vehicleModel || ''}). Amounts successfully posted into Cash in Hand / Bank accounts.`
      }
    });

    // 4. Notification to Super Admin and Creator
    try {
      const isPV = invoice.category === 'PAYMENT_VOUCHER';
      const amountVal = parsePakistaniPrice(invoice.cashAmount || invoice.totalPrice || invoice.agreedAmount || invoice.saleAmount || 0);
      await prisma.notification.create({
        data: {
          targetRole: 'SUPER_ADMIN',
          title: `✅ ${isPV ? 'Payment Voucher' : 'Sales Receipt'} Approved: #${invoice.invoiceNumber}`,
          message: `Accounts Head (${req.user.name}) has approved #${invoice.invoiceNumber} for Rs. ${amountVal.toLocaleString()}. Funds have been credited to ${invoice.paymentMethod || 'CASH'} accounts.`,
          type: invoice.category || 'FINANCIAL_INFLOW',
          category: invoice.paymentMethod || 'CASH',
          amount: amountVal,
          referenceId: invoice.id
        }
      });
    } catch (notifErr) {
      console.warn('Failed to send notification on invoice approval:', notifErr.message);
    }

    return res.json({
      message: `Invoice #${invoice.invoiceNumber} successfully approved. Amount posted to accounts!`,
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('approveInvoice error:', error);
    return res.status(500).json({ message: 'Failed to approve invoice', error: error.message });
  }
};

// Accounts Head Sales / Voucher Rejection Handler
const rejectInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body || {};

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { createdByUser: true }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice / Receipt not found' });
    }

    // 1. Update invoice status to REJECTED
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || 'Rejected by Accounts Head'
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        approvedByUser: { select: { id: true, name: true, email: true, role: true } },
        images: { orderBy: { uploadedAt: 'desc' } }
      }
    });

    // 2. Revert any ledger transactions (if previously approved/posted)
    await syncInvoiceLedgerTransactions(id, req.user.id);

    // 3. Activity Log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'REJECT_INVOICE_SALES',
        details: `Accounts Head rejected ${invoice.category} #${invoice.invoiceNumber} (${invoice.vehicleMaker || ''} ${invoice.vehicleModel || ''}). Reason: ${approvalNotes || 'No remarks provided'}`
      }
    });

    // 4. Notification to Super Admin and Creator
    try {
      await prisma.notification.create({
        data: {
          targetRole: 'SUPER_ADMIN',
          title: `❌ ${invoice.category} Rejected: #${invoice.invoiceNumber}`,
          message: `Accounts Head (${req.user.name}) rejected #${invoice.invoiceNumber}. Note: ${approvalNotes || 'Please check and resubmit.'}`,
          type: 'APPROVAL_REQUEST',
          category: invoice.paymentMethod || 'CASH',
          referenceId: invoice.id
        }
      });
    } catch (notifErr) {
      console.warn('Failed to send notification on invoice rejection:', notifErr.message);
    }

    return res.json({
      message: `Invoice #${invoice.invoiceNumber} rejected. No amounts posted to accounts.`,
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('rejectInvoice error:', error);
    return res.status(500).json({ message: 'Failed to reject invoice', error: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  findActiveBookingByPhone,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  cancelBookingAndIssueRefund,
  uploadInvoiceImages,
  deleteInvoiceImage,
  syncInvoiceLedgerTransactions,
  getSalesmanIncentives,
  getCustomerTradeHistory,
  approveInvoice,
  rejectInvoice
};

