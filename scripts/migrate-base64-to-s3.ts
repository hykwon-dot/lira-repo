import { PrismaClient } from '@prisma/client';
import { uploadBase64ToS3 } from '../src/lib/s3';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting Base64 to S3 migration (including Avatars)...');

  try {
    // 1. Base64 데이터가 하나라도 있는 조사원 프로필 조회
    const profiles = await prisma.investigatorProfile.findMany({
      where: {
        OR: [
          { businessLicenseData: { not: null } },
          { pledgeData: { not: null } },
          { termsData: { not: null } },
          { idCardData: { not: null } },
          { avatarUrl: { startsWith: 'data:' } } // 아바타가 Base64인 경우 추가
        ]
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    console.log(`Found ${profiles.length} profiles to migrate.`);

    for (const profile of profiles) {
      console.log(`\nProcessing Investigator: ${profile.user.name} (${profile.user.email}) [ID: ${profile.id}]`);
      
      const updateData: any = {};
      
      // A. 일반 증빙 서류 필드 처리
      const docFields = [
        { data: 'businessLicenseData', url: 'businessLicenseUrl', prefix: 'license', folder: 'documents' },
        { data: 'pledgeData', url: 'pledgeUrl', prefix: 'pledge', folder: 'documents' },
        { data: 'termsData', url: 'termsUrl', prefix: 'terms', folder: 'documents' },
        { data: 'idCardData', url: 'idCardUrl', prefix: 'idcard', folder: 'documents' }
      ] as const;

      for (const field of docFields) {
        const base64Data = (profile as any)[field.data];
        if (base64Data && base64Data.startsWith('data:')) {
          try {
            console.log(`  - Uploading ${field.data} to S3...`);
            const fileName = `${field.prefix}_${profile.userId}`;
            const s3Url = await uploadBase64ToS3(base64Data, fileName, field.folder as any, false);
            updateData[field.url] = s3Url;
            updateData[field.data] = null;
            console.log(`    ✅ Success: ${s3Url}`);
          } catch (e) {
            console.error(`    ❌ Failed to upload ${field.data}:`, e);
          }
        }
      }

      // B. 아바타(avatarUrl) 필드 처리
      if (profile.avatarUrl && profile.avatarUrl.startsWith('data:')) {
        try {
          console.log(`  - Uploading avatarUrl (Base64) to S3...`);
          const fileName = `avatar_${profile.userId}`;
          // 아바타는 공개(public) 폴더에 저장하며, isPublic=true 설정
          const s3Url = await uploadBase64ToS3(profile.avatarUrl, fileName, 'profiles', true);
          updateData['avatarUrl'] = s3Url;
          console.log(`    ✅ Success: ${s3Url}`);
        } catch (e) {
          console.error(`    ❌ Failed to upload avatarUrl:`, e);
        }
      }

      // DB 업데이트
      if (Object.keys(updateData).length > 0) {
        await prisma.investigatorProfile.update({
          where: { id: profile.id },
          data: updateData
        });
        console.log(`  🎉 Profile updated successfully.`);
      } else {
        console.log(`  ℹ️ No new Base64 data to process for this profile.`);
      }
    }

    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('CRITICAL ERROR during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
