const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function main() {
  const pdfPath = path.join(__dirname, '..', '..', 'AL ASR MOTORS - Showroom Current Stock (Fri, Sep 4, 2026).pdf');
  const fileBuf = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  const lines = pdfTextResult.text.split('\n');
  console.log(`Total lines: ${lines.length}`);
  lines.forEach((l, idx) => console.log(`${idx}: ${l}`));
}

main().catch(console.error);
