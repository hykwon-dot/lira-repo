import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // 'google', 'kakao', 'naver'

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=No code received', request.url));
  }

  // Robust origin detection: Env Var -> Host Header -> nextUrl.origin
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 
                 (host && !host.includes('localhost') ? `${protocol}://${host}` : request.nextUrl.origin);

  const redirectUri = `${origin}/api/auth/social/callback`;
  
  let socialEmail = '';
  let socialName = '';

  try {
    if (state === 'google') {
       const clientId = process.env.GOOGLE_CLIENT_ID;
       const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
       
       if (!clientId || !clientSecret) throw new Error("Google credentials missing");

       // 1. Exchange Code
       const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
         body: new URLSearchParams({
           code,
           client_id: clientId,
           client_secret: clientSecret,
           redirect_uri: redirectUri,
           grant_type: 'authorization_code'
         })
       });
       
       const tokenData = await tokenRes.json();
       if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed');

       // 2. Get User Profile
       const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
         headers: { Authorization: `Bearer ${tokenData.access_token}` }
       });
       const userData = await userRes.json();
       if (!userRes.ok) throw new Error('Failed to fetch user profile');

       socialEmail = userData.email;
       socialName = userData.name || userData.email.split('@')[0];

    } else if (state === 'kakao') {
       throw new Error("Kakao login not fully implemented yet");
    } else if (state === 'naver') {
       throw new Error("Naver login not fully implemented yet");
    } else {
       // Ideally fallback or check session if state is missing, but for now we enforce state
       // throw new Error("Unknown provider type (state missing)");
       // Fallback for cases where state might be lost (not ideal for CSRF but ok for simple flow)
       // Try generic logic or fail. 
       if (!state) throw new Error("Provider (state) is missing in callback");
       throw new Error(`Unknown provider: ${state}`);
    }

    if (!socialEmail) throw new Error("Email not found in social profile");

    // 3. Database Sync
    const prisma = await getPrismaClient();
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: socialEmail }
    });

    if (!user) {
      const randomPassword = randomBytes(16).toString('hex');
      
      user = await prisma.user.create({
        data: {
          email: socialEmail,
          name: socialName,
          password: randomPassword, 
          role: 'USER',
          customerProfile: {
             create: {
                 displayName: socialName,
                 termsAcceptedAt: new Date(),
                 privacyAcceptedAt: new Date(),
             }
          }
        }
      });
    }

    // 4. Create Session Token
    const jwtPayload = { userId: user.id, role: user.role };
    const token = signToken(jwtPayload);

    // 5. Redirect to frontend with token
    return NextResponse.redirect(new URL(`/login?token=${token}`, request.url));

  } catch (err) {
    console.error("Social login error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
  }
}
