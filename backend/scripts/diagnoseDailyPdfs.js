const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function diagnoseDailyPdfs() {
  const dailyPdfs = [
    'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf',
    'AL ASR Motors_ Inventory Management Sheet - Daily Buyer.pdf'
  ];

  for (const pdfName of dailyPdfs) {
    const filePath = path.join(__dirname, '..', '..', pdfName);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${pdfName}`);
      continue;
    }

    console.log(`\n==============================================`);
    console.log(`DIAGNOSING DAILY PDF: ${pdfName}`);
    console.log(`==============================================`);

    const fileBuf = new Uint8Array(fs.readFileSync(filePath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    console.log(`Total lines extracted from ${pdfName}: ${lines.length}`);

    let validRows = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const tabParts = line.split('\t').map(p => p.trim());
      // Look for rows that start with a serial number or date
      if (tabParts.length >= 4) {
        validRows++;
        if (validRows <= 10) {
          console.log(`\nRow #${validRows}:`);
          console.log(`  Line text: ${line.substring(0, 140)}...`);
          console.log(`  Tab parts count: ${tabParts.length}`);
          console.log(`  Col [0]: "${tabParts[0]}" | Col [1]: "${tabParts[1]}" | Col [2]: "${tabParts[2]}" | Col [3]: "${tabParts[3]}"`);
        }
      }
    }
    console.log(`Total valid data rows in ${pdfName}: ${validRows}`);
  }
}

diagnoseDailyPdfs().catch(console.error);
