// Prisma client singleton — use for DB access
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
