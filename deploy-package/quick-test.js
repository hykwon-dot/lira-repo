const fs = require('fs');
const path = require('path');

console.log('=== LIRA Database Connection Debug ===\n');

// 1. .env 파일 존재 확인
const envPath = path.join(__dirname, '.env');
console.log('1. .env file check:');
console.log('   Path:', envPath);
console.log('   Exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('   Content preview:');
  lines.slice(0, 5).forEach((line, i) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      console.log(`   ${i + 1}. ${key}=***`);
    }
  });
}

// 2. 현재 환경 변수 확인
console.log('\n2. Current environment variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

// 3. package.json 확인
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('\n3. Package info:');
  console.log('   Name:', pkg.name);
  console.log('   Next.js version:', pkg.dependencies?.next || 'not found');
  console.log('   Prisma version:', pkg.dependencies?.prisma || pkg.devDependencies?.prisma || 'not found');
}

// 4. Prisma 스키마 확인
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
console.log('\n4. Prisma schema:');
console.log('   Path:', schemaPath);
console.log('   Exists:', fs.existsSync(schemaPath));

console.log('\n=== End Debug ===');