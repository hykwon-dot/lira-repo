import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authz';
import { getPrismaClient } from '@/lib/prisma';
import { InvestigatorStatus } from '@prisma/client';
import type { Prisma, User, InvestigatorProfile } from '@prisma/client';
import path from 'path';
import { promises as fs } from 'fs';
// import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// function getInvestigatorUploadsDir() {
//   return path.join(process.cwd(), 'public', 'uploads', 'investigators');
// }

// async function ensureUploadsDir() {
//   const dir = getInvestigatorUploadsDir();
//   await fs.mkdir(dir, { recursive: true });
//   return dir;
// }

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

  // Handle both JSON and FormData
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
      // Convert FormData to object for text fields
      formData.forEach((value, key) => {
        // Handle specialties as array from comma string if needed, but usually individual handling is better
        // For simplicity, we just copy strings. Arrays (like specialties) might need JSON parsing if sent as string.
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
      
      // Handle file separately
      const file = formData.get('avatarFile');
      if (file && file instanceof Blob) {
           const buffer = Buffer.from(await file.arrayBuffer());
           const mimeType = file.type;
           
           if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
                // Try to infer from validation or accept it if it's typical image
           }
           
           // Convert to Base64 for DB storage
           const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
           payloadRecord['avatarBase64'] = base64String;
      }
    } catch (e) {
      console.error('FormData parsing failed', e);
      return NextResponse.json({ error: 'FORM_DATA_ERROR' }, { status: 400 });
    }
  } else if (contentType.startsWith('image/')) {
    // Handle Raw Binary Upload (WAF Bypass)
    try {
      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = contentType; // Use content-type from header

      if (buffer.length > AVATAR_MAX_SIZE) {
          console.warn('[AVATAR_SKIP] Too large');
      } else {
          const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
          payloadRecord['avatarBase64'] = base64String;
          // Set sentinel to indicate this is only an avatar update
          payloadRecord['is_raw_avatar_upload'] = true;
      }
    } catch (e) {
      console.error('Binary upload failed', e);
       return NextResponse.json({ error: 'BINARY_UPLOAD_ERROR' }, { status: 400 });
    }
  } else {
    // Fallback or empty body
  }
  if (user.role === 'INVESTIGATOR') {
    const existingProfile = await prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existingProfile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    let uploadedAvatarUrl: string | null = null;
    let requestedAvatarRemoval = false;


    // 1. Handle Text Fields
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

    // Handle specialties
    const specialtiesRaw = payloadRecord.specialties;
    const normalizedSpecialties = normalizeSpecialties(specialtiesRaw);
    if (normalizedSpecialties) {
      updateData.specialties = normalizedSpecialties;
    } else if (Array.isArray(specialtiesRaw) && specialtiesRaw.length === 0) {
      updateData.specialties = []; // clearing
    }

    // 2. Handle Avatar
    if (payloadRecord.removeAvatar === true || payloadRecord.removeAvatar === 'true') {
      updateData.avatarUrl = null;
      requestedAvatarRemoval = true;
    }
    
    // Check for Base64 upload
    const avatarBase64 = payloadRecord.avatarBase64; 
    const isBase64Upload = typeof avatarBase64 === 'string' && avatarBase64.startsWith('data:image/');
    
    if (isBase64Upload) {
      try {
        const matches = avatarBase64.match(/^data:(image\/([a-zA-Z+]+));base64,(.+)$/);
        
        if (matches && matches.length === 4) {
          const mimeType = matches[1];
          const base64Data = matches[3];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (buffer.length > AVATAR_MAX_SIZE) {
             console.warn('[AVATAR_SKIP] Too large');
          } else if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
             console.warn('[AVATAR_SKIP] Unsupported type', mimeType);
          } else {
             // 2025-XX-XX: Use DB Storage for Base64 (Serverless workaround)
             // Instead of writing to file (volatile), save the full Base64 string to DB.
             updateData.avatarUrl = avatarBase64;
             uploadedAvatarUrl = avatarBase64; 
             requestedAvatarRemoval = false;
          }
        }
      } catch (error) {
        console.warn('[AVATAR_UPLOAD_SKIPPED] Base64 write failed', error);
      }
    }

    // 3. Finalize Update
    const hasChanges = Object.keys(updateData).length > 0;
    if (!hasChanges) {
       // Return success (idempotent)
       const currentProfile = {
            ...existingProfile,
            termsAcceptedAt: serializeDate(existingProfile.termsAcceptedAt ?? null),
            privacyAcceptedAt: serializeDate(existingProfile.privacyAcceptedAt ?? null),
            updatedAt: serializeDate(existingProfile.updatedAt),
            createdAt: serializeDate(existingProfile.createdAt),
        };
        return NextResponse.json({
          message: 'PROFILE_UPDATED',
          profile: currentProfile,
          warning: (isBase64Upload && !uploadedAvatarUrl) ? 'IMAGE_UPLOAD_SYSTEM_LIMIT' : null,
          investigatorStatus: existingProfile.status as InvestigatorStatus,
        });
    }

    updateData.updatedAt = new Date();

    let updatedProfile: InvestigatorProfile;
    try {
      updatedProfile = await prisma.investigatorProfile.update({
        where: { userId: user.id },
        data: updateData as Prisma.InvestigatorProfileUpdateInput,
      });
    } catch (error) {
      console.error('[PROFILE_UPDATE_DB_ERROR]', error);
      if (uploadedAvatarUrl) await deleteLocalAvatar(uploadedAvatarUrl);
      return NextResponse.json({ error: 'DB_UPDATE_FAILED', details: (error as Error).message }, { status: 500 });
    }

    if (uploadedAvatarUrl && existingProfile.avatarUrl && existingProfile.avatarUrl !== uploadedAvatarUrl && !existingProfile.avatarUrl.startsWith('data:')) {
      await deleteLocalAvatar(existingProfile.avatarUrl);
    } else if (requestedAvatarRemoval && !uploadedAvatarUrl && existingProfile.avatarUrl && !updatedProfile.avatarUrl && !existingProfile.avatarUrl.startsWith('data:')) {
      await deleteLocalAvatar(existingProfile.avatarUrl);
    }

    return NextResponse.json({
      message: 'PROFILE_UPDATED',
      profile: updatedProfile,
      warning: (isBase64Upload && !uploadedAvatarUrl) ? 'IMAGE_UPLOAD_SYSTEM_LIMIT' : null,
      investigatorStatus: updatedProfile.status as InvestigatorStatus,
    });
  }
  
  return NextResponse.json({ user: sanitizeUser(user), role: user.role, profile: null });
}

export async function PATCH(req: NextRequest) {
  return handleProfileUpdate(req);
}

export async function POST(req: NextRequest) {
  return handleProfileUpdate(req);
}

