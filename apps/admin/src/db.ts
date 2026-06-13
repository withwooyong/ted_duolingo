import { PrismaClient } from '@prisma/client';

/** Prisma 직접 연결 — postgres 롤이라 RLS를 우회한다 (내부 도구 전용, 외부 노출 금지) */
export const prisma = new PrismaClient();
