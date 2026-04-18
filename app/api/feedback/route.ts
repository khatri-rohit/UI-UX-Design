import { NextRequest } from "next/server";
import logger from "@/lib/logger";
import { sendFeedbackEmail } from "@/lib/feedback-mail";
import {
  feedbackFormBodySchema,
  toValidationIssues,
} from "@/lib/schemas/studio";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "Request must be multipart form-data with feedback and optional attachments",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsedBody = feedbackFormBodySchema.safeParse({
      feedback: formData.get("feedback"),
      attachments: formData.getAll("attachments"),
    });

    if (!parsedBody.success) {
      logger.error("Validation error:", { error: parsedBody.error });
      return new Response(
        JSON.stringify({
          error: "Invalid feedback form payload",
          code: "VALIDATION_ERROR",
          issues: toValidationIssues(parsedBody.error),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { feedback, attachments } = parsedBody.data;

    const emailAttachments = await Promise.all(
      attachments.map(async (attachmentFile) => ({
        filename: attachmentFile.name || "attachment",
        contentType: attachmentFile.type,
        content: Buffer.from(await attachmentFile.arrayBuffer()),
      })),
    );

    await sendFeedbackEmail({
      feedback,
      attachments: emailAttachments,
    });
    logger.info("Feedback email sent from /api/feedback", {
      attachments: emailAttachments.length,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Feedback received" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logger.error("Error processing feedback:", { error });
    return new Response(
      JSON.stringify({ error: "An error occurred while processing feedback" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
