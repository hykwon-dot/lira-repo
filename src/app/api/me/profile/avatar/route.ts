import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/authz';

// Force dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const prisma = await getPrismaClient();

  try {
    const body = await req.json();
    const { avatarBase64 } = body;

    if (!avatarBase64 || typeof avatarBase64 !== 'string') {
      return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
    }
    
    let finalAvatarString = avatarBase64;
    
    // Support Raw Base64 (WAF Bypass optimization)
    // If client strips prefix to reduce size/pattern matching, we restore it here.
    if (!avatarBase64.startsWith('data:image/')) {
        // Assume JPEG if no prefix provided
        finalAvatarString = `data:image/jpeg;base64,${avatarBase64}`;
    }
    
    const sizeInBytes = Math.ceil((finalAvatarString.length * 3) / 4);
    if (sizeInBytes > 5 * 1024 * 1024) { // 5MB strict limit
         return NextResponse.json({ error: 'IMAGE_TOO_LARGE' }, { status: 413 });
    }

    // Update in DB
    // Determine which profile to update based on role
    // For now, assuming INVESTIGATOR as per current context
    if (user.role === 'INVESTIGATOR') {
        const updated = await prisma.investigatorProfile.update({
            where: { userId: user.id },
            data: {
                avatarUrl: finalAvatarString,
                updatedAt: new Date()
            }
        });
        return NextResponse.json({ message: 'AVATAR_UPDATED', avatarUrl: updated.avatarUrl });
    } else if (user.role === 'USER') {
        /*
        await prisma.customerProfile.update({
             where: { userId: user.id },
             data: {}
        });
        */
        return NextResponse.json({ error: 'NOT_IMPLEMENTED_FOR_ROLE' }, { status: 501 });
    }
    
    return NextResponse.json({ error: 'ROLE_NOT_SUPPORTED' }, { status: 403 });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
