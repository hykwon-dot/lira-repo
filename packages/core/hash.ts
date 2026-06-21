import { hash, verify } from '@node-rs/bcrypt';

export async function hashPassword(plain: string) {
  return hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed: string) {
  return verify(plain, hashed);
}
