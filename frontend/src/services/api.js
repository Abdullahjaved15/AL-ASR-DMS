let rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
if (rawBaseUrl !== '/api' && !rawBaseUrl.endsWith('/api')) {
  rawBaseUrl += '/api';
}
const API_BASE = rawBaseUrl;
console.log('🔗 AL ASR DMS connecting to Backend API at:', API_BASE);

const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('dms_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

const cleanParams = (params = {}) => {
  const cleaned = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleaned[key] = params[key];
    }
  });
  return new URLSearchParams(cleaned).toString();
};

export const api = {
  // Auth API
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  updateProfile: async (profileData) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(res);
  },

  // Users Management (Admin)
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createUser: async (userData) => {
    const res = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  updateUserStatus: async (id, status, role) => {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, role })
    });
    return handleResponse(res);
  },

  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Sellers & Inventory API
  getSellers: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/sellers?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getSellerById: async (id) => {
    const res = await fetch(`${API_BASE}/sellers/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createSeller: async (data) => {
    const res = await fetch(`${API_BASE}/sellers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateSeller: async (id, data) => {
    const res = await fetch(`${API_BASE}/sellers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteSeller: async (id) => {
    const res = await fetch(`${API_BASE}/sellers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  uploadSellerImages: async (sellerId, category, files) => {
    const formData = new FormData();
    formData.append('category', category);
    Array.from(files).forEach((file) => formData.append('images', file));

    const res = await fetch(`${API_BASE}/sellers/${sellerId}/images`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  deleteSellerImage: async (sellerId, imageId) => {
    const res = await fetch(`${API_BASE}/sellers/${sellerId}/images/${imageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Buyers API
  getBuyers: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/buyers?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createBuyer: async (data) => {
    const res = await fetch(`${API_BASE}/buyers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateBuyer: async (id, data) => {
    const res = await fetch(`${API_BASE}/buyers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteBuyer: async (id) => {
    const res = await fetch(`${API_BASE}/buyers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Deals API
  getDeals: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/deals?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createDeal: async (data) => {
    const res = await fetch(`${API_BASE}/deals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Dashboard Stats API
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Reports API
  getSalesmenReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/salesmen?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getExportCSVUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/reports/export-csv?${query}`;
  },

  getBankCasesReport: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/reports/bank-cases?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getExportBankCasesCSVUrl: (params = {}) => {
    const query = cleanParams(params);
    return `${API_BASE}/reports/export-bank-cases-csv?${query}`;
  },

  // Collaborations API
  getCollaborations: async () => {
    const res = await fetch(`${API_BASE}/collaborations`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createCollaboration: async (data) => {
    const res = await fetch(`${API_BASE}/collaborations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateCollaborationStatus: async (id, data) => {
    const res = await fetch(`${API_BASE}/collaborations/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteCollaboration: async (id) => {
    const res = await fetch(`${API_BASE}/collaborations/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Current Stock API
  getCurrentStock: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/stock?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createStockItem: async (data) => {
    const res = await fetch(`${API_BASE}/stock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateStockItem: async (id, data) => {
    const res = await fetch(`${API_BASE}/stock/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteStockItem: async (id) => {
    const res = await fetch(`${API_BASE}/stock/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Accounts Current Stock API (Dedicated & Independent)
  getAccountsStock: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/accounts-stock?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createAccountsStockItem: async (data) => {
    const res = await fetch(`${API_BASE}/accounts-stock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateAccountsStockItem: async (id, data) => {
    const res = await fetch(`${API_BASE}/accounts-stock/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteAccountsStockItem: async (id) => {
    const res = await fetch(`${API_BASE}/accounts-stock/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  clearAllAccountsStock: async () => {
    const res = await fetch(`${API_BASE}/accounts-stock/clear-all`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Invoices & Vouchers API (Super Admin)
  getInvoices: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/invoices?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getInvoiceById: async (id) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createInvoice: async (data) => {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateInvoice: async (id, data) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteInvoice: async (id) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  uploadInvoiceImages: async (invoiceId, files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));

    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/images`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  deleteInvoiceImage: async (invoiceId, imageId) => {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/images/${imageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Receiving Letters API (Accessible by ALL staff)
  getReceivingLetters: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/receiving-letters?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getReceivingLetterById: async (id) => {
    const res = await fetch(`${API_BASE}/receiving-letters/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createReceivingLetter: async (data) => {
    const res = await fetch(`${API_BASE}/receiving-letters`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteReceivingLetter: async (id) => {
    const res = await fetch(`${API_BASE}/receiving-letters/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  updateReceivingLetter: async (id, data) => {
    const res = await fetch(`${API_BASE}/receiving-letters/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  uploadReceivingLetterImages: async (letterId, files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));

    const res = await fetch(`${API_BASE}/receiving-letters/${letterId}/images`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  deleteReceivingLetterImage: async (letterId, imageId) => {
    const res = await fetch(`${API_BASE}/receiving-letters/${letterId}/images/${imageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Attendance Module API (Super Admin)
  getEmployees: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/attendance/employees?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createEmployee: async (data) => {
    const res = await fetch(`${API_BASE}/attendance/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateEmployee: async (id, data) => {
    const res = await fetch(`${API_BASE}/attendance/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteEmployee: async (id) => {
    const res = await fetch(`${API_BASE}/attendance/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getAttendance: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/attendance?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveAttendance: async (data) => {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  saveBulkAttendance: async (data) => {
    const res = await fetch(`${API_BASE}/attendance/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteAttendance: async (id) => {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getAttendanceReports: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/attendance/reports?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getAttendanceExportUrl: (params = {}) => {
    const query = cleanParams(params);
    return `${API_BASE}/attendance/export-csv?${query}`;
  },

  // Approvals API (Super Admin / Admin)
  getApprovals: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/approvals?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createApprovalRequest: async (data) => {
    const res = await fetch(`${API_BASE}/approvals/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  approveRequest: async (id, reviewNotes = '') => {
    const res = await fetch(`${API_BASE}/approvals/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reviewNotes })
    });
    return handleResponse(res);
  },

  rejectRequest: async (id, reviewNotes = '') => {
    const res = await fetch(`${API_BASE}/approvals/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reviewNotes })
    });
    return handleResponse(res);
  },

  // Incentive Approval Sheet API
  getIncentiveApprovalSheets: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/incentive-approvals?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getIncentiveApprovalSheetById: async (id) => {
    const res = await fetch(`${API_BASE}/incentive-approvals/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createIncentiveApprovalSheet: async (data) => {
    const res = await fetch(`${API_BASE}/incentive-approvals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateIncentiveApprovalSheet: async (id, data) => {
    const res = await fetch(`${API_BASE}/incentive-approvals/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteIncentiveApprovalSheet: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/incentive-approvals/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  uploadIncentiveApprovalSheetImages: async (sheetId, files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));

    const res = await fetch(`${API_BASE}/incentive-approvals/${sheetId}/images`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  deleteIncentiveApprovalSheetImage: async (sheetId, imageId) => {
    const res = await fetch(`${API_BASE}/incentive-approvals/${sheetId}/images/${imageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // ==========================================
  // ACCOUNTS & FINANCIAL MANAGEMENT APIS
  // ==========================================
  
  // 1. Chart of Accounts & Bank/Cash
  getAccounts: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/accounts?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getBankAndCashAccounts: async () => {
    const res = await fetch(`${API_BASE}/accounts/banks-cash`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getAccountLedger: async (id, params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/accounts/${id}/ledger?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createAccount: async (data) => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateAccount: async (id, data) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteAccount: async (id) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  transferFunds: async (data) => {
    const res = await fetch(`${API_BASE}/accounts/transfer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  receiveAmountInLedger: async (data) => {
    const res = await fetch(`${API_BASE}/accounts/receive-amount`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  payAmountFromLedger: async (data) => {
    const res = await fetch(`${API_BASE}/accounts/pay-amount`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // 2. Security Cheques
  getSecurityCheques: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/security-cheques?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createSecurityCheque: async (data) => {
    const res = await fetch(`${API_BASE}/security-cheques`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateChequeStatus: async (id, data) => {
    const res = await fetch(`${API_BASE}/security-cheques/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateSecurityCheque: async (id, data) => {
    const res = await fetch(`${API_BASE}/security-cheques/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteSecurityCheque: async (id) => {
    const res = await fetch(`${API_BASE}/security-cheques/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // 3. Installments Management
  getInstallmentPlans: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/installments?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getInstallmentPlanById: async (id) => {
    const res = await fetch(`${API_BASE}/installments/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createInstallmentPlan: async (data) => {
    const res = await fetch(`${API_BASE}/installments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  recordInstallmentPayment: async (planId, data) => {
    const res = await fetch(`${API_BASE}/installments/${planId}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateInstallmentPlan: async (id, data) => {
    const res = await fetch(`${API_BASE}/installments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteInstallmentPlan: async (id) => {
    const res = await fetch(`${API_BASE}/installments/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // 4. Financial Audit Trail & Chassis Multi-Sale Tracker
  getAuditTrail: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/audit-trail?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getChassisMultiSaleTracker: async (chassisNumber) => {
    const res = await fetch(`${API_BASE}/audit-trail/chassis/${encodeURIComponent(chassisNumber)}`, { 
      headers: getHeaders() 
    });
    return handleResponse(res);
  },

  // 5. Sold Cars & Multi-Owner Buyback Lifecycle Registry
  getSoldCars: async (params = {}) => {
    const query = cleanParams(params);
    const res = await fetch(`${API_BASE}/sold-cars?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getVehicleHistory: async (chassisNumber) => {
    const res = await fetch(`${API_BASE}/sold-cars/${encodeURIComponent(chassisNumber)}/history`, { 
      headers: getHeaders() 
    });
    return handleResponse(res);
  },

  recordVehicleBuyback: async (data) => {
    const res = await fetch(`${API_BASE}/sold-cars/buyback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // 6. Live Financial Notifications
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
    return handleResponse(res);
  },

  markNotificationAsRead: async (id) => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  markAllNotificationsAsRead: async () => {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  deleteNotification: async (id) => {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};



