
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
  if (type === 'businessLicense') select.businessLicenseData = true;
  if (type === 'pledge') select.pledgeData = true;
  if (type === 'terms') select.termsData = true;
  if (type === 'idCard') select.idCardData = true;

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

    if (!dataString) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

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
          // Optional: 'Content-Disposition': `inline; filename="${type}-${id}.${mimeType.split('/')[1]}"`
        }
      });
    } 
    
    // If it's not a data URI, maybe it's raw base64 or just text?
    // Assuming it is just text or unknown format, usually safe to return as text/plain or try to detect
    // But based on register route, it saves as Data URI.
    
    return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });

  } catch (error) {
    console.error(`[API] Failed to fetch document ${type} for investigator ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
