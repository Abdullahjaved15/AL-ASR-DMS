const prisma = require('../config/db');

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        installmentPlans: {
          include: {
            schedules: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        installmentPlans: {
          include: {
            schedules: {
              orderBy: { installmentNo: 'asc' }
            }
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    // Fetch related invoices where buyerName matches customerName or buyerCnic matches cnic
    let invoices = [];
    if (customer.cnic || customer.customerName) {
      invoices = await prisma.invoice.findMany({
        where: {
          OR: [
            customer.cnic ? { buyerCnic: customer.cnic } : undefined,
            customer.customerName ? { buyerName: { contains: customer.customerName, mode: 'insensitive' } } : undefined
          ].filter(Boolean)
        },
        orderBy: { date: 'desc' }
      });
    }

    return res.json({ ...customer, invoices });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customer details', error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { customerName, cnic, phone, address, city } = req.body;

    if (!customerName) {
      return res.status(400).json({ message: 'Customer Name is required' });
    }

    const customer = await prisma.customer.create({
      data: {
        customerName,
        cnic: cnic || null,
        phone: phone || null,
        address: address || null,
        city: city || null
      }
    });

    return res.status(201).json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, cnic, phone, address, city } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        customerName,
        cnic: cnic || null,
        phone: phone || null,
        address: address || null,
        city: city || null
      }
    });

    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({ where: { id } });
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
