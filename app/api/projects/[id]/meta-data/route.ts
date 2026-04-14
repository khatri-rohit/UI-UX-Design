import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generateText } from "ai";

import prisma from "@/lib/prisma";
import { initializeOllama } from "@/lib/ollama";
import logger from "@/lib/logger";

export const POST = verifySignatureAppRouter(async (req: Request) => {
  const body = await req.json();
  const { projectId, prompt, userId, verificationToken } = body as {
    projectId: string;
    prompt: string;
    userId?: string;
    verificationToken?: string | null;
  };

  const pathname = new URL(req.url).pathname;

  const routeProjectId = pathname.split("/")[3] ?? "";
  if (!routeProjectId) {
    return new Response("Invalid project route", { status: 400 });
  }

  if (projectId && projectId !== routeProjectId) {
    return new Response("Route/body projectId mismatch", { status: 400 });
  }

  const expectedVerificationToken = process.env.BACKGROUND_TASK_INTERNAL_TOKEN;
  if (
    expectedVerificationToken &&
    verificationToken !== expectedVerificationToken
  ) {
    return new Response("Invalid metadata task token", { status: 401 });
  }

  if (!userId) {
    return new Response("Missing userId in metadata task payload", {
      status: 400,
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: routeProjectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  if (project.userId !== userId) {
    return new Response("Forbidden project metadata update", { status: 403 });
  }

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
    projectId: routeProjectId,
    projectTitle,
    projectDescription,
  });
  await prisma.project.update({
    where: { id: routeProjectId },
    data: {
      title: projectTitle,
      description: projectDescription,
    },
  });

  return new Response(
    "Background meta-data processing completed for project " + routeProjectId,
  );
});
