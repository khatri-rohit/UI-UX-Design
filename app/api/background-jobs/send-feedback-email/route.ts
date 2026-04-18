import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import logger from "@/lib/logger";
import { sendFeedbackEmail } from "@/lib/feedback-mail";
import {
  FEEDBACK_MAX_FILE_SIZE_BYTES,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES,
  formatBytes,
} from "@/lib/feedback";
import {
  feedbackQueuedJobBodySchema,
  toValidationIssues,
} from "@/lib/schemas/studio";

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Request body must be valid JSON",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsedBody = feedbackQueuedJobBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Invalid feedback payload",
          issues: toValidationIssues(parsedBody.error),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { feedback, attachments } = parsedBody.data;
    const decodedAttachments = attachments.map((attachment) => {
      const content = Buffer.from(attachment.contentBase64, "base64");
      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        content,
      };
    });

    const invalidAttachment = decodedAttachments.find(
      (attachment) =>
        attachment.content.length <= 0 ||
        attachment.content.length > FEEDBACK_MAX_FILE_SIZE_BYTES,
    );

    if (invalidAttachment) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "VALIDATION_ERROR",
          message: `Each attachment must be between 1 byte and ${formatBytes(FEEDBACK_MAX_FILE_SIZE_BYTES)}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const totalSize = decodedAttachments.reduce(
      (sum, attachment) => sum + attachment.content.length,
      0,
    );

    if (totalSize > FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "VALIDATION_ERROR",
          message: `Total attachment size must be at most ${formatBytes(FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await sendFeedbackEmail({
      feedback,
      attachments: decodedAttachments,
    });

    logger.info("Feedback email sent successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Feedback email sent" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logger.error("Error sending feedback email:", { error });
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to send feedback email",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
