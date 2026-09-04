const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const dealRoutes = require('./routes/dealRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const stockRoutes = require('./routes/stockRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const receivingLetterRoutes = require('./routes/receivingLetterRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const incentiveApprovalRoutes = require('./routes/incentiveApprovalRoutes');

// Accounts & Finance Routes
const accountRoutes = require('./routes/accountRoutes');
const securityChequeRoutes = require('./routes/securityChequeRoutes');
const installmentRoutes = require('./routes/installmentRoutes');
const auditTrailRoutes = require('./routes/auditTrailRoutes');
const soldCarsRoutes = require('./routes/soldCarsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const accountsStockRoutes = require('./routes/accountsStockRoutes');

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AL ASR MOTORS DMS Express API', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/receiving-letters', receivingLetterRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/incentive-approvals', incentiveApprovalRoutes);

// Accounts & Finance Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/security-cheques', securityChequeRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/sold-cars', soldCarsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/accounts-stock', accountsStockRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 AL ASR MOTORS DMS Backend Express Server running on port ${PORT}`);
  });
}

module.exports = app;
