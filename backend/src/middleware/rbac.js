const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const hasPermission = allowedRoles.includes(req.user.role) ||
      (allowedRoles.includes('ADMIN') && req.user.role === 'SUPER_ADMIN');

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

module.exports = { requireRole };
