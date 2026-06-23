import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'lira_production_jwt_secret_2024_secure_key_replace_in_production';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);
const DEFAULT_EXP = '7d';

export interface JwtPayload {
  userId: number;
  role: string;
}

export async function signToken(payload: JwtPayload, expiresIn: string | number = DEFAULT_EXP) {
  const jwt = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn);
    
  return await jwt.sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
