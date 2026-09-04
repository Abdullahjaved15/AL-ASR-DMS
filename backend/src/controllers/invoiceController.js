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
    const { page = 1, limit = 20, search = '', category = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.AND = [
        category && category !== 'ALL' ? { category } : {},
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

    const [invoices, totalCount, statsRaw] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          images: { orderBy: { uploadedAt: 'desc' } }
        }
      }),
      prisma.invoice.count({ where: whereClause }),
      prisma.invoice.findMany({
        where: whereClause,
        select: {
          totalPrice: true,
          saleAmount: true,
          commissionAmount: true,
          totalAmount: true
        }
      })
    ]);

    const totalSalesVolume = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalPrice || inv.saleAmount), 0);
    const totalCommissionEarned = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.commissionAmount), 0);
    const grandTotalValue = statsRaw.reduce((sum, inv) => sum + parsePakistaniPrice(inv.totalAmount), 0) || (totalSalesVolume + totalCommissionEarned);

    return res.json({
      invoices,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalInvoices: totalCount,
        totalSalesVolume,
        totalCommissionEarned,
        grandTotalValue
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
        createdByUser: { select: { id: true, name: true, email: true } },
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
      linkedChassisSaleId
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : null;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : null;

    const finalBuyerName = buyerName || customerName || 'N/A';
    const finalVehicleMaker = vehicleMaker || carVehicle || 'N/A';
    const finalVehicleModel = vehicleModel || carModel || 'N/A';

    const numericTotalPrice = parsePakistaniPrice(totalPrice || agreedAmount || saleAmount);
    const numericAdvance = parsePakistaniPrice(advanceAmount);
    const numericRemaining = remainingAmount !== undefined && remainingAmount !== null && remainingAmount !== '' 
      ? parsePakistaniPrice(remainingAmount)
      : Math.max(0, numericTotalPrice - numericAdvance);
    const numericCommPercent = parseFloat(String(commissionPercent || 0).replace(/[^0-9.]/g, '')) || 0;
    const commissionAmount = (numericTotalPrice * numericCommPercent) / 100;
    const totalAmountCalculated = numericTotalPrice + commissionAmount;

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
        carYear: carYear ? String(carYear) : String(new Date().getFullYear()),
        carRegNumber: registrationNo || carRegNumber || null,
        saleAmount: saleAmount !== undefined && saleAmount !== null ? String(saleAmount) : String(numericTotalPrice),
        commissionPercent: commissionPercent !== undefined && commissionPercent !== null ? String(commissionPercent) : String(numericCommPercent),
        commissionAmount: String(commissionAmount),
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

        // Witnesses
        witness1Name: witness1Name || null,
        witness1Cnic: witness1Cnic || null,
        witness2Name: witness2Name || null,
        witness2Cnic: witness2Cnic || null,

        createdBy: req.user.id
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } }
      }
    });

    // ----------------------------------------------------
    // AUTOMATED FINANCIAL LEDGER POSTINGS (DOUBLE ENTRY)
    // ----------------------------------------------------
    try {
      const todayDate = new Date();
      const countTxn = await prisma.transaction.count();
      const txnSeq = String(countTxn + 1).padStart(4, '0');
      const dateCode = todayDate.toISOString().slice(0, 10).replace(/-/g, '');

      // Case A: PAYMENT VOUCHER
      if (category === 'PAYMENT_VOUCHER') {
        const paymentAmt = parsePakistaniPrice(cashAmount || totalPrice || agreedAmount || saleAmount);
        if (paymentAmt > 0) {
          // Source Account (Bank or Cash in Hand)
          let sourceAccount = null;
          if (paymentMethod === 'BANK' && bankAccountId) {
            sourceAccount = await prisma.account.findUnique({ where: { id: bankAccountId } });
          }
          if (!sourceAccount) {
            sourceAccount = await prisma.account.findFirst({ where: { subType: 'CASH', isActive: true } });
          }
          if (!sourceAccount) {
            sourceAccount = await prisma.account.findFirst({ where: { subType: 'CASH' } });
          }
          if (!sourceAccount) {
            // Auto-create default Cash in Hand Safe account
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

          // Target Account (Expense or Payables)
          let targetAccount = null;
          if (headOfAccount && String(headOfAccount).trim() !== '') {
            const cleanHead = String(headOfAccount).trim();
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
              // Auto-generate next code in 5000 range
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

          const pvTxn = await prisma.transaction.create({
            data: {
              transactionNumber: `PV-${dateCode}-${txnSeq}`,
              date: todayDate,
              type: 'PAYMENT_VOUCHER',
              amount: paymentAmt,
              description: `Payment Voucher ${invoiceNumber} to [${payeeName || finalBuyerName}] via [${sourceAccount.name}] - Head: [${targetAccount.name}] ${remarks || onAccount ? '(' + (remarks || onAccount) + ')' : ''}`,
              referenceType: 'INVOICE',
              referenceId: newInvoice.id,
              referenceNumber: invoiceNumber,
              chassisNumber: chassisNumber || null,
              createdById: req.user.id,
              entries: {
                create: [
                  {
                    accountId: sourceAccount.id,
                    type: 'CREDIT', // Outflow from bank/cash
                    amount: paymentAmt,
                    description: `Payment to ${payeeName || finalBuyerName}`
                  },
                  {
                    accountId: targetAccount.id,
                    type: 'DEBIT', // Expense / liability debit
                    amount: paymentAmt,
                    description: `Payment Voucher for [${targetAccount.name}]: ${payeeName || finalBuyerName}`
                  }
                ]
              }
            }
          });

          // Decrement source account balance (money left cash/bank)
          await prisma.account.update({
            where: { id: sourceAccount.id },
            data: { currentBalance: { decrement: paymentAmt } }
          });

          // Update target account balance
          if (targetAccount.type === 'EXPENSE' || targetAccount.type === 'ASSET') {
            await prisma.account.update({
              where: { id: targetAccount.id },
              data: { currentBalance: { increment: paymentAmt } }
            });
          } else if (targetAccount.type === 'LIABILITY' || targetAccount.type === 'EQUITY') {
            await prisma.account.update({
              where: { id: targetAccount.id },
              data: { currentBalance: { decrement: paymentAmt } }
            });
          }

          // Real-time notification dispatch to ACCOUNTS_HEAD
          try {
            await prisma.notification.create({
              data: {
                targetRole: 'ACCOUNTS_HEAD',
                title: `💵 Payment Voucher Outflow: Rs. ${paymentAmt.toLocaleString()}`,
                message: `Payment Voucher #${invoiceNumber} issued to ${payeeName || finalBuyerName} for Head [${targetAccount.name}] via [${sourceAccount.name}] - Rs. ${paymentAmt.toLocaleString()}`,
                type: 'PAYMENT_VOUCHER',
                category: paymentMethod || 'CASH',
                amount: paymentAmt,
                referenceId: newInvoice.id,
                linkUrl: '/invoices'
              }
            });
          } catch (notifErr) {
            console.warn('Failed to send PV notification:', notifErr.message);
          }
        }
      } 
      // Case B: SALES RECEIPT, BOOKING RECEIPT, DELIVERY LETTER
      else {
        let cashReceived = 0;
        let bankReceived = 0;

        const effectiveTotalReceived = numericAdvance > 0 ? numericAdvance : numericTotalPrice;

        if (paymentMethod === 'CASH') {
          cashReceived = effectiveTotalReceived;
        } else if (paymentMethod === 'BANK') {
          bankReceived = effectiveTotalReceived;
        } else if (paymentMethod === 'SPLIT') {
          cashReceived = parsePakistaniPrice(cashAmountReceived);
          bankReceived = parsePakistaniPrice(bankAmountReceived);
          if (cashReceived === 0 && bankReceived === 0) {
            cashReceived = effectiveTotalReceived;
          }
        }

        const totalReceived = cashReceived + bankReceived;

        if (totalReceived > 0) {
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
            if (bankAccountId) {
              bankAccount = await prisma.account.findUnique({ where: { id: bankAccountId } });
            }
            if (!bankAccount) {
              bankAccount = await prisma.account.findFirst({ where: { subType: 'BANK', isActive: true } })
                || await prisma.account.findFirst({ where: { subType: 'BANK' } });
            }
          }

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
                description: 'Primary revenue from vehicle sales & bookings'
              }
            });
          }

          const entriesToCreate = [];
          if (cashReceived > 0 && cashAccount) {
            entriesToCreate.push({
              accountId: cashAccount.id,
              type: 'DEBIT', // Inflow
              amount: cashReceived,
              description: `Cash received from ${finalBuyerName} for ${finalVehicleMaker} ${finalVehicleModel}`
            });
          }

          if (bankReceived > 0 && bankAccount) {
            entriesToCreate.push({
              accountId: bankAccount.id,
              type: 'DEBIT', // Inflow
              amount: bankReceived,
              description: `Bank transfer from ${finalBuyerName} into ${bankAccount.name}`
            });
          }

          if (revenueAccount) {
            entriesToCreate.push({
              accountId: revenueAccount.id,
              type: 'CREDIT', // Revenue
              amount: totalReceived,
              description: `Sales revenue from ${finalBuyerName}`
            });
          }

          if (entriesToCreate.length > 0) {
            await prisma.transaction.create({
              data: {
                transactionNumber: `REC-${dateCode}-${txnSeq}`,
                date: todayDate,
                type: 'RECEIPT_VOUCHER',
                amount: totalReceived,
                description: `Receipt ${invoiceNumber} for [${finalBuyerName}] (${finalVehicleMaker} ${finalVehicleModel} - Chassis: ${chassisNumber || 'N/A'}) - Cash: Rs. ${cashReceived}, Bank: Rs. ${bankReceived}`,
                referenceType: 'INVOICE',
                referenceId: newInvoice.id,
                referenceNumber: invoiceNumber,
                chassisNumber: chassisNumber || null,
                createdById: req.user.id,
                entries: {
                  create: entriesToCreate
                }
              }
            });

            // Update account balances
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
            if (revenueAccount) {
              await prisma.account.update({
                where: { id: revenueAccount.id },
                data: { currentBalance: { increment: totalReceived } }
              });
            }
          }

          // ----------------------------------------------------
          // NOTIFICATION DISPATCH TO ACCOUNTS HEAD
          // ----------------------------------------------------
          try {
            const isBooking = category === 'BOOKING_RECEIPT';
            const typeLabel = isBooking ? 'Booking Receipt' : 'Sales Receipt';
            const targetBankName = bankAccount ? bankAccount.name : 'Bank Account';
            
            let paymentDetailStr = '';
            if (paymentMethod === 'CASH') {
              paymentDetailStr = `Cash in Hand Safe (Rs. ${cashReceived.toLocaleString()})`;
            } else if (paymentMethod === 'BANK') {
              paymentDetailStr = `${targetBankName} (Rs. ${bankReceived.toLocaleString()})`;
            } else if (paymentMethod === 'SPLIT') {
              paymentDetailStr = `Split: Cash Rs. ${cashReceived.toLocaleString()} + ${targetBankName} Rs. ${bankReceived.toLocaleString()}`;
            } else {
              paymentDetailStr = `Rs. ${totalReceived.toLocaleString()}`;
            }

            const notifTitle = isBooking
              ? `📅 New Booking Inflow: Rs. ${totalReceived.toLocaleString()}`
              : `💰 New Sales Inflow: Rs. ${totalReceived.toLocaleString()}`;

            const notifMessage = `${typeLabel} #${invoiceNumber} generated for ${finalVehicleMaker} ${finalVehicleModel} (Chassis: ${chassisNumber || 'N/A'}). Received ${paymentDetailStr} from Customer ${finalBuyerName} by ${req.user.name || 'Sales Officer'}.`;

            await prisma.notification.create({
              data: {
                targetRole: 'ACCOUNTS_HEAD',
                title: notifTitle,
                message: notifMessage,
                type: category || 'FINANCIAL_INFLOW',
                category: paymentMethod || 'CASH',
                amount: totalReceived,
                referenceId: newInvoice.id,
                linkUrl: '/invoices'
              }
            });
          } catch (notifErr) {
            console.warn('Failed to create notification for accounts head:', notifErr.message);
          }
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
          const ipPlanNumber = `IP-${dateCode}-${String(ipCount + 1).padStart(4, '0')}`;
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
      }
    } catch (accountError) {
      console.error('Automated ledger posting error (non-fatal):', accountError);
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
      linkedChassisSaleId
    } = req.body;

    const finalSellerPhoto = sellerPhoto ? await handleCloudinaryUpload(sellerPhoto, 'sellers') : existing.sellerPhoto;
    const finalBuyerPhoto = buyerPhoto ? await handleCloudinaryUpload(buyerPhoto, 'buyers') : existing.buyerPhoto;

    const finalBuyerName = buyerName || existing.buyerName;
    const finalVehicleMaker = vehicleMaker || existing.vehicleMaker;
    const finalVehicleModel = vehicleModel || existing.vehicleModel;

    const numericTotalPrice = parsePakistaniPrice(totalPrice || agreedAmount || existing.totalPrice || existing.agreedAmount);
    const numericAdvance = parsePakistaniPrice(advanceAmount !== undefined ? advanceAmount : existing.advanceAmount);
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

        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        bankAccountId: bankAccountId !== undefined ? bankAccountId : existing.bankAccountId,
        cashAmountReceived: cashAmountReceived !== undefined ? (cashAmountReceived ? String(parsePakistaniPrice(cashAmountReceived)) : null) : existing.cashAmountReceived,
        bankAmountReceived: bankAmountReceived !== undefined ? (bankAmountReceived ? String(parsePakistaniPrice(bankAmountReceived)) : null) : existing.bankAmountReceived,
        isInstallmentSale: isInstallmentSale !== undefined ? Boolean(isInstallmentSale) : existing.isInstallmentSale,
        deliveryStatus: deliveryStatus !== undefined ? deliveryStatus : existing.deliveryStatus,
        isDoubleSaleLiability: isDoubleSaleLiability !== undefined ? Boolean(isDoubleSaleLiability) : existing.isDoubleSaleLiability,
        linkedChassisSaleId: linkedChassisSaleId !== undefined ? linkedChassisSaleId : existing.linkedChassisSaleId,

        witness1Name: witness1Name !== undefined ? witness1Name : existing.witness1Name,
        witness1Cnic: witness1Cnic !== undefined ? witness1Cnic : existing.witness1Cnic,
        witness2Name: witness2Name !== undefined ? witness2Name : existing.witness2Name,
        witness2Cnic: witness2Cnic !== undefined ? witness2Cnic : existing.witness2Cnic
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SALES_RECEIPT',
        details: `Updated Sales Receipt ${existing.invoiceNumber} for ${finalBuyerName}`
      }
    });

    return res.json(updatedInvoice);
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

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  uploadInvoiceImages,
  deleteInvoiceImage
};
