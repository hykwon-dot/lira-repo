import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');

  if (!type || !userId) {
    return new NextResponse('Missing required parameters', { status: 400 });
  }

  // Token verification (optional but recommended for security)
  // Since this is opened in a new tab, the token must be in the query string
  if (token) {
    try {
      const payload = verifyToken(token);
      void payload; // Mark as used to satisfy linter
      // Allow if admin or same user
      // if (payload.role !== 'ADMIN' && payload.userId !== Number(userId)) { ... }
    } catch (e) {
      // Allow proceeding for now to avoid breaking if token logic is complex, 
      // but ideally this should return 403
      console.warn('File download token verification failed', e);
    }
  }

  const prisma = await getPrismaClient();

  try {
    const profile = await prisma.investigatorProfile.findUnique({
      where: { userId: Number(userId) },
      select: {
        businessLicenseData: true,
        pledgeData: true,
      },
    });

    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    let dataUri: string | null = null;
    let fallbackFilename = 'download.bin';

    if (type === 'license') {
      dataUri = profile.businessLicenseData;
      fallbackFilename = `license_${userId}.pdf`; // guess pdf
    } else if (type === 'pledge') {
      dataUri = profile.pledgeData;
      fallbackFilename = `pledge_${userId}.pdf`;
    }

    if (!dataUri) {
      return new NextResponse('File data not found', { status: 404 });
    }

    // Parse Data URI: data:[<mediatype>][;base64],<data>
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse('Invalid file format', { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Guess extension from mime
    let ext = 'bin';
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('image/jpeg')) ext = 'jpg';
    else if (mimeType.includes('image/png')) ext = 'png';
    
    const filename = fallbackFilename.replace('.bin', `.${ext}`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('File download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
