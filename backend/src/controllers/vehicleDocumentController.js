const prisma = require('../config/db');

const getVehicleDocuments = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const documents = await prisma.vehicleDocument.findMany({
      where: { sellerId },
      orderBy: { uploadedAt: 'desc' }
    });
    return res.json(documents);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch vehicle documents', error: error.message });
  }
};

const addVehicleDocument = async (req, res) => {
  try {
    const { sellerId, documentType, documentName, fileUrl } = req.body;

    if (!sellerId || !documentName || !fileUrl) {
      return res.status(400).json({ message: 'Seller ID, Document Name, and File URL are required' });
    }

    const doc = await prisma.vehicleDocument.create({
      data: {
        sellerId,
        documentType: documentType || 'Other',
        documentName,
        fileUrl
      }
    });

    return res.status(201).json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to attach vehicle document', error: error.message });
  }
};

const deleteVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicleDocument.delete({ where: { id } });
    return res.json({ message: 'Vehicle document deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete vehicle document', error: error.message });
  }
};

module.exports = { getVehicleDocuments, addVehicleDocument, deleteVehicleDocument };
