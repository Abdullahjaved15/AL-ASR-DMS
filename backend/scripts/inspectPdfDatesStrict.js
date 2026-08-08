const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function inspectSellerPdfs() {
  const sellerPdfs = [
    'AL ASR Motors_ Inventory Management Sheet - Main Seller.pdf',
    'AL ASR Motors_ Inventory Management Sheet - Daily Seller.pdf'
  ];

  for (const file of sellerPdfs) {
    const filePath = path.join(__dirname, '..', '..', file);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n==============================================`);
    console.log(`INSPECTING SELLER PDF: ${file}`);
    console.log(`==============================================`);

    const fileBuf = new Uint8Array(fs.readFileSync(filePath));
    const pdfInstance = new PDFParse(fileBuf);
    await pdfInstance.load();
    const pdfTextResult = await pdfInstance.getText();
    const rawText = pdfTextResult.text || '';
    const lines = rawText.split('\n');

    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('\t').map(p => p.trim());
      if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
        count++;
        if (count <= 15) {
          console.log(`\nRow #${count} (Parts length: ${parts.length}):`);
          console.log(`  [0] Sr: "${parts[0]}"`);
          console.log(`  [1] Col 1 Date: "${parts[1]}"`);
          console.log(`  [2] Vehicle: "${parts[2]}"`);
          console.log(`  [3] Model: "${parts[3]}"`);
          // Find all date pattern matches in this line
          const dateMatches = line.match(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/g) || [];
          console.log(`  Date matches in row:`, dateMatches);
          console.log(`  Full line preview: ${line.substring(0, 150)}...`);
        }
      }
    }
    console.log(`Total data rows found in ${file}: ${count}`);
  }
}

inspectSellerPdfs().catch(console.error);
