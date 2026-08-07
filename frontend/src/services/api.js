const API_BASE = '/api';

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

  deleteInvoice: async (id) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
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
  }
};
