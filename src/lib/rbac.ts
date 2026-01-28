// 간단한 RBAC 권한 매핑
// capability 예시는 API 라우트에서 검사할 문자열 키

export type Capability =
  | 'scenario.read'
  | 'scenario.write'
  | 'investigator.approve'
  | 'investigator.profile.read'
  | 'investigator.profile.write'
  | 'investigation.request.create'
  | 'investigation.request.read'
  | 'investigation.match.read'
  | 'conversation.read'
  | 'conversation.write'
  | 'admin.dashboard'
  | 'system.manage';

export type Role = 'USER' | 'INVESTIGATOR' | 'ENTERPRISE' | 'ADMIN' | 'SUPER_ADMIN';

const roleCapabilities: Record<Role, Capability[]> = {
  USER: [
    'scenario.read',
    'investigation.request.create',
    'investigation.request.read',
    'conversation.read',
    'conversation.write',
  ],
  INVESTIGATOR: [
    'scenario.read',
    'investigator.profile.read',
    'investigator.profile.write',
    'investigation.request.read',
    'investigation.match.read',
    'conversation.read',
    'conversation.write',
  ],
  ENTERPRISE: [
    'scenario.read',
    'investigation.request.create',
    'investigation.request.read',
    'investigation.match.read',
    'conversation.read',
    'conversation.write',
  ],
  ADMIN: [
    'scenario.read',
    'scenario.write',
    'investigator.approve',
    'investigator.profile.read',
    'investigation.request.read',
    'investigation.match.read',
    'conversation.read',
    'admin.dashboard',
  ],
  SUPER_ADMIN: [
    'scenario.read',
    'scenario.write',
    'investigator.approve',
    'investigator.profile.read',
    'investigation.request.read',
    'investigation.match.read',
    'conversation.read',
    'admin.dashboard',
    'system.manage',
  ],
};

export function hasCapability(role: Role, capability: Capability) {
  return roleCapabilities[role]?.includes(capability) || false;
}

export function listCapabilities(role: Role) {
  return roleCapabilities[role] || [];
}
