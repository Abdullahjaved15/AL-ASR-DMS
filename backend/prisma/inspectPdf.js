const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfPath = path.join(__dirname, '..', '..', 'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf');

async function inspect() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(dataBuffer);
    const parser = new PDFParse(uint8Array);
    const res = await parser.getText();
    console.log('Result keys:', Object.keys(res));
    console.log('Sample text:', typeof res.text, (res.text || JSON.stringify(res)).substring(0, 1500));
  } catch (err) {
    console.error('Error parsing PDF:', err);
  }
}

inspect();
