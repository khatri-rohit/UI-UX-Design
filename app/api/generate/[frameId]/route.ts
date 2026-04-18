import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ frameId: string }> },
) {
  const { frameId } = await context.params;
}
