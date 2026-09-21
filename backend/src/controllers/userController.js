const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            assignedSellers: true,
            assignedBuyers: true,
            deals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(role && { role })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_USER_STATUS',
        details: `Updated user ${userToUpdate.name} status to ${status || userToUpdate.status}, role to ${role || userToUpdate.role}`
      }
    });

    return res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    const adminId = req.user.id;

    // Safely unassign/reassign references and delete user in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Unassign assigned sellers & buyers
      await tx.seller.updateMany({
        where: { assignedTo: id },
        data: { assignedTo: null }
      });
      await tx.buyer.updateMany({
        where: { assignedTo: id },
        data: { assignedTo: null }
      });

      // 2. Reassign created sellers & buyers to admin
      await tx.seller.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });
      await tx.buyer.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });

      // 3. Reassign invoices created by or approved by user
      await tx.invoice.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });
      await tx.invoice.updateMany({
        where: { approvedById: id },
        data: { approvedById: null }
      });

      // 4. Reassign financial & accounts records to admin
      await tx.transaction.updateMany({
        where: { createdById: id },
        data: { createdById: adminId }
      });
      await tx.account.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });
      await tx.securityCheque.updateMany({
        where: { createdById: id },
        data: { createdById: adminId }
      });
      await tx.installmentPlan.updateMany({
        where: { createdById: id },
        data: { createdById: adminId }
      });

      // 5. Reassign receiving letters & incentive sheets to admin
      await tx.receivingLetter.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });
      await tx.incentiveApprovalSheet.updateMany({
        where: { createdBy: id },
        data: { createdBy: adminId }
      });

      // 6. Unlink employee record if linked
      await tx.employee.updateMany({
        where: { userId: id },
        data: { userId: null }
      });

      // 7. Handle approval requests (reassign requester, unlink reviewer)
      await tx.approvalRequest.updateMany({
        where: { requestedById: id },
        data: { requestedById: adminId }
      });
      await tx.approvalRequest.updateMany({
        where: { reviewedById: id },
        data: { reviewedById: null }
      });

      // 8. Delete user activity logs & notifications
      await tx.activityLog.deleteMany({
        where: { userId: id }
      });
      await tx.notification.deleteMany({
        where: { userId: id }
      });

      // 9. Delete collaborations involving user
      await tx.collaboration.deleteMany({
        where: {
          OR: [
            { primarySalesmanId: id },
            { partnerSalesmanId: id }
          ]
        }
      });

      // 10. Delete deals associated with user
      await tx.deal.deleteMany({
        where: { salesmanId: id }
      });

      // 11. Delete the user
      await tx.user.delete({ where: { id } });

      // 12. Log admin activity
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DELETE_USER',
          details: `Deleted user ${userToDelete.name} (${userToDelete.email}, Role: ${userToDelete.role})`
        }
      });
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete user' });
  }
};

module.exports = { getAllUsers, updateUserStatus, deleteUser };
