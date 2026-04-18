import nodemailer, { type Transporter } from "nodemailer";

export interface FeedbackMailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendFeedbackEmail({
  feedback,
  attachments,
}: {
  feedback: string;
  attachments: FeedbackMailAttachment[];
}) {
  await transporter.sendMail({
    from: `"UI/UX Builder Feedback" <${process.env.EMAIL_USER}>`,
    to: process.env.FEEDBACK_RECEIVER_EMAIL,
    subject: "New Feedback Received",
    text: feedback,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });
}
