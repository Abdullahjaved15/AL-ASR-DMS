const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo.png');
const outPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'utils', 'logoBase64.js');

const logoBuf = fs.readFileSync(logoPath);
const base64Str = logoBuf.toString('base64');
const fileContent = `export const logoBase64 = "data:image/png;base64,${base64Str}";\n`;

fs.writeFileSync(outPath, fileContent);
console.log('🎉 Successfully created frontend/src/utils/logoBase64.js with base64 logo!');
