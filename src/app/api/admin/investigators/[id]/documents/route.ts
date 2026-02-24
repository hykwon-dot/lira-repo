
import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  const resolvedParams = await Promise.resolve(params); // Await params for Nextjs 15+ compat if needed
  const id = parseInt(resolvedParams.id);
  const type = req.nextUrl.searchParams.get('type');

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  if (!type || !['businessLicense', 'pledge', 'terms', 'idCard'].includes(type)) {
    return NextResponse.json({ error: 'Invalid document type. Must be one of: businessLicense, pledge, terms, idCard' }, { status: 400 });
  }

  const prisma = await getPrismaClient();

  // Create a selection object to only fetch the needed field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const select: any = { id: true };
  if (type === 'businessLicense') { select.businessLicenseData = true; select.businessLicenseUrl = true; }
  if (type === 'pledge') { select.pledgeData = true; select.pledgeUrl = true; }
  if (type === 'terms') { select.termsData = true; select.termsUrl = true; }
  if (type === 'idCard') { select.idCardData = true; select.idCardUrl = true; }

  try {
    const investigator = await prisma.investigatorProfile.findUnique({
      where: { id },
      select
    });

    if (!investigator) {
      return NextResponse.json({ error: 'Investigator not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataString = (investigator as any)[`${type}Data`] as string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const urlString = (investigator as any)[`${type}Url`] as string | null;

    // 1. Try serving from Data URI (base64)
    if (dataString) {
      // Handle Data URI format: "data:[<mediatype>][;base64],<data>"
      const matches = dataString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
          }
        });
      }
    }

    // 2. Try redirecting to URL if Data URI failed or didn't exist
    if (urlString) {
       return NextResponse.redirect(urlString);
    }
    
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  } catch (error) {
    console.error(`[API] Failed to fetch document ${type} for investigator ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
