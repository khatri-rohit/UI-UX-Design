import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import logger from "@/lib/logger";
import {
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_FILE_SIZE_BYTES,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES,
  formatBytes,
} from "@/lib/feedback";

const allowedAttachmentTypeSet: ReadonlySet<string> = new Set(
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
);

interface FeedbackProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const FeedbackForm = ({ open, onOpenChange }: FeedbackProps) => {
  const [feedback, setFeedback] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const selectedTotalBytes = attachments.reduce(
    (sum, attachment) => sum + attachment.size,
    0,
  );

  const resetForm = () => {
    setFeedback("");
    setAttachments([]);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      setAttachments([]);
      return;
    }

    if (selectedFiles.length > FEEDBACK_MAX_ATTACHMENTS) {
      toast.error(`You can upload up to ${FEEDBACK_MAX_ATTACHMENTS} files.`);
      event.target.value = "";
      return;
    }

    const unsupportedFile = selectedFiles.find(
      (file) => !allowedAttachmentTypeSet.has(file.type),
    );
    if (unsupportedFile) {
      toast.error("Only image and video files are supported.");
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > FEEDBACK_MAX_FILE_SIZE_BYTES,
    );
    if (oversizedFile) {
      toast.error(
        `Each file must be ${formatBytes(FEEDBACK_MAX_FILE_SIZE_BYTES)} or smaller.`,
      );
      event.target.value = "";
      return;
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      toast.error(
        `Total attachments must be ${formatBytes(FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES)} or less.`,
      );
      event.target.value = "";
      return;
    }

    setAttachments(selectedFiles);
  };

  const sendFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      toast.error("Please add your feedback before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("feedback", trimmedFeedback);
      for (const attachment of attachments) {
        payload.append("attachments", attachment);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: payload,
      });

      const responseBody = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;

      if (response.ok && response.status === 200) {
        resetForm();
        onOpenChange(false);
        toast.success(
          "Thank you! Your feedback has been received. We appreciate your input!",
          {
            duration: 3000,
          },
        );
        logger.info("Feedback submission response:", {
          status: response.status,
          attachments: attachments.length,
        });
        return;
      }

      toast.error(
        responseBody?.message ??
          responseBody?.error ??
          "Oops! We couldn't send your feedback. Please check your connection and try again.",
        {
          duration: 4000,
        },
      );
      logger.error("Failed to send feedback:", {
        status: response.status,
        responseBody,
      });
    } catch (error) {
      logger.error("Error sending feedback:", { error });
      toast.error("Something went wrong. Please try again in a moment.", {
        duration: 4000,
      });
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="dark bg-[#181818] border-l border-white/10 shadow-2xl rounded-none w-full sm:max-w-md h-full mt-0">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-white text-xl">
            Feedback Form
          </DrawerTitle>
          <DrawerDescription className="text-white/60 mt-2">
            We would love to hear your thoughts and feedback about our project
            studio! Please fill out the form below to share your experience,
            suggestions, or any issues you encountered while using the platform.
          </DrawerDescription>
        </DrawerHeader>
        <form className="grid gap-4 px-4 py-4" onSubmit={sendFeedback}>
          <label
            htmlFor="feedback"
            className="text-[15px] font-medium leading-none text-white/90"
          >
            Describe your feedback{" "}
            <span className="text-white/50">(required)</span>
          </label>
          <Textarea
            id="feedback"
            rows={6}
            placeholder="Tell us what you think..."
            className="flex w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-[15px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 transition-colors"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />

          <Field className="pt-4">
            <FieldLabel htmlFor="share" className="text-white/90">
              Share Pictures or Videos
            </FieldLabel>
            <Input
              id="share"
              ref={attachmentInputRef}
              type="file"
              multiple
              accept={FEEDBACK_ATTACHMENT_ACCEPT}
              onChange={handleAttachmentChange}
              className="border-white/20 bg-white/5 text-white file:text-white"
            />
            <FieldDescription className="text-white/50">
              Upload up to {FEEDBACK_MAX_ATTACHMENTS} files. Each file can be up
              to {formatBytes(FEEDBACK_MAX_FILE_SIZE_BYTES)} and total
              attachments can be up to
              {" " + formatBytes(FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}.
            </FieldDescription>
            {attachments.length > 0 ? (
              <p className="text-xs text-white/60">
                {attachments.length} file(s) selected (
                {formatBytes(selectedTotalBytes)})
              </p>
            ) : null}
          </Field>
          <DrawerFooter className="pt-2 px-0">
            <Button
              type="submit"
              className="bg-white text-black hover:bg-white/90 font-medium shadow-none h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};

export default FeedbackForm;
