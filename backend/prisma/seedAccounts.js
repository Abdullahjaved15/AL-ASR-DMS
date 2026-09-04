const prisma = require('../src/config/db');

async function seedAccounts() {
  console.log('🌱 Seeding Default Chart of Accounts...');

  const defaultAccounts = [
    {
      code: '1001',
      name: 'Cash in Hand',
      type: 'ASSET',
      subType: 'CASH',
      description: 'Physical cash received from customers and held in showroom safe',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '1002',
      name: 'Meezan Bank - Main Operational Account',
      type: 'ASSET',
      subType: 'BANK',
      bankName: 'Meezan Bank',
      accountNumber: 'PK89MEZN000123456789',
      branch: 'Main Auto Market Branch',
      description: 'Primary dealership corporate bank account for customer transfers & vendor payouts',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '1003',
      name: 'Bank Alfalah - Dealership Account',
      type: 'ASSET',
      subType: 'BANK',
      bankName: 'Bank Alfalah',
      accountNumber: 'PK44ALFH000987654321',
      branch: 'Showroom Commercial Branch',
      description: 'Secondary bank account for car booking & sales receipts',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '1050',
      name: 'Customer Accounts Receivable',
      type: 'ASSET',
      subType: 'CUSTOMER',
      description: 'Balances due from vehicle buyers and pending installments',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '2001',
      name: 'Supplier & Seller Payables',
      type: 'LIABILITY',
      subType: 'VENDOR',
      description: 'Amounts owed to car sellers, auto suppliers, and third parties',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '2050',
      name: 'Security Cheques Issued (Liability)',
      type: 'LIABILITY',
      subType: 'OTHER',
      description: 'Signed security cheques handed over to parties when bank funds were insufficient',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '3001',
      name: 'Owner Capital & Equity',
      type: 'EQUITY',
      subType: 'CAPITAL',
      description: 'Owner equity and working capital investments in AL ASR Motors',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '4001',
      name: 'Vehicle Direct Sales Revenue',
      type: 'REVENUE',
      subType: 'OTHER',
      description: 'Revenue earned from vehicle sales and deliveries',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '4002',
      name: 'Dealership Commission & Brokerage Fee',
      type: 'REVENUE',
      subType: 'OTHER',
      description: 'Commission earned from closing car deals between buyers and sellers',
      isSystem: true,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '5001',
      name: 'Showroom Rent Expense',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      description: 'Monthly lease/rent for showroom premises and parking yard',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '5002',
      name: 'Staff Salaries & Incentives',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      description: 'Employee salaries, salesman incentives, and staff allowances',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '5003',
      name: 'Vehicle Detailing, Refurbishment & Maintenance',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      description: 'Vehicle inspection, cosmetic touch-ups, mechanical fixes, and washing',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '5004',
      name: 'Showroom Utilities & Electricity',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      description: 'Showroom electricity, internet, telephone, and utility bills',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    },
    {
      code: '5005',
      name: 'General & Miscellaneous Operations',
      type: 'EXPENSE',
      subType: 'EXPENSE',
      description: 'Refreshments, office stationery, client tea, and daily minor expenses',
      isSystem: false,
      openingBalance: 0,
      currentBalance: 0
    }
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc
    });
    console.log(`  ✓ Seeded Account: [${acc.code}] ${acc.name} (${acc.type})`);
  }

  console.log('✅ Default Chart of Accounts seeded successfully.');
}

if (require.main === module) {
  seedAccounts()
    .catch((err) => {
      console.error('❌ Seed Accounts failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedAccounts;
