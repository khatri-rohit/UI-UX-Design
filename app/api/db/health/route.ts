import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await prisma.$queryRaw<
      Array<{ ok: number }>
    >`SELECT 1 AS ok`;

    return NextResponse.json({
      ok: result[0]?.ok === 1,
      message: "Prisma is connected to Supabase.",
    });
  } catch (error) {
    const err = error as Error;
    logger.error(err);

    return NextResponse.json(
      {
        error: true,
        message: err.message,
      },
      { status: 500 },
    );
  }
}
