const prisma = require('../config/db');

// 1. Get Notifications & Unread Count for Current User / Role
const getNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    const roleConditions = [
      { targetRole: 'ALL' },
      { targetRole: userRole },
      { userId: userId }
    ];

    // Super Admin has oversight on all alerts
    if (userRole === 'SUPER_ADMIN') {
      roleConditions.push({ targetRole: 'ACCOUNTS_HEAD' });
      roleConditions.push({ targetRole: 'ADMIN' });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        OR: roleConditions
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = notifications.filter(
      n => !n.isRead && (!n.readBy || !n.readBy.includes(userId))
    ).length;

    return res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// 2. Mark Single Notification as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const currentReadBy = Array.isArray(existing.readBy) ? existing.readBy : [];
    const updatedReadBy = currentReadBy.includes(userId) ? currentReadBy : [...currentReadBy, userId];

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readBy: updatedReadBy
      }
    });

    return res.json({ message: 'Notification marked as read', notification: updated });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// 3. Mark All Notifications as Read
const markAllAsRead = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    const roleConditions = [
      { targetRole: 'ALL' },
      { targetRole: userRole },
      { userId: userId }
    ];

    if (userRole === 'SUPER_ADMIN') {
      roleConditions.push({ targetRole: 'ACCOUNTS_HEAD' });
    }

    await prisma.notification.updateMany({
      where: {
        OR: roleConditions,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
};

// 4. Delete Notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
