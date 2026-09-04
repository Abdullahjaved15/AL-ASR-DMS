const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dms_velocity_super_secret_jwt_key_2026';

const { formatPakistaniPhone } = require('../utils/phoneFormatter');

const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const formattedPhone = formatPakistaniPhone(phone);

    // If an Admin is creating a user, activate immediately. Otherwise self-registration stays PENDING for admin approval.
    const isAdminCreator = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
    const userRole = role && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_HEAD', 'ACCOUNTANT', 'SALESMAN'].includes(role.toUpperCase()) ? role.toUpperCase() : 'SALESMAN';
    const userStatus = isAdminCreator ? 'ACTIVE' : 'PENDING';

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: formattedPhone,
        password: hashedPassword,
        role: userRole,
        status: userStatus
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE_USER',
          details: `Created user ${newUser.name} (${newUser.email}) with role ${newUser.role}`
        }
      });
    }

    return res.status(201).json({
      message: userStatus === 'PENDING' 
        ? 'Registration successful! Your account is pending Admin approval.' 
        : 'User account created successfully.',
      user: newUser
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ message: 'Your account is pending approval by an administrator.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact management.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `User ${user.name} logged in successfully`
      }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    return res.json({ user: req.user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    let updatedPassword = user.password;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      updatedPassword = await bcrypt.hash(newPassword, 10);
    }

    const formattedPhone = phone !== undefined ? formatPakistaniPhone(phone) : user.phone;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        phone: formattedPhone,
        password: updatedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE',
        details: `User ${updatedUser.name} updated profile settings`
      }
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile };
