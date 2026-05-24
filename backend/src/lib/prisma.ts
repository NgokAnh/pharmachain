import { Prisma, PrismaClient } from '@prisma/client';
import { Response } from 'express';

const globalForPrisma = globalThis as typeof globalThis & {
  __pharmachainPrisma?: PrismaClient;
};

export const prisma = globalForPrisma.__pharmachainPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__pharmachainPrisma = prisma;
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  'Khong ket noi duoc co so du lieu. Vui long kiem tra DATABASE_URL va trang thai may chu PostgreSQL/Neon.';

export const DATABASE_SCHEMA_MISMATCH_MESSAGE =
  'Schema co so du lieu tren Neon chua khop voi Prisma schema hien tai. Can migrate/backfill truoc khi tai du lieu.';

const DATABASE_ERROR_PATTERNS = [
  /Can't reach database server/i,
  /Authentication failed against database server/i,
  /Timed out fetching a new connection/i,
  /Connection refused/i,
  /ECONNREFUSED/i,
  /connect ECONN/i,
];

export function isDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code);
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  return DATABASE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function isDatabaseSchemaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2021', 'P2022'].includes(error.code)
  );
}

export function respondWithDatabaseAwareError(
  res: Response,
  error: unknown,
  fallbackMessage: string
) {
  if (isDatabaseConnectionError(error)) {
    console.error('Database connection error:', error);
    return res.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
  }

  if (isDatabaseSchemaError(error)) {
    console.error('Database schema mismatch error:', error);
    return res.status(500).json({ error: DATABASE_SCHEMA_MISMATCH_MESSAGE });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
}

export async function checkDatabaseConnection() {
  await prisma.$queryRawUnsafe('SELECT 1');
}
