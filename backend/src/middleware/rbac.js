const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const role = req.user.role;
    const hasPermission = 
      allowedRoles.includes(role) ||
      (allowedRoles.includes('ADMIN') && role === 'SUPER_ADMIN') ||
      (allowedRoles.includes('ACCOUNTANT') && (role === 'ACCOUNTS_HEAD' || role === 'SUPER_ADMIN')) ||
      (allowedRoles.includes('ACCOUNTS_HEAD') && role === 'SUPER_ADMIN');

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions for accounts and finance' });
    }

    next();
  };
};

// Accounts Head or Admin can edit/delete accounts, delete transactions, change COA
const requireAccountsHeadOrSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Forbidden: Only Accounts Head or Admin can perform edit/delete or structural actions.' 
  });
};

// Accounts Staff (Super Admin, Admin, Accounts Head, Accountant) can view & add records
const requireAccountsAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD', 'ACCOUNTANT'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Forbidden: Accounts section is restricted to Accounts staff and Admin only.' 
  });
};

module.exports = { 
  requireRole, 
  requireAccountsHeadOrSuperAdmin, 
  requireAccountsAccess 
};
