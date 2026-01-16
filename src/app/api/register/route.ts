import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { hash as hashPassword } from '@node-rs/bcrypt';
import type { Prisma } from '@prisma/client';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';
// export const maxDuration = 60; // Reverted as it might cause CloudFront/Amplify 403 issues on some plans


// 허용된 공개 가입 역할 (SUPER_ADMIN 은 seed 또는 내부 승격 전용)
const ALLOWED_PUBLIC_ROLES = ['USER', 'INVESTIGATOR', 'ENTERPRISE'] as const;

type PublicRole = (typeof ALLOWED_PUBLIC_ROLES)[number];

interface BasePayload {
  email: string;
  password: string;
  name: string;
  role?: PublicRole;
}

interface InvestigatorPayload extends BasePayload {
  specialties?: unknown;
  licenseNumber?: string | null;
  experienceYears?: number;
  serviceArea?: string | null;
  serviceAreas?: unknown;
  officeAddress?: string | null;
  introduction?: string | null;
  portfolioUrl?: string | null;
  contactPhone?: string | null;
  agencyPhone?: string | null;
  pledgeUrl?: string | null;
  acceptsTerms?: boolean;
  acceptsPrivacy?: boolean;
}

interface EnterprisePayload extends BasePayload {
  companyName?: string;
  businessNumber?: string | null;
  contactPhone?: string | null;
  sizeCode?: string | null;
  note?: string | null;
}
interface CustomerPayload extends BasePayload {
  displayName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  occupation?: string | null;
  region?: string | null;
  preferredCaseTypes?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgencyLevel?: string | null;
  securityQuestion?: string | null;
  securityAnswer?: string | null;
  acceptsTerms?: boolean;
  acceptsPrivacy?: boolean;
  marketingOptIn?: boolean;
}


