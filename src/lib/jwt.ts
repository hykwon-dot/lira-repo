import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_ME';
const DEFAULT_EXP: SignOptions['expiresIn'] = '7d';

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = DEFAULT_EXP) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
