import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAuthContext } from "@/lib/get-auth";
import { revokeInvitation, isOrgError } from "@/lib/org";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    const authContext = await requireAuthContext({
      request: req,
      eventType: "org.invite.revoked",
    });

    if (!authContext.orgId) {
      return NextResponse.json(
        { error: true, message: "You do not belong to an organisation." },
        { status: 404 },
      );
    }

    const { inviteId } = await params;

    await revokeInvitation(inviteId, authContext.appUserId);

    return NextResponse.json({
      error: false,
      message: "Invitation revoked.",
    });
  } catch (error) {
    if (isAuthError(error))
      return NextResponse.json(
        { error: true, code: error.code, message: error.message },
        { status: error.status },
      );
    if (isOrgError(error))
      return NextResponse.json(
        { error: true, code: error.code, message: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: true, message: "Failed to revoke invitation." },
      { status: 500 },
    );
  }
}
