const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function inspectStockPdf() {
  const stockPdfPath = path.join(__dirname, '..', '..', 'Stock.pdf');
  if (!fs.existsSync(stockPdfPath)) {
    console.error(`Stock.pdf not found at: ${stockPdfPath}`);
    return;
  }

  const fileBuf = new Uint8Array(fs.readFileSync(stockPdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');

  console.log(`Total lines in Stock.pdf: ${lines.length}`);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed) {
      console.log(`[Line ${i+1}] ${trimmed}`);
    }
  }
}

inspectStockPdf().catch(console.error);
