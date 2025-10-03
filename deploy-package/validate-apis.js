const fs = require('fs');
const path = require('path');

function validateAPIRoutes() {
  console.log('🔍 API 라우트 검증 시작...\n');

  const apiDir = path.join(__dirname, 'src', 'app', 'api');
  const requiredAPIs = [
    'register/route.ts',
    'login/route.ts', 
    'investigators/route.ts',
    'chat-gpt/route.ts',
    'scenarios/route.ts',
    'test-db/route.ts',
    'health/deployment/route.ts'
  ];

  let allValid = true;

  requiredAPIs.forEach(apiPath => {
    const fullPath = path.join(apiDir, apiPath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${apiPath} - 존재함`);
      
      // 파일 내용 검증
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // 기본 검증 항목들
      const checks = [
        { name: 'export function', pattern: /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE)/ },
        { name: 'NextResponse import', pattern: /import.*NextResponse.*from.*next\/server/ },
        { name: 'dynamic export', pattern: /export\s+const\s+dynamic\s*=\s*['"']force-dynamic['"']/ }
      ];

      checks.forEach(check => {
        if (check.pattern.test(content)) {
          console.log(`  ✅ ${check.name}`);
        } else if (check.name === 'dynamic export') {
          console.log(`  ⚠️ ${check.name} - 누락 (권장사항)`);
        } else {
          console.log(`  ❌ ${check.name} - 누락`);
          allValid = false;
        }
      });
    } else {
      console.log(`❌ ${apiPath} - 누락`);
      allValid = false;
    }
    console.log();
  });

  return allValid;
}

function validateEnvironmentFiles() {
  console.log('🔍 환경 파일 검증...\n');

  const files = [
    { name: '.env', required: true },
    { name: '.env.example', required: false },
    { name: 'prisma/schema.prisma', required: true }
  ];

  let allValid = true;

  files.forEach(file => {
    const filePath = path.join(__dirname, file.name);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file.name} - 존재함`);
    } else if (file.required) {
      console.log(`❌ ${file.name} - 필수 파일 누락`);
      allValid = false;
    } else {
      console.log(`⚠️ ${file.name} - 선택 파일 누락`);
    }
  });

  return allValid;
}

function validatePackageJson() {
  console.log('\n🔍 package.json 검증...\n');

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    const requiredDeps = [
      'next',
      '@prisma/client',
      'prisma',
      '@node-rs/bcrypt',
      'jsonwebtoken'
    ];

    let allValid = true;

    requiredDeps.forEach(dep => {
      if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
        console.log(`✅ ${dep} - 설치됨`);
      } else {
        console.log(`❌ ${dep} - 누락`);
        allValid = false;
      }
    });

    return allValid;
  } catch (error) {
    console.log('❌ package.json 읽기 실패');
    return false;
  }
}

// 전체 검증 실행
async function runValidation() {
  console.log('🚀 LIRA 시스템 검증 시작...\n');

  const results = [
    { name: 'API 라우트', result: validateAPIRoutes() },
    { name: '환경 파일', result: validateEnvironmentFiles() },
    { name: '패키지 의존성', result: validatePackageJson() }
  ];

  console.log('\n📊 검증 결과:');
  results.forEach(({ name, result }) => {
    console.log(`${result ? '✅' : '❌'} ${name}: ${result ? '통과' : '실패'}`);
  });

  const allPassed = results.every(r => r.result);
  
  if (allPassed) {
    console.log('\n🎉 모든 검증 통과! 시스템 준비 완료');
    return true;
  } else {
    console.log('\n🔧 일부 검증 실패. 수정이 필요합니다.');
    return false;
  }
}

runValidation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('검증 실행 오류:', error);
  process.exit(1);
});