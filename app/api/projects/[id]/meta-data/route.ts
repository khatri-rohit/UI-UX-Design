import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generateText } from "ai";

import prisma from "@/lib/prisma";
import { initializeOllama } from "@/lib/ollama";
import logger from "@/lib/logger";

export const POST = verifySignatureAppRouter(async (req: Request) => {
  const body = await req.json();
  const { projectId, prompt } = body as { projectId: string; prompt: string };

  // Project meta-data processing logic
  const ollama = initializeOllama();
  const { text: projectTitle } = await generateText({
    model: ollama("gemma4:31b-cloud"),
    system:
      "Generate exactly one concise, descriptive project title from the user's prompt. Return only the title text as a single line. Do not provide options, explanations, discussion, quotes, numbering, labels, or any extra text.",
    prompt,
  });

  const { text: projectDescription } = await generateText({
    model: ollama("gemma4:31b-cloud"),
    system:
      "You are a helpful assistant that generates a very short description for a design project based on the user's prompt. The description should be concise and descriptive.",
    prompt,
  });
  logger.info("Generated project meta-data from prompt", {
    projectId,
    projectTitle,
    projectDescription,
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      title: projectTitle,
      description: projectDescription,
    },
  });

  return new Response(
    "Background meta-data processing completed for project " +
      projectId +
      ". Title: " +
      projectTitle +
      ", Description: " +
      projectDescription,
  );
});
