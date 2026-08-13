const { execSync } = require('child_process');
const path = require('path');

// Ensure DATABASE_URL exists during build phase so Prisma generate never fails
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/alasr_dms?schema=public';

console.log('📦 Starting Render production build script...');

try {
  const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
  console.log(`🔨 Generating Prisma Client using schema at: ${schemaPath}`);
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit', env: process.env });
  console.log('✅ Prisma Client generated successfully!');
} catch (error) {
  console.warn('⚠️ Warning: Prisma Client generation notice:', error.message);
}
