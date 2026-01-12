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
       const clientId = process.env.KAKAO_CLIENT_ID;
       const clientSecret = process.env.KAKAO_CLIENT_SECRET; // Optional, for Secure Mode

       if (!clientId) throw new Error("Kakao credentials (KAKAO_CLIENT_ID) missing");

       // 1. Exchange Code
       const params = new URLSearchParams({
           grant_type: 'authorization_code',
           client_id: clientId,
           redirect_uri: redirectUri,
           code: code
       });
       if (clientSecret) {
           params.append('client_secret', clientSecret);
       }

       const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
         body: params
       });

       const tokenData = await tokenRes.json();
       if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData) || 'Kakao Token exchange failed');

       // 2. Get User Profile
       const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
         headers: { 
             Authorization: `Bearer ${tokenData.access_token}`,
             'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' 
         }
       });
       
       const userData = await userRes.json();
       if (!userRes.ok) throw new Error('Failed to fetch Kakao user profile');
       
       // Kakao structure: userData.kakao_account.email, userData.kakao_account.profile.nickname
       socialEmail = userData.kakao_account?.email;
       socialName = userData.kakao_account?.profile?.nickname || `KakaoUser_${userData.id}`;
       
       if (!socialEmail) throw new Error("Email permission is required for Kakao login. Please allowed email provision in Kakao Developers.");

    } else if (state === 'naver') {
       const clientId = process.env.NAVER_CLIENT_ID;
       const clientSecret = process.env.NAVER_CLIENT_SECRET;

       if (!clientId || !clientSecret) throw new Error("Naver credentials (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET) missing");

       // 1. Exchange Code
       const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`;
       
       const tokenRes = await fetch(tokenUrl);
       const tokenData = await tokenRes.json();
       
       if (tokenData.error) throw new Error(tokenData.error_description || 'Naver Token exchange failed');

       // 2. Get User Profile
       const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
         headers: { Authorization: `Bearer ${tokenData.access_token}` }
       });
       
       const userJson = await userRes.json();
       if (userJson.resultcode !== '00') throw new Error(userJson.message || 'Failed to fetch Naver user profile');
       
       const userData = userJson.response;
       socialEmail = userData.email;
       socialName = userData.name || userData.nickname || `NaverUser_${userData.id}`;

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
    // Use the robust origin detected earlier instead of request.url which might be internal/localhost
    return NextResponse.redirect(`${origin}/login?token=${token}`);

  } catch (err) {
    console.error("Social login error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    // Also use robust origin for error redirect
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const errorOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 
                   (host && !host.includes('localhost') ? `${protocol}://${host}` : request.nextUrl.origin);
    
    return NextResponse.redirect(`${errorOrigin}/login?error=${encodeURIComponent(message)}`);
  }
}
