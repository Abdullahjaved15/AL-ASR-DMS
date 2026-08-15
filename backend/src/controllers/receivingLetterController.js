const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to generate unique letter number (e.g. RL-20260807-4819)
const generateLetterNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RL-${dateStr}-${randomSuffix}`;
};

// Create a new Receiving Letter
const createReceivingLetter = async (req, res) => {
  try {
    const {
      date,
      vehicleName,
      chassisNumber,
      regNumber,
      color,
      ownerName,
      receiverName,
      fileStatus,
      keyStatus,
      smartCardStatus,
      anyOtherAccessory,
      notes
    } = req.body;

    if (!vehicleName || !ownerName || !receiverName) {
      return res.status(400).json({ error: 'Vehicle Name, Owner Name, and Receiver Name are required fields.' });
    }

    const letterNumber = generateLetterNumber();

    const newLetter = await prisma.receivingLetter.create({
      data: {
        letterNumber,
        date: date ? new Date(date) : new Date(),
        vehicleName,
        chassisNumber: chassisNumber || null,
        regNumber: regNumber || null,
        color: color || null,
        ownerName,
        receiverName,
        fileStatus: fileStatus || null,
        keyStatus: keyStatus || null,
        smartCardStatus: smartCardStatus || null,
        anyOtherAccessory: anyOtherAccessory || null,
        notes: notes || null,
        createdBy: req.user.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(newLetter);
  } catch (error) {
    console.error('Error creating receiving letter:', error);
    res.status(500).json({ error: 'Failed to create receiving letter', details: error.message });
  }
};

// Get all Receiving Letters with optional search filter
const getReceivingLetters = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { letterNumber: { contains: search, mode: 'insensitive' } },
        { vehicleName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { receiverName: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const letters = await prisma.receivingLetter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(letters);
  } catch (error) {
    console.error('Error fetching receiving letters:', error);
    res.status(500).json({ error: 'Failed to fetch receiving letters' });
  }
};

// Get single Receiving Letter by ID
const getReceivingLetterById = async (req, res) => {
  try {
    const { id } = req.params;
    const letter = await prisma.receivingLetter.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!letter) {
      return res.status(404).json({ error: 'Receiving letter not found' });
    }

    res.json(letter);
  } catch (error) {
    console.error('Error fetching receiving letter details:', error);
    res.status(500).json({ error: 'Failed to fetch receiving letter details' });
  }
};

// Update a Receiving Letter
const updateReceivingLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      vehicleName,
      chassisNumber,
      regNumber,
      color,
      ownerName,
      receiverName,
      fileStatus,
      keyStatus,
      smartCardStatus,
      anyOtherAccessory,
      notes
    } = req.body;

    if (!vehicleName || !ownerName || !receiverName) {
      return res.status(400).json({ error: 'Vehicle Name, Owner Name, and Receiver Name are required fields.' });
    }

    const updatedLetter = await prisma.receivingLetter.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        vehicleName,
        chassisNumber: chassisNumber || null,
        regNumber: regNumber || null,
        color: color || null,
        ownerName,
        receiverName,
        fileStatus: fileStatus || null,
        keyStatus: keyStatus || null,
        smartCardStatus: smartCardStatus || null,
        anyOtherAccessory: anyOtherAccessory || null,
        notes: notes || null
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(updatedLetter);
  } catch (error) {
    console.error('Error updating receiving letter:', error);
    res.status(500).json({ error: 'Failed to update receiving letter', details: error.message });
  }
};

// Delete a Receiving Letter
const deleteReceivingLetter = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.receivingLetter.delete({
      where: { id }
    });
    res.json({ message: 'Receiving letter deleted successfully' });
  } catch (error) {
    console.error('Error deleting receiving letter:', error);
    res.status(500).json({ error: 'Failed to delete receiving letter' });
  }
};

module.exports = {
  createReceivingLetter,
  getReceivingLetters,
  getReceivingLetterById,
  updateReceivingLetter,
  deleteReceivingLetter
};

