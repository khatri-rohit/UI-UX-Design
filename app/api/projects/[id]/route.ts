import { isAuthError, requireAuthContext } from "@/lib/get-auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuthContext({
      request: req,
      eventType: "project.fetched",
    });

    if (!authContext.appUserId) {
      return NextResponse.json(
        {
          error: true,
          message: "Unauthorized: Missing user ID in auth context",
          data: null,
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          error: true,
          message: "Project ID is required",
          data: null,
        },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id, userId: authContext.appUserId },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: true,
          message: "Project not found",
          data: null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: "Project fetched successfully",
        data: {
          id: project.id,
          title: project.title,
          status: project.status,
          initialPrompt: project.initialPrompt,
          canvasState: project.canvasState,
          thumbnailUrl: project.thumbnailUrl,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        {
          error: true,
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error: true,
        message: "An error occurred while fetching the project",
        data: null,
        details: error,
      },
      { status: 500 },
    );
  }
}
const ProjectStatus = ["PENDING", "GENERATING", "ACTIVE", "ARCHIVED"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuthContext({
      request: req,
      eventType: "project.updated",
    });

    if (!authContext.appUserId) {
      return NextResponse.json(
        {
          error: true,
          message: "Unauthorized: Missing user ID in auth context",
          data: null,
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          error: true,
          message: "Project ID is required",
          data: null,
        },
        { status: 400 },
      );
    }
    const body = (await req.json()) as {
      status?: (typeof ProjectStatus)[number];
      canvasState?: unknown;
    };

    const hasStatus = typeof body.status === "string";
    const hasCanvasState = "canvasState" in body;
    const canvasStateUpdate = hasCanvasState
      ? body.canvasState === null
        ? Prisma.DbNull
        : (body.canvasState as Prisma.InputJsonValue)
      : undefined;

    if (!hasStatus && !hasCanvasState) {
      return NextResponse.json(
        {
          error: true,
          message: "No updatable fields provided",
          data: null,
        },
        { status: 400 },
      );
    }

    if (hasStatus && !ProjectStatus.includes(body.status!)) {
      return NextResponse.json(
        {
          error: true,
          message: "Invalid status value",
          data: null,
        },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id, userId: authContext.appUserId },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: true,
          message: "Project not found",
          data: null,
        },
        { status: 404 },
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(hasStatus && { status: body.status }),
        ...(hasCanvasState && { canvasState: canvasStateUpdate }),
      },
    });

    return NextResponse.json(
      {
        error: false,
        message: "Project updated successfully",
        data: {
          status: updatedProject.status,
          canvasState: updatedProject.canvasState,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        {
          error: true,
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error: true,
        message: "An error occurred while updating the project status",
        data: null,
        details: error,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuthContext({
      request: req,
      eventType: "project.deleted",
    });

    if (!authContext.appUserId) {
      return NextResponse.json(
        {
          error: true,
          message: "Unauthorized: Missing user ID in auth context",
          data: null,
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          error: true,
          message: "Project ID is required",
          data: null,
        },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id, userId: authContext.appUserId },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: true,
          message: "Project not found",
          data: null,
        },
        { status: 404 },
      );
    }
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        error: false,
        message: "Project deleted successfully",
        data: {
          error: false,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        {
          error: true,
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error: true,
        message: "An error occurred while deleting the project",
        data: null,
        details: error,
      },
      { status: 500 },
    );
  }
}
