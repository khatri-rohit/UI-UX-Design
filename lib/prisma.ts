import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Set your database connection string before using Prisma.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error);
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
