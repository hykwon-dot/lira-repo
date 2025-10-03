"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

export type UserRole = 'user' | 'investigator' | 'enterprise' | 'admin' | 'super_admin';

// Type for the user data in the store (public, no password)
export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  monthlyUsage?: number;
  remainingTokens?: number;
  investigatorStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

// Type for the user data in our "database" (internal, with password)
type UserRecord = User & {
  password?: string; // 비밀번호는 선택 사항으로 처리
};

// --- Mock Database ---
// In a real app, this would be a database call.
const users: UserRecord[] = [
  {
    id: '1',
    email: 'admin@test.com',
    name: 'Admin User',
    password: 'password123',
    role: 'admin',
    monthlyUsage: 50000,
    remainingTokens: 25000,
  },
  {
    id: '2',
    email: 'user@test.com',
    name: 'Test User',
    password: 'password123',
    role: 'user',
    monthlyUsage: 10000,
    remainingTokens: 5000,
  },
];

export function findUserByEmail(email: string): UserRecord | undefined {
  return users.find((u) => u.email === email);
}

export function addUser(user: UserRecord) {
  users.push(user);
}
// --- End Mock Database ---


// --- Store Definition ---
interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null, token?: string | null) => void;
  login: (credentials: { email: string; password?: string }) => Promise<boolean>;
  logout: () => void;
  register: (
    userData: Omit<UserRecord, 'id' | 'role' | 'monthlyUsage' | 'remainingTokens' | 'investigatorStatus'> &
      Partial<Pick<UserRecord, 'role' | 'monthlyUsage' | 'remainingTokens' | 'investigatorStatus'>>,
  ) => Promise<boolean>;
}

const sessionStorageFallback = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;
  }

  return window.sessionStorage;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user: User | null, token?: string | null) => set({ user, token: token ?? null }),
      login: async ({ email, password }: { email: string; password?: string }) => {
        // In a real app, you'd fetch this from an API
        const userRecord = users.find(
          (u) => u.email === email && u.password === password
        );
        if (userRecord) {
          const { password: removedPassword, ...user } = userRecord;
          void removedPassword;
          set({ user, token: 'mock-token' });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null, token: null }),
      register: async (
        userData: Omit<UserRecord, 'id' | 'role' | 'monthlyUsage' | 'remainingTokens' | 'investigatorStatus'> &
          Partial<Pick<UserRecord, 'role' | 'monthlyUsage' | 'remainingTokens' | 'investigatorStatus'>>,
      ) => {
        if (users.some((u) => u.email === userData.email)) {
          return false; // User already exists
        }
        const newUser: UserRecord = {
          ...userData,
          id: String(users.length + 1),
          role: userData.role ?? 'user',
          monthlyUsage: userData.monthlyUsage ?? 0,
          remainingTokens: userData.remainingTokens ?? 10000, // Initial tokens
        };
    users.push(newUser);
    const { password: removedPassword, ...user } = newUser;
    void removedPassword;
        set({ user, token: 'mock-token' });
        return true;
      },
    }),
    {
      name: 'user-storage', // unique name
      storage: createJSONStorage(sessionStorageFallback), // (optional) by default, 'localStorage' is used
    }
  )
);

// Helper to initialize store on client
export const useHydratedUserStore = <T,>(selector: (state: UserState) => T): T => {
  const store = useUserStore(selector);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);
  return isHydrated ? store : selector(useUserStore.getState());
};
