import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider');
  
  // Robust origin detection: Env Var -> Host Header -> nextUrl.origin
  // This prevents 'localhost' being used in production environments like Amplify
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 
                 (host && !host.includes('localhost') ? `${protocol}://${host}` : request.nextUrl.origin);

  const redirectUri = `${origin}/api/auth/social/callback`;

  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
  }

  let authUrl = '';

  switch (provider) {
    case 'kakao':
      const kakaoClientId = process.env.KAKAO_CLIENT_ID;
      if (!kakaoClientId) {
        return NextResponse.json({ error: 'Kakao Client ID is not configured' }, { status: 500 });
      }
      authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
      break;

    case 'naver':
      const naverClientId = process.env.NAVER_CLIENT_ID;
      if (!naverClientId) {
        return NextResponse.json({ error: 'Naver Client ID is not configured' }, { status: 500 });
      }
      const state = Math.random().toString(36).substring(7);
      authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naverClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      break;

    case 'google':
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        return NextResponse.json({ error: 'Google Client ID is not configured' }, { status: 500 });
      }
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&state=google`;
      break;

    default:
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}
