import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authz';
import { getPrismaClient } from '@/lib/prisma';
import { InvestigatorStatus } from '@prisma/client';
import type { Prisma, User, InvestigatorProfile } from '@prisma/client';
import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

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
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function getInvestigatorUploadsDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'investigators');
}

async function ensureUploadsDir() {
  const dir = getInvestigatorUploadsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

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

async function saveInvestigatorAvatar(file: File, userId: number): Promise<string> {
  const extFromType = ALLOWED_IMAGE_TYPES.get(file.type);
  const originalExt = typeof file.name === 'string' && file.name.includes('.')
    ? `.${file.name.split('.').pop()!.toLowerCase()}`
    : null;
  const extensionRaw = extFromType ?? originalExt ?? '.jpg';
  const extension = extensionRaw === '.jpeg' ? '.jpg' : extensionRaw;
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > AVATAR_MAX_SIZE) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  const dir = await ensureUploadsDir();
  const filename = `investigator-${userId}-${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/investigators/${filename}`;
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

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const prisma = await getPrismaClient();
  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  let jsonPayload: unknown = null;
  if (!isMultipart) {
    try {
      jsonPayload = await req.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
  }

  if (user.role === 'INVESTIGATOR') {
  const existingProfile = await prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existingProfile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    if (isMultipart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formData = await req.formData() as any;
  const updateData: Record<string, unknown> = {};
      let uploadedAvatarUrl: string | null = null;
      let requestedAvatarRemoval = false;

      const getTrimmedString = (key: string) => {
        const value = formData.get(key);
        return typeof value === 'string' ? value.trim() : undefined;
      };

      const setNullableString = (field: string, key: string) => {
        const value = getTrimmedString(key);
        if (value !== undefined) {
          updateData[field] = value || null;
        }
      };

      setNullableString('contactPhone', 'contactPhone');
      setNullableString('serviceArea', 'serviceArea');
      setNullableString('introduction', 'introduction');
      setNullableString('portfolioUrl', 'portfolioUrl');

      const experienceYearsRaw = formData.get('experienceYears');
      if (typeof experienceYearsRaw === 'string') {
        const normalized = experienceYearsRaw.trim();
        if (!normalized.length) {
          updateData.experienceYears = null;
        } else {
          const years = Number(normalized);
          if (Number.isNaN(years) || years < 0) {
            return NextResponse.json({ error: 'INVALID_EXPERIENCE' }, { status: 400 });
          }
          updateData.experienceYears = years;
        }
      }

      const specialtiesRaw = [
        ...formData.getAll('specialties'),
        ...formData.getAll('specialties[]'),
      ].filter((item): item is string => typeof item === 'string');

      if (specialtiesRaw.length) {
        let processedValues: string[] = [];
        if (specialtiesRaw.length === 1) {
          const value = specialtiesRaw[0];
          try {
            const asJson = JSON.parse(value);
            if (Array.isArray(asJson)) {
              processedValues = asJson.filter((item): item is string => typeof item === 'string');
            } else {
              processedValues = value.split(',');
            }
          } catch {
            processedValues = value.split(',');
          }
        } else {
          processedValues = specialtiesRaw;
        }

        const normalized = normalizeSpecialties(processedValues);
        if (normalized) {
          updateData.specialties = normalized;
        } else {
          updateData.specialties = [];
        }
      }

      const removeAvatarValue = formData.get('removeAvatar');
      if (typeof removeAvatarValue === 'string') {
        const normalized = removeAvatarValue.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) {
          updateData.avatarUrl = null;
          requestedAvatarRemoval = true;
        }
      }

      const avatarFile = formData.get('avatar');
      // Safer check for File object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isFile = avatarFile && typeof avatarFile === 'object' && 'size' in avatarFile && typeof (avatarFile as any).arrayBuffer === 'function';
      
      if (isFile && (avatarFile as File).size > 0) {
        try {
          uploadedAvatarUrl = await saveInvestigatorAvatar(avatarFile as File, user.id);
          updateData.avatarUrl = uploadedAvatarUrl;
          requestedAvatarRemoval = false;
        } catch (error: unknown) {
          console.error('[PROFILE_UPLOAD_ERROR]', error);
          const code = (error as Error).message;
          if (code === 'UNSUPPORTED_IMAGE_TYPE') {
            return NextResponse.json({ error: 'UNSUPPORTED_IMAGE_TYPE' }, { status: 415 });
          }
          if (code === 'IMAGE_TOO_LARGE') {
            return NextResponse.json({ error: 'IMAGE_TOO_LARGE' }, { status: 413 });
          }
          return NextResponse.json({ 
            error: 'AVATAR_UPLOAD_FAILED', 
            details: (error as Error).message 
          }, { status: 500 });
        }
      }

      if (!Object.keys(updateData).length) {
        return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
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
        if (uploadedAvatarUrl) {
          await deleteLocalAvatar(uploadedAvatarUrl);
        }
        return NextResponse.json({ 
            error: 'DB_UPDATE_FAILED', 
            details: (error as Error).message 
        }, { status: 500 });
      }

      if (uploadedAvatarUrl && existingProfile.avatarUrl && existingProfile.avatarUrl !== uploadedAvatarUrl) {
        await deleteLocalAvatar(existingProfile.avatarUrl);
      } else if (!uploadedAvatarUrl && requestedAvatarRemoval && existingProfile.avatarUrl) {
        await deleteLocalAvatar(existingProfile.avatarUrl);
      }

      return NextResponse.json({
        message: 'PROFILE_UPDATED',
        profile: updatedProfile,
        investigatorStatus: updatedProfile.status as InvestigatorStatus,
      });
    }

  const payloadRecord: Record<string, unknown> = isRecord(jsonPayload) ? jsonPayload : {};
    const updateData: Record<string, unknown> = {};
    let requestedAvatarRemoval = false;

    const contactPhone = payloadRecord['contactPhone'];
    if (typeof contactPhone === 'string') {
      updateData.contactPhone = contactPhone.trim() || null;
    }
    const serviceArea = payloadRecord['serviceArea'];
    if (typeof serviceArea === 'string') {
      updateData.serviceArea = serviceArea.trim() || null;
    }
    const introduction = payloadRecord['introduction'];
    if (typeof introduction === 'string') {
      updateData.introduction = introduction.trim() || null;
    }
    const portfolioUrl = payloadRecord['portfolioUrl'];
    if (typeof portfolioUrl === 'string') {
      updateData.portfolioUrl = portfolioUrl.trim() || null;
    }
    const experienceYearsValue = payloadRecord['experienceYears'];
    if (experienceYearsValue !== undefined) {
      if (experienceYearsValue === null || experienceYearsValue === '') {
        updateData.experienceYears = null;
      } else {
        const years = Number(experienceYearsValue);
        if (Number.isNaN(years) || years < 0) {
          return NextResponse.json({ error: 'INVALID_EXPERIENCE' }, { status: 400 });
        }
        updateData.experienceYears = years;
      }
    }
    const specialtiesRaw = payloadRecord['specialties'];
    const specialties = normalizeSpecialties(specialtiesRaw);
    if (specialties) {
      updateData.specialties = specialties;
    } else if (Array.isArray(specialtiesRaw) && specialtiesRaw.length === 0) {
      updateData.specialties = [];
    }
    if (payloadRecord['removeAvatar'] === true) {
      updateData.avatarUrl = null;
      requestedAvatarRemoval = true;
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
    }

    updateData.updatedAt = new Date();

    const profile = await prisma.investigatorProfile.update({
      where: { userId: user.id },
      data: updateData as Prisma.InvestigatorProfileUpdateInput,
    });

    if (requestedAvatarRemoval && existingProfile.avatarUrl && !profile.avatarUrl) {
      await deleteLocalAvatar(existingProfile.avatarUrl);
    }

    return NextResponse.json({
      message: 'PROFILE_UPDATED',
      profile,
      investigatorStatus: profile.status as InvestigatorStatus,
    });
  }

  if (user.role === 'USER') {
    if (isMultipart) {
      return NextResponse.json({ error: 'UNSUPPORTED_CONTENT_TYPE' }, { status: 415 });
    }
  const payloadRecord: Record<string, unknown> = isRecord(jsonPayload) ? jsonPayload : {};
    const profileUpdate: Record<string, unknown> = {};
    const userUpdate: Record<string, unknown> = {};

    const name = payloadRecord['name'];
    if (typeof name === 'string' && name.trim()) {
      userUpdate.name = name.trim();
    }
    const displayName = payloadRecord['displayName'];
    if (typeof displayName === 'string') {
      profileUpdate.displayName = displayName.trim() || null;
    }
    const phone = payloadRecord['phone'];
    if (typeof phone === 'string') {
      profileUpdate.phone = phone.trim() || null;
    }
    const gender = payloadRecord['gender'];
    if (typeof gender === 'string') {
      profileUpdate.gender = gender;
    }
    const occupation = payloadRecord['occupation'];
    if (typeof occupation === 'string') {
      profileUpdate.occupation = occupation.trim() || null;
    }
    const region = payloadRecord['region'];
    if (typeof region === 'string') {
      profileUpdate.region = region.trim() || null;
    }
    const preferredCaseTypes = payloadRecord['preferredCaseTypes'];
    if (preferredCaseTypes) {
      const preferred = Array.isArray(preferredCaseTypes)
        ? preferredCaseTypes.filter((item: unknown) => typeof item === 'string')
        : [];
      profileUpdate.preferredCaseTypes = preferred;
    }
    const budgetMin = payloadRecord['budgetMin'];
    if (budgetMin !== undefined) {
      const value = budgetMin === null ? null : Number(budgetMin);
      if (value !== null && Number.isNaN(value)) {
        return NextResponse.json({ error: 'INVALID_BUDGET_MIN' }, { status: 400 });
      }
      profileUpdate.budgetMin = value;
    }
    const budgetMax = payloadRecord['budgetMax'];
    if (budgetMax !== undefined) {
      const value = budgetMax === null ? null : Number(budgetMax);
      if (value !== null && Number.isNaN(value)) {
        return NextResponse.json({ error: 'INVALID_BUDGET_MAX' }, { status: 400 });
      }
      profileUpdate.budgetMax = value;
    }
    const urgencyLevel = payloadRecord['urgencyLevel'];
    if (typeof urgencyLevel === 'string' || urgencyLevel === null) {
      profileUpdate.urgencyLevel = urgencyLevel;
    }
    const marketingOptIn = payloadRecord['marketingOptIn'];
    if (typeof marketingOptIn === 'boolean') {
      profileUpdate.marketingOptIn = marketingOptIn;
    }
    const birthDate = payloadRecord['birthDate'];
    if (typeof birthDate === 'string') {
      const parsed = new Date(birthDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'INVALID_BIRTHDATE' }, { status: 400 });
      }
      profileUpdate.birthDate = parsed;
    }

    if (!Object.keys(profileUpdate).length && !Object.keys(userUpdate).length) {
      return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
    }

    profileUpdate.updatedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length) {
        await tx.user.update({ where: { id: user.id }, data: userUpdate as Prisma.UserUpdateInput });
      }
      const profile = await tx.customerProfile.update({
        where: { userId: user.id },
        data: profileUpdate as Prisma.CustomerProfileUpdateInput,
      });
      return profile;
    });

    return NextResponse.json({
      message: 'PROFILE_UPDATED',
      profile: result,
    });
  }

  return NextResponse.json({ error: 'ROLE_NOT_SUPPORTED' }, { status: 400 });
}
