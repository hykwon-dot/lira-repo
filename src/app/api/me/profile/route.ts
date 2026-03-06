import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authz';
import { getPrismaClient } from '@/lib/prisma';
import { InvestigatorStatus } from '@prisma/client';
import type { Prisma, User, InvestigatorProfile } from '@prisma/client';
import path from 'path';
import { promises as fs } from 'fs';
import { uploadBase64ToS3, uploadToS3 } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AVATAR_MAX_SIZE = 10 * 1024 * 1024; // Increased to 10MB for S3
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

async function deleteLocalAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/investigators/')) {
    return;
  }
  const filePath = path.join(process.cwd(), 'public', avatarUrl);
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error('[AVATAR_DELETE_ERROR]', error);
    }
  }
}

function sanitizeUser(user: User | null): Omit<User, 'password'> | null {
  if (!user) return null;
  const { password: removedPassword, ...safe } = user;
  void removedPassword;
  return safe;
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeSpecialties(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const filtered = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
  return filtered.length ? filtered : undefined;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const prisma = await getPrismaClient();

  if (user.role === 'INVESTIGATOR') {
    const profile = await prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({
      user: sanitizeUser(user),
      role: user.role,
      investigatorStatus: profile.status as InvestigatorStatus,
      profile: {
        id: profile.id,
        licenseNumber: profile.licenseNumber,
        experienceYears: profile.experienceYears,
        specialties: profile.specialties,
        contactPhone: profile.contactPhone,
        serviceArea: profile.serviceArea,
        introduction: profile.introduction,
        portfolioUrl: profile.portfolioUrl,
        avatarUrl: profile.avatarUrl,
        businessLicenseUrl: profile.businessLicenseUrl,
        pledgeUrl: profile.pledgeUrl,
        termsUrl: profile.termsUrl,
        idCardUrl: profile.idCardUrl,
        termsAcceptedAt: serializeDate(profile.termsAcceptedAt ?? null),
        privacyAcceptedAt: serializeDate(profile.privacyAcceptedAt ?? null),
        updatedAt: serializeDate(profile.updatedAt),
        createdAt: serializeDate(profile.createdAt),
      },
    });
  }

  if (user.role === 'USER') {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({
      user: sanitizeUser(user),
      role: user.role,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        phone: profile.phone,
        birthDate: serializeDate(profile.birthDate),
        gender: profile.gender,
        occupation: profile.occupation,
        region: profile.region,
        preferredCaseTypes: profile.preferredCaseTypes ?? [],
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        urgencyLevel: profile.urgencyLevel,
        marketingOptIn: Boolean(profile.marketingOptIn),
        updatedAt: serializeDate(profile.updatedAt),
        createdAt: serializeDate(profile.createdAt),
      },
    });
  }

  if (user.role === 'ENTERPRISE') {
    const [ownedOrganizations, memberships] = await Promise.all([
      prisma.organization.findMany({
        where: { ownerId: user.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.organizationMember.findMany({
        where: { userId: user.id },
        include: {
          organization: true,
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const ownedSerialized = ownedOrganizations.map((org) => ({
      id: org.id,
      name: org.name,
      businessNumber: org.businessNumber,
      contactName: org.contactName,
      contactPhone: org.contactPhone,
      sizeCode: org.sizeCode,
      note: org.note,
      ownerId: org.ownerId,
      createdAt: serializeDate(org.createdAt),
      updatedAt: serializeDate(org.updatedAt),
      members: org.members.map((member) => ({
        id: member.id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        invitedById: member.invitedById,
        createdAt: serializeDate(member.createdAt),
        updatedAt: serializeDate(member.updatedAt),
        user: member.user
          ? {
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              role: member.user.role,
            }
          : null,
      })),
    }));

    const membershipsSerialized = memberships.map((membership) => ({
      id: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      role: membership.role,
      invitedById: membership.invitedById,
      createdAt: serializeDate(membership.createdAt),
      updatedAt: serializeDate(membership.updatedAt),
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        businessNumber: membership.organization.businessNumber,
        contactName: membership.organization.contactName,
        contactPhone: membership.organization.contactPhone,
        sizeCode: membership.organization.sizeCode,
        note: membership.organization.note,
        ownerId: membership.organization.ownerId,
        createdAt: serializeDate(membership.organization.createdAt),
        updatedAt: serializeDate(membership.organization.updatedAt),
      },
      invitedBy: membership.invitedBy
        ? {
            id: membership.invitedBy.id,
            name: membership.invitedBy.name,
            email: membership.invitedBy.email,
          }
        : null,
    }));

    return NextResponse.json({
      user: sanitizeUser(user),
      role: user.role,
      profile: null,
      organizations: {
        owned: ownedSerialized,
        memberships: membershipsSerialized,
      },
    });
  }

  return NextResponse.json({ user: sanitizeUser(user), role: user.role, profile: null });
}

// Helper to handle both methods (POST/PATCH)
async function handleProfileUpdate(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const prisma = await getPrismaClient();

  const contentType = req.headers.get('content-type') || '';
  let payloadRecord: Record<string, unknown> = {};

  if (contentType.includes('application/json')) {
    try {
      const json = await req.json();
      payloadRecord = isRecord(json) ? json : {};
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        if (key === 'specialties' && typeof value === 'string') {
             try {
                 payloadRecord[key] = JSON.parse(value);
             } catch {
                 payloadRecord[key] = value.split(',').map(s => s.trim()).filter(Boolean);
             }
        } else {
             payloadRecord[key] = value;
        }
      });
      
      const file = formData.get('avatarFile');
      if (file && file instanceof Blob) {
           const buffer = Buffer.from(await file.arrayBuffer());
           const mimeType = file.type;
           const s3Url = await uploadToS3(buffer, `avatar_${user.id}`, "profiles", mimeType, true);
           payloadRecord['avatarUrl'] = s3Url;
      }
    } catch (e) {
      console.error('FormData parsing failed', e);
      return NextResponse.json({ error: 'FORM_DATA_ERROR' }, { status: 400 });
    }
  }

  if (user.role === 'INVESTIGATOR') {
    const existingProfile = await prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existingProfile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    const setNullableString = (field: string) => {
      const val = payloadRecord[field];
      if (typeof val === 'string') {
        updateData[field] = val.trim() || null;
      }
    };
    setNullableString('contactPhone');
    setNullableString('serviceArea');
    setNullableString('introduction');
    setNullableString('portfolioUrl');

    if (payloadRecord.experienceYears !== undefined) {
      const val = payloadRecord.experienceYears;
      if (val === null || val === '') {
        updateData.experienceYears = null;
      } else {
        const years = Number(val);
        if (!Number.isNaN(years) && years >= 0) {
          updateData.experienceYears = years;
        }
      }
    }

    const specialtiesRaw = payloadRecord.specialties;
    const normalizedSpecialties = normalizeSpecialties(specialtiesRaw);
    if (normalizedSpecialties) {
      updateData.specialties = normalizedSpecialties;
    } else if (Array.isArray(specialtiesRaw) && specialtiesRaw.length === 0) {
      updateData.specialties = [];
    }

    if (payloadRecord.removeAvatar === true || payloadRecord.removeAvatar === 'true') {
      updateData.avatarUrl = null;
    }
    
    // Direct S3 Upload for Base64 (Avatar)
    const avatarBase64 = payloadRecord.avatarBase64; 
    if (typeof avatarBase64 === 'string' && avatarBase64.startsWith('data:image/')) {
        updateData.avatarUrl = await uploadBase64ToS3(avatarBase64, `avatar_${user.id}`, "profiles", true);
    }

    // Direct S3 Upload for Documents
    const businessLicenseBase64 = payloadRecord.businessLicenseBase64;
    if (typeof businessLicenseBase64 === 'string' && businessLicenseBase64.startsWith('data:')) {
        updateData.businessLicenseUrl = await uploadBase64ToS3(businessLicenseBase64, `license_${user.id}`, "documents", false);
    }

    const pledgeFileBase64 = payloadRecord.pledgeFileBase64;
    if (typeof pledgeFileBase64 === 'string' && pledgeFileBase64.startsWith('data:')) {
        updateData.pledgeUrl = await uploadBase64ToS3(pledgeFileBase64, `pledge_${user.id}`, "documents", false);
    }

    // Handle Hex Data (WAF Bypass) - Convert to S3
    const handleHexUploadToS3 = async (hex: unknown, type: unknown, targetField: 'businessLicense' | 'pledge' | 'terms' | 'idCard') => {
        if (typeof hex === 'string' && hex.length > 0) {
            try {
                const buffer = Buffer.from(hex, 'hex');
                const mimeType = typeof type === 'string' ? type : 'image/jpeg';
                const s3Url = await uploadToS3(buffer, `${targetField}_${user.id}`, "documents", mimeType, false);
                
                if (targetField === 'businessLicense') updateData.businessLicenseUrl = s3Url;
                else if (targetField === 'pledge') updateData.pledgeUrl = s3Url;
                else if (targetField === 'terms') updateData.termsUrl = s3Url;
                else if (targetField === 'idCard') updateData.idCardUrl = s3Url;
            } catch (e) {
                console.error(`Failed to upload hex for ${targetField} to S3`, e);
            }
        }
    };

    await handleHexUploadToS3(payloadRecord.businessLicenseHex, payloadRecord.businessLicenseType, 'businessLicense');
    await handleHexUploadToS3(payloadRecord.pledgeFileHex, payloadRecord.pledgeFileType, 'pledge');
    await handleHexUploadToS3(payloadRecord.termsFileHex, payloadRecord.termsFileType, 'terms');
    await handleHexUploadToS3(payloadRecord.idCardFileHex, payloadRecord.idCardFileType, 'idCard');

    if (payloadRecord.avatarUrl) {
        updateData.avatarUrl = payloadRecord.avatarUrl;
    }

    const hasChanges = Object.keys(updateData).length > 0;
    if (!hasChanges) {
       return NextResponse.json({
          message: 'NO_CHANGES',
          profile: existingProfile,
          investigatorStatus: existingProfile.status as InvestigatorStatus,
        });
    }

    updateData.updatedAt = new Date();

    try {
      const updatedProfile = await prisma.investigatorProfile.update({
        where: { userId: user.id },
        data: updateData as Prisma.InvestigatorProfileUpdateInput,
      });
      
      return NextResponse.json({
        message: 'PROFILE_UPDATED',
        profile: updatedProfile,
        investigatorStatus: updatedProfile.status as InvestigatorStatus,
      });
    } catch (error) {
      console.error('[PROFILE_UPDATE_DB_ERROR]', error);
      return NextResponse.json({ error: 'DB_UPDATE_FAILED', details: (error as Error).message }, { status: 500 });
    }
  }
  
  return NextResponse.json({ user: sanitizeUser(user), role: user.role, profile: null });
}

export async function POST(req: NextRequest) {
  return handleProfileUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleProfileUpdate(req);
}

