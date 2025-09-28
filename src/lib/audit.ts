type AuditEvent = {
  actorId: number;
  action: string;
  targetType: string;
  targetId: number;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
};

/**
 * 향후 AuditLog 모델로 확장할 수 있도록 임시로 콘솔에 기록하는 헬퍼.
 * 추후 DB 테이블이 준비되면 여기에서 Prisma insert 로 교체하세요.
 */
export async function recordAuditEvent(event: AuditEvent) {
  const payload = {
    ...event,
    timestamp: event.timestamp ?? new Date(),
  };
  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUDIT]', JSON.stringify(payload));
  }
  // TODO: AuditLog 모델이 준비되면 DB에 적재하도록 변경
  return payload;
}