export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[API:${requestId}] POST /api/register - Started`);
  
  try {
    // 모든 예외 상황에서 JSON만 반환하도록 보장
    try {
      console.log(`[API:${requestId}] Parsing request body...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any;
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('multipart/form-data')) {
        console.log(`[API:${requestId}] Handling multipart data...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData = await req.formData() as any;
        body = {};
        // Extract all form fields
        const keys = ['role', 'email', 'password', 'name', 'licenseNumber', 'specialties', 
                      'experienceYears', 'serviceAreas', 'serviceArea', 'officeAddress', 'introduction', 
                      'portfolioUrl', 'contactPhone', 'agencyPhone', 'pledgeUrl', 'acceptsTerms', 'acceptsPrivacy',
                      'businessLicense', 'pledgeFile', 'displayName', 'phone', 'birthDate', 'gender',
                      'occupation', 'region', 'preferredCaseTypes', 'budgetMin', 'budgetMax',
                      'urgencyLevel', 'securityQuestion', 'securityAnswer', 'marketingOptIn'];
        
        for (const key of keys) {
          const value = formData.get(key);
          if (value !== null) {
            body[key] = value;
          }
        }
        
        console.log(`[API:${requestId}] FormData extracted. Processing files...`);
        
        // Handle file upload
        const file = body.businessLicense;
        if (file && typeof file === 'object' && 'name' in file) {
          const fileObj = file as File;
          console.log(`[API:${requestId}] Processing businessLicense: ${fileObj.name} (${fileObj.size} bytes)`);
          const buffer = Buffer.from(await fileObj.arrayBuffer());
          const base64Data = buffer.toString('base64');
          const mimeType = fileObj.type || 'application/octet-stream';
          // Store Data URI in a separate property to be used during creation
          body.businessLicenseData = `data:${mimeType};base64,${base64Data}`;
          // Set URL to a placeholder, will be updated or used as a flag
          body.businessLicenseUrl = `/api/files/download?type=license`; 
        }
        
        const pledgeFile = body.pledgeFile;
        if (pledgeFile && typeof pledgeFile === 'object' && 'name' in pledgeFile) {
          const fileObj = pledgeFile as File;
          console.log(`[API:${requestId}] Processing pledgeFile: ${fileObj.name} (${fileObj.size} bytes)`);
          const buffer = Buffer.from(await fileObj.arrayBuffer());
          const base64Data = buffer.toString('base64');
          const mimeType = fileObj.type || 'application/octet-stream';
          body.pledgeData = `data:${mimeType};base64,${base64Data}`;
          body.pledgeUrl = `/api/files/download?type=pledge`;
        }
        
        // Parse JSON strings back to objects
        if (body.specialties && typeof body.specialties === 'string') {
          body.specialties = JSON.parse(body.specialties);
        }
        if (body.serviceAreas && typeof body.serviceAreas === 'string') {
          body.serviceAreas = JSON.parse(body.serviceAreas);
        }
        if (body.acceptsTerms) body.acceptsTerms = body.acceptsTerms === 'true';
        if (body.acceptsPrivacy) body.acceptsPrivacy = body.acceptsPrivacy === 'true';
        if (body.marketingOptIn) body.marketingOptIn = body.marketingOptIn === 'true';
        if (body.experienceYears) body.experienceYears = Number(body.experienceYears);
        if (body.budgetMin) body.budgetMin = Number(body.budgetMin);
        if (body.budgetMax) body.budgetMax = Number(body.budgetMax);
        
        console.log(`[API:${requestId}] Body preparation complete.`);
      } else {
        body = await req.json();
      }
      
    try {
      console.log(`[API:${requestId}] Body parsed. Size check...`);
      // Just log body size roughly
      const bodySize = JSON.stringify(body).length;
      console.log(`[API:${requestId}] Approx Body Size: ${bodySize} bytes`);
      
      const { email, password, name } = body as BasePayload;
      let { role } = body as BasePayload;
      if (!email || !password || !name) {
        return NextResponse.json({ error: '이메일/비밀번호/이름은 필수입니다.' }, { status: 400 });
      }

    // 기본 역할 USER
    if (!role) role = 'USER';
    if (!ALLOWED_PUBLIC_ROLES.includes(role as PublicRole)) {
      return NextResponse.json({ error: '허용되지 않은 역할입니다.' }, { status: 400 });
    }

  console.log(`[API:${requestId}] Getting Prisma client...`);
  
  // Initialize Prisma Client with Timeout (Check for SSM Hangs)
  let prisma;
  try {
    const initPromise = getPrismaClient();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PRISMA_INIT_TIMEOUT')), 4000)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma = await Promise.race([initPromise, timeoutPromise]) as any;
    console.log(`[API:${requestId}] Prisma client obtained.`);
  } catch (initErr) {
    console.error(`[API:${requestId}] Prisma Init Failed:`, initErr);
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    if (msg.includes('PRISMA_INIT_TIMEOUT')) {
      return NextResponse.json({ 
        error: '서버 초기화 시간이 초과되었습니다. (Prisma Init Timeout)',
        details: 'AWS SSM 파라미터 가져오기 및 DB 클라이언트 생성 단계에서 응답이 없습니다. (네트워크/VPC 설정 확인 필요)'
      }, { status: 504 });
    }
    return NextResponse.json({
      error: '서버 내부 오류가 발생했습니다. (Prisma Init Failed)',
      details: msg
    }, { status: 500 });
  }

  // Check connectivity with a quick query and STRICT timeout
  try {
    const connectionPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DB_CONNECTION_TIMEOUT')), 5000)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.race([connectionPromise, timeoutPromise]) as any;
    
    console.log(`[API:${requestId}] DB Connection OK.`);
  } catch (dbErr) {
    console.error(`[API:${requestId}] DB Connection Failed:`, dbErr);
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    if (msg.includes('DB_CONNECTION_TIMEOUT')) {
      return NextResponse.json({ 
        error: '데이터베이스 연결 시간이 초과되었습니다. (DB Connection Timeout)',
        details: '서버가 데이터베이스에 접근할 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.'
      }, { status: 503 });
    }
    return NextResponse.json({ 
      error: '데이터베이스 연결에 실패했습니다.',
      details: msg
    }, { status: 500 });
  }

  console.log(`[API:${requestId}] Checking for existing user...`);
  const existingUser = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existingUser) {
      console.log(`[API:${requestId}] User already exists.`);
      return NextResponse.json({ error: '이미 사용중인 이메일입니다.' }, { status: 409 });
    }

  console.log(`[API:${requestId}] Hashing password...`);
  const hashedPassword = await hashPassword(password, 10);

    // 역할별 검증 & 데이터 구성
    if (role === 'INVESTIGATOR') {
      const {
        specialties,
        licenseNumber,
        experienceYears,
        serviceArea,
        serviceAreas,
        officeAddress,
        introduction,
        portfolioUrl,
        contactPhone,
        agencyPhone,
        acceptsTerms,
        acceptsPrivacy,
      } = body as InvestigatorPayload;

      if (!acceptsTerms || !acceptsPrivacy) {
        return NextResponse.json({ error: '약관 및 개인정보 동의는 필수입니다.' }, { status: 400 });
      }

      const specialtyList = Array.isArray(specialties) ? specialties : [];
      const sanitizedSpecialties = specialtyList
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());

      if (sanitizedSpecialties.length === 0) {
        return NextResponse.json({ error: '민간조사원은 최소 1개 이상의 전문분야(specialties)가 필요합니다.' }, { status: 400 });
      }

      if (!contactPhone || typeof contactPhone !== 'string' || contactPhone.trim().length < 6) {
        return NextResponse.json({ error: '민간조사원은 연락 가능한 휴대폰 번호를 입력해야 합니다.' }, { status: 400 });
      }

      const years = Number.isFinite(experienceYears as number) ? Number(experienceYears) : 0;
      if (years < 0) {
        return NextResponse.json({ error: 'experienceYears 는 0 이상의 숫자여야 합니다.' }, { status: 400 });
      }

      const serviceAreaList = Array.isArray(serviceAreas) ? serviceAreas : [];
      const sanitizedServiceAreas = serviceAreaList
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
      const normalizedServiceArea =
        typeof serviceArea === 'string' && serviceArea.trim().length > 0
          ? serviceArea.trim()
          : sanitizedServiceAreas.join(', ');

      const now = new Date();
      console.log(`[API:${requestId}] Starting Transaction for INVESTIGATOR...`);
      
      // Transaction with timeout
      // Prisma 타입 캐싱 지연으로 delegate 접근 인식 문제 발생 시 ts-ignore 처리
      const result = await Promise.race([
        prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const user = await tx.user.create({
            data: { email, name, password: hashedPassword, role: 'INVESTIGATOR' },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const businessLicenseData = (body as any).businessLicenseData as string | undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pledgeData = (body as any).pledgeData as string | undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const businessLicenseUrlBase = (body as any).businessLicenseUrl;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pledgeUrlBase = (body as any).pledgeUrl;
  
          void businessLicenseUrlBase;
          void pledgeUrlBase;
  
          // Create profile WITHOUT large data first to be fast
          const profile = await tx.investigatorProfile.create({
            data: {
              userId: user.id,
              specialties: sanitizedSpecialties,
              licenseNumber: licenseNumber ?? null,
              experienceYears: years,
              contactPhone: contactPhone?.trim() ?? null,
              agencyPhone: agencyPhone?.trim() ?? null,
              serviceArea: normalizedServiceArea || null,
              officeAddress: officeAddress?.trim() ?? null,
              introduction: introduction ?? null,
              portfolioUrl: portfolioUrl ?? null,
              // 파일 URL에는 userId를 쿼리 파라미터로 추가하여 다운로드 API에서 식별하도록 함
              businessLicenseUrl: businessLicenseUrlBase ? `${businessLicenseUrlBase}&userId=${user.id}` : null,
              pledgeUrl: pledgeUrlBase ? `${pledgeUrlBase}&userId=${user.id}` : null,
              // Skip large blobs in initial create
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
            },
          });
          
          return { user, profile, businessLicenseData, pledgeData };
        }, {
           maxWait: 10000, 
           timeout: 20000 
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TRANSACTION_TIMEOUT')), 50000))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any;

      // Update large data separately if present (to avoid transaction lock/timeout issues)
      if (result.businessLicenseData || result.pledgeData) {
        console.log(`[API:${requestId}] Updating LOB data...`);
        try {
          await prisma.investigatorProfile.update({
            where: { id: result.profile.id },
            data: {
                businessLicenseData: result.businessLicenseData ?? undefined,
                pledgeData: result.pledgeData ?? undefined
            }
          });
          console.log(`[API:${requestId}] LOB data updated.`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (lobErr) {
           console.error(`[API:${requestId}] Failed to save file data (non-fatal):`, lobErr);
           // We do NOT rollback user creation here, but user might need to re-upload documents later.
        }
      }
      
      console.log(`[API:${requestId}] Transaction Complete.`);
      
      const { password: removedPassword, ...userSanitized } = result.user;
      void removedPassword;
      const token = signToken({ userId: Number(result.user.id), role: result.user.role });
      return NextResponse.json(
        {
          ...userSanitized,
          investigator: result.profile,
          investigatorStatus: result.profile.status,
          token,
        },
        { status: 201 },
      );
    }

    if (role === 'ENTERPRISE') {
      const { companyName, businessNumber, contactPhone, sizeCode, note } = body as EnterprisePayload;
      if (!companyName) {
        return NextResponse.json({ error: '기업 가입에는 companyName 이 필요합니다.' }, { status: 400 });
      }
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: { email, name, password: hashedPassword, role: 'ENTERPRISE' },
        });
        const organizationWithMembers = await tx.organization.create({
          data: {
            name: companyName,
            businessNumber: businessNumber ?? null,
            contactName: name,
            contactPhone: contactPhone ?? null,
            sizeCode: sizeCode ?? null,
            note: note ?? null,
            ownerId: user.id,
            members: {
              create: {
                userId: user.id,
                role: 'OWNER',
              },
            },
          },
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        });
        const { members: memberList, ...organization } = organizationWithMembers;
        const membership = memberList[0];
        if (!membership) {
          throw new Error('FAILED_TO_CREATE_ORG_OWNER');
        }
        return { user, organization, membership };
      });
      const { password: removedPassword, ...userSanitized } = result.user;
      void removedPassword;
      const token = signToken({ userId: Number(result.user.id), role: result.user.role });
      return NextResponse.json(
        {
          ...userSanitized,
          organization: result.organization,
          membership: {
            id: result.membership.id,
            role: result.membership.role,
            organizationId: result.membership.organizationId,
            userId: result.membership.userId,
            invitedById: result.membership.invitedById,
            createdAt: result.membership.createdAt,
            updatedAt: result.membership.updatedAt,
          },
          token,
        },
        { status: 201 },
      );
    }

    // 기본 USER 가입 (고객 프로필 확장)
  const customerPayload = body as CustomerPayload;
  if (!customerPayload.acceptsTerms || !customerPayload.acceptsPrivacy) {
      return NextResponse.json({ error: '약관 및 개인정보 동의는 필수입니다.' }, { status: 400 });
    }

    if ((customerPayload.securityQuestion && !customerPayload.securityAnswer) || (!customerPayload.securityQuestion && customerPayload.securityAnswer)) {
      return NextResponse.json({ error: '보안 질문과 답변은 함께 입력해야 합니다.' }, { status: 400 });
    }

    let birthDate: Date | null = null;
    if (customerPayload.birthDate) {
      const parsed = new Date(customerPayload.birthDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'birthDate 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      birthDate = parsed;
    }

    const preferredCaseTypes = Array.isArray(customerPayload.preferredCaseTypes)
      ? customerPayload.preferredCaseTypes.filter((item) => typeof item === 'string')
      : [];

    const budgetMin = customerPayload.budgetMin != null ? Number(customerPayload.budgetMin) : null;
    const budgetMax = customerPayload.budgetMax != null ? Number(customerPayload.budgetMax) : null;
    if (budgetMin != null && Number.isNaN(budgetMin)) {
      return NextResponse.json({ error: 'budgetMin 은 숫자여야 합니다.' }, { status: 400 });
    }
    if (budgetMax != null && Number.isNaN(budgetMax)) {
      return NextResponse.json({ error: 'budgetMax 는 숫자여야 합니다.' }, { status: 400 });
    }

    let securityAnswerHash: string | null = null;
    if (customerPayload.securityAnswer) {
      securityAnswerHash = await hashPassword(customerPayload.securityAnswer, 10);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER',
        },
      });
      const profile = await tx.customerProfile.create({
        data: {
          userId: user.id,
          displayName: customerPayload.displayName ?? null,
          phone: customerPayload.phone ?? null,
          birthDate,
          gender: customerPayload.gender ?? null,
          occupation: customerPayload.occupation ?? null,
          region: customerPayload.region ?? null,
          preferredCaseTypes,
          budgetMin,
          budgetMax,
          urgencyLevel: customerPayload.urgencyLevel ?? null,
          securityQuestion: customerPayload.securityQuestion ?? null,
          securityAnswerHash,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          marketingOptIn: Boolean(customerPayload.marketingOptIn),
        },
      });
      return { user, profile };
    });

    const { password: removedPassword, ...userWithoutPassword } = result.user;
    void removedPassword;
    const token = signToken({ userId: Number(result.user.id), role: result.user.role });
    return NextResponse.json({ ...userWithoutPassword, customerProfile: result.profile, token }, { status: 201 });
  } catch (fatal) {
    // 정말로 빠져나가는 예외도 JSON으로 반환
    console.error('[API] FATAL error in /api/register:', fatal);
    return NextResponse.json({ error: '서버 내부 오류', details: process.env.NODE_ENV === 'development' ? (fatal instanceof Error ? fatal.message : String(fatal)) : undefined }, { status: 500 });
  }
}
