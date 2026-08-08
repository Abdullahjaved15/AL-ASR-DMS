const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function inspectStockPdf() {
  const stockPdfPath = path.join(__dirname, '..', '..', 'Stock.pdf');
  if (!fs.existsSync(stockPdfPath)) {
    console.log('Stock.pdf not found in workspace root!');
    return;
  }

  console.log('==============================================');
  console.log('INSPECTING STOCK.PDF CONTENT');
  console.log('==============================================');

  const fileBuf = new Uint8Array(fs.readFileSync(stockPdfPath));
  const pdfInstance = new PDFParse(fileBuf);
  await pdfInstance.load();
  const pdfTextResult = await pdfInstance.getText();
  const rawText = pdfTextResult.text || '';
  const lines = rawText.split('\n');

  console.log(`Total lines in Stock.pdf: ${lines.length}`);

  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const tabParts = line.split('\t').map(p => p.trim());
    const spaceParts = line.split(/\s{2,}/).map(p => p.trim());

    count++;
    if (count <= 25) {
      console.log(`\nLine #${count}:`);
      console.log(`  Raw: "${line}"`);
      console.log(`  Tab parts (${tabParts.length}):`, tabParts);
      console.log(`  Space parts (${spaceParts.length}):`, spaceParts);
    }
  }
}

inspectStockPdf().catch(console.error);
