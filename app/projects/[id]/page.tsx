/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { JetBrains_Mono } from "next/font/google";

import { Canvas, CanvasFrameData, CanvasHandle } from "@/components/canvas";
import logger from "@/lib/logger";
import {
  getGenerationLayout,
  getInitialDimensionsForPlatform,
} from "@/lib/canvasLayout";
import { GenerationPlatform } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Sparkles } from "lucide-react";
import SelectModel from "@/components/SelectModel";
import { cn } from "@/lib/utils";
import ProjectMenuPanel from "@/components/projects/TopMenu";
import { useParams, useRouter } from "next/navigation";
import {
  useProjectCanvasStateUpdateMutation,
  useProjectDeleteMutation,
  useProjectQuery,
  useProjectThumbnailUpdateMutation,
  useProjectStatusUpdateMutation,
} from "@/lib/projects/queries";
import { useUserActivityStore } from "@/providers/zustand-provider";

const DASHBOARD_MODEL_ALIASES: string[] = [
  "gemma4:31b",
  "gpt-oss:120b",
  "deepseek-v3.1:671b",
  "qwen3.5",
  "deepseek-v3.2:cloud",
];

const CODE_CHUNK_FLUSH_MS = 120;

type ProjectActionId =
  | "all-projects"
  | "share"
  | "download"
  | "edit"
  | "delete";

type CanvasSnapshot = {
  version: 1;
  camera?: { x: number; y: number; z: number };
  frames: CanvasFrameData[];
};

function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeSnapshot = value as {
    frames?: unknown;
    camera?: unknown;
  };

  if (!Array.isArray(maybeSnapshot.frames)) {
    return false;
  }

  return true;
}

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const StudioPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: project,
    isLoading: projectLoading,
    isError,
    error: projectError,
  } = useProjectQuery(projectId);

  const { mutate: updateProjectStatus } = useProjectStatusUpdateMutation();
  const { mutate: updateProjectCanvasState } =
    useProjectCanvasStateUpdateMutation();
  const {
    mutate: deleteProject,
    data: deleteProjectData,
    error: deleteError,
    isSuccess: isDeleteSuccess,
  } = useProjectDeleteMutation();
  const { mutateAsync: updateProjectThumbnail } =
    useProjectThumbnailUpdateMutation();

  const model = useUserActivityStore((state) => state.model);
  const setModel = useUserActivityStore((state) => state.setModel);
  const spec = useUserActivityStore((state) => state.spec);
  const setSpec = useUserActivityStore((state) => state.setSpec);

  const canvasRef = useRef<CanvasHandle | null>(null);
  const domRef = useRef<HTMLDivElement | null>(null);
  const screenBuffersRef = useRef<Map<string, string>>(new Map());
  const frameIdsRef = useRef<Map<string, string>>(new Map());
  const framesRef = useRef<CanvasFrameData[]>([]);
  const pendingContentByFrameIdRef = useRef<Map<string, string>>(new Map());
  const codeFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUploadingThumbnailRef = useRef(false);
  const hasInitiatedGenerationRef = useRef(false);
  const hasRestoredSnapshotRef = useRef(false);

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStreamingScreen, setActiveStreamingScreen] = useState<
    string | null
  >(null);
  const [frames, setFrames] = useState<CanvasFrameData[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);

  const canGenerate = !!prompt.trim() && !isGenerating;
  const models = [...DASHBOARD_MODEL_ALIASES];

  const commitFrames = useCallback(
    (
      updater:
        | CanvasFrameData[]
        | ((previous: CanvasFrameData[]) => CanvasFrameData[]),
    ) => {
      setFrames((previous) => {
        const nextFrames =
          typeof updater === "function"
            ? (updater as (previous: CanvasFrameData[]) => CanvasFrameData[])(
                previous,
              )
            : updater;

        framesRef.current = nextFrames;
        return nextFrames;
      });
    },
    [],
  );

  const buildSnapshot = useCallback((): CanvasSnapshot => {
    return {
      version: 1,
      camera: canvasRef.current?.getCamera(),
      frames: framesRef.current,
    };
  }, []);

  const persistCanvasState = useCallback(() => {
    updateProjectCanvasState({
      id: projectId,
      canvasState: buildSnapshot(),
    });
  }, [buildSnapshot, projectId, updateProjectCanvasState]);

  const schedulePersistCanvasState = useCallback(
    (delay = 700) => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }

      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null;
        persistCanvasState();
      }, delay);
    },
    [persistCanvasState],
  );

  const flushBufferedContentUpdates = useCallback(() => {
    const pendingMap = pendingContentByFrameIdRef.current;
    if (pendingMap.size === 0) {
      return;
    }

    const updates = new Map(pendingMap);
    pendingContentByFrameIdRef.current = new Map();

    commitFrames((previous) => {
      let hasChanges = false;

      const nextFrames: CanvasFrameData[] = previous.map((frame) => {
        const content = updates.get(frame.id);
        if (content === undefined) {
          return frame;
        }

        if (frame.content === content && frame.state === "streaming") {
          return frame;
        }

        hasChanges = true;
        return {
          ...frame,
          content,
          state: "streaming",
        };
      });

      return hasChanges ? nextFrames : previous;
    });
  }, [commitFrames]);

  const scheduleBufferedContentUpdates = useCallback(() => {
    if (codeFlushTimeoutRef.current) {
      return;
    }

    codeFlushTimeoutRef.current = setTimeout(() => {
      codeFlushTimeoutRef.current = null;
      flushBufferedContentUpdates();
    }, CODE_CHUNK_FLUSH_MS);
  }, [flushBufferedContentUpdates]);

  const onCapture = useCallback(
    async (frameIds: string[]) => {
      if (
        !domRef.current ||
        isUploadingThumbnailRef.current ||
        !frameIds.length
      ) {
        return;
      }

      isUploadingThumbnailRef.current = true;
      try {
        const primaryFrame = domRef.current.querySelector<HTMLElement>(
          `[data-frame-id="${frameIds[0]}"]`,
        );
        const captureTarget =
          frameIds.length === 1 && primaryFrame ? primaryFrame : domRef.current;

        const thumbnailBlob = await htmlToImage.toBlob(captureTarget, {
          cacheBust: false,
          pixelRatio: 1,
          backgroundColor: "#111111",
          filter: (node) => node.tagName !== "IFRAME",
        });

        if (!thumbnailBlob) {
          logger.warn("Thumbnail capture returned an empty blob.");
          return;
        }

        await updateProjectThumbnail({
          id: projectId,
          thumbnail: thumbnailBlob,
        });
        logger.info("Project thumbnail updated.", { projectId });
      } catch (error) {
        logger.error("Failed to capture and upload project thumbnail:", error);
      } finally {
        isUploadingThumbnailRef.current = false;
      }
    },
    [projectId, updateProjectThumbnail],
  );

  const handleEvent = useCallback(
    (event: any) => {
      if (event.type === "spec") {
        const eventSpec = event.spec as {
          screens?: string[];
          platform?: string;
        };

        const platform: GenerationPlatform =
          eventSpec.platform === "mobile" ? "mobile" : "web";
        const screenNames = Array.isArray(eventSpec.screens)
          ? eventSpec.screens.filter(
              (name): name is string =>
                typeof name === "string" && name.trim().length > 0,
            )
          : [];

        const screensWithDims: Array<{ name: string; w: number; h: number }> =
          screenNames.map((screenName) => ({
            name: screenName,
            ...getInitialDimensionsForPlatform(screenName, platform),
          }));

        const positions = getGenerationLayout(
          framesRef.current,
          screensWithDims,
        );
        const nextFrameIds = new Map<string, string>();
        const nextFrames: CanvasFrameData[] = screensWithDims.map(
          (screen, i) => {
            const id = `frame-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
            nextFrameIds.set(screen.name, id);

            return {
              id,
              x: positions[i].x,
              y: positions[i].y,
              w: screen.w,
              h: screen.h,
              screenName: screen.name,
              platform,
              content: "",
              state: "skeleton",
            };
          },
        );

        frameIdsRef.current = nextFrameIds;
        screenBuffersRef.current = new Map();

        commitFrames((previous) => {
          const combined = [...previous, ...nextFrames];
          requestAnimationFrame(() => {
            canvasRef.current?.zoomToFit(combined);
          });
          return combined;
        });
        return;
      }

      if (event.type === "screen_start") {
        const id = frameIdsRef.current.get(event.screen);
        if (!id) {
          return;
        }

        screenBuffersRef.current.set(event.screen, "");
        setActiveStreamingScreen(event.screen);

        commitFrames((previous) =>
          previous.map((frame) =>
            frame.id === id ? { ...frame, state: "streaming" } : frame,
          ),
        );
        return;
      }

      if (event.type === "screen_reset") {
        const id = frameIdsRef.current.get(event.screen);
        if (!id) {
          return;
        }

        screenBuffersRef.current.set(event.screen, "");
        setActiveStreamingScreen(event.screen);

        commitFrames((previous) =>
          previous.map((frame) =>
            frame.id === id
              ? {
                  ...frame,
                  content: "",
                  state: "streaming",
                }
              : frame,
          ),
        );
        return;
      }

      if (event.type === "code_chunk") {
        const id = frameIdsRef.current.get(event.screen);
        if (!id) {
          return;
        }

        const previousContent =
          screenBuffersRef.current.get(event.screen) ?? "";
        const nextContent = previousContent + String(event.token ?? "");
        screenBuffersRef.current.set(event.screen, nextContent);
        pendingContentByFrameIdRef.current.set(id, nextContent);
        scheduleBufferedContentUpdates();
        return;
      }

      if (event.type === "screen_done") {
        flushBufferedContentUpdates();

        const id = frameIdsRef.current.get(event.screen);
        if (!id) {
          return;
        }

        const content = screenBuffersRef.current.get(event.screen) ?? "";

        commitFrames((previous) =>
          previous.map((frame) =>
            frame.id === id
              ? {
                  ...frame,
                  state: "done",
                  content,
                }
              : frame,
          ),
        );

        screenBuffersRef.current.delete(event.screen);
        setActiveStreamingScreen((current) =>
          current === event.screen ? null : current,
        );
        return;
      }

      if (event.type === "done") {
        flushBufferedContentUpdates();
        setActiveStreamingScreen(null);
        updateProjectStatus({ id: projectId, status: "ACTIVE" });

        const newRunFrameIds = [...frameIdsRef.current.values()];
        if (newRunFrameIds.length > 0) {
          const newRunFrames = framesRef.current.filter((frame) =>
            newRunFrameIds.includes(frame.id),
          );

          requestAnimationFrame(() => {
            canvasRef.current?.zoomToFit(newRunFrames);
          });

          if (captureTimeoutRef.current) {
            clearTimeout(captureTimeoutRef.current);
          }

          captureTimeoutRef.current = setTimeout(() => {
            void onCapture(newRunFrameIds);
            captureTimeoutRef.current = null;
          }, 2000);
        }

        schedulePersistCanvasState(300);
      }
    },
    [
      commitFrames,
      flushBufferedContentUpdates,
      onCapture,
      projectId,
      scheduleBufferedContentUpdates,
      schedulePersistCanvasState,
      updateProjectStatus,
    ],
  );

  const handleGenerate = useCallback(async () => {
    if (!project) {
      logger.error("Project not found");
      return;
    }

    setIsGenerating(true);
    setActiveStreamingScreen(null);

    pendingContentByFrameIdRef.current = new Map();
    screenBuffersRef.current = new Map();

    try {
      if (!canvasRef.current) {
        throw new Error("Canvas not initialized");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: project.status === "PENDING" ? project.initialPrompt : prompt,
          platform: spec ?? "web",
          projectId,
        }),
      });

      setPrompt("");
      logger.info("Generation request sent. Awaiting response...");

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        logger.error("Error response: ", errorData);
        throw new Error(errorData.message || "Generation failed");
      }

      updateProjectStatus({ id: projectId, status: "GENERATING" });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;

          const event = JSON.parse(raw);
          if (event.type === "error") {
            throw new Error(String(event.message ?? "Generation failed"));
          }
          handleEvent(event);
        }
      }
    } catch (error) {
      updateProjectStatus({ id: projectId, status: "ARCHIVED" });
      logger.error("Error generating layout:", error);
    } finally {
      if (codeFlushTimeoutRef.current) {
        clearTimeout(codeFlushTimeoutRef.current);
        codeFlushTimeoutRef.current = null;
      }
      flushBufferedContentUpdates();
      setActiveStreamingScreen(null);
      setIsGenerating(false);
    }
  }, [
    flushBufferedContentUpdates,
    handleEvent,
    model,
    project,
    projectId,
    prompt,
    spec,
    updateProjectStatus,
  ]);

  const handleCanvasReady = useCallback((handle: CanvasHandle) => {
    canvasRef.current = handle;
    setCanvasReady(true);
  }, []);

  const handleFrameResize = useCallback(
    (id: string, w: number, h: number) => {
      commitFrames((previous) =>
        previous.map((frame) =>
          frame.id === id
            ? {
                ...frame,
                w,
                h,
              }
            : frame,
        ),
      );

      schedulePersistCanvasState();
    },
    [commitFrames, schedulePersistCanvasState],
  );

  const handleFrameMove = useCallback(
    (id: string, x: number, y: number) => {
      commitFrames((previous) => {
        let hasChanges = false;

        const nextFrames = previous.map((frame) => {
          if (frame.id !== id) {
            return frame;
          }

          if (frame.x === x && frame.y === y) {
            return frame;
          }

          hasChanges = true;
          return {
            ...frame,
            x,
            y,
          };
        });

        return hasChanges ? nextFrames : previous;
      });

      schedulePersistCanvasState();
    },
    [commitFrames, schedulePersistCanvasState],
  );

  function handleMenuClick(action: ProjectActionId) {
    switch (action) {
      case "all-projects":
        router.push("/");
        break;
      case "share":
        alert("Share functionality is not implemented yet.");
        break;
      case "download":
        alert("Download functionality is not implemented yet.");
        break;
      case "edit":
        alert("Edit functionality is not implemented yet.");
        break;
      case "delete": {
        const confirmed = confirm(
          "Are you sure you want to delete this project? This action cannot be undone.",
        );
        if (confirmed) {
          deleteProject({ id: projectId });
        }
        break;
      }
      default:
        alert("Unknown action: " + action);
        break;
    }
  }

  useEffect(() => {
    if (projectLoading || isError || !project || !canvasReady) {
      return;
    }

    if (hasRestoredSnapshotRef.current) {
      return;
    }

    const snapshot = project.canvasState;
    if (!isCanvasSnapshot(snapshot) || !snapshot.frames.length) {
      return;
    }

    hasRestoredSnapshotRef.current = true;
    const restoredFrames = snapshot.frames;
    commitFrames(restoredFrames);

    const restoredPlatform = restoredFrames[0]?.platform;
    if (restoredPlatform === "web" || restoredPlatform === "mobile") {
      setSpec(restoredPlatform);
    }

    requestAnimationFrame(() => {
      const restoredCamera = snapshot.camera;
      if (
        restoredCamera &&
        typeof restoredCamera === "object" &&
        "x" in restoredCamera &&
        "y" in restoredCamera &&
        "z" in restoredCamera
      ) {
        canvasRef.current?.setCamera({
          x: Number((restoredCamera as { x: number }).x) || 0,
          y: Number((restoredCamera as { y: number }).y) || 0,
          z: Number((restoredCamera as { z: number }).z) || 1,
        });
      } else {
        canvasRef.current?.zoomToFit(restoredFrames);
      }
    });
  }, [canvasReady, commitFrames, isError, project, projectLoading, setSpec]);

  useEffect(() => {
    if (projectLoading || isError) return;

    logger.info("Project info:", project);
    logger.warn("Project error:", projectError);

    if (!project) {
      logger.error("Project not found");
      return;
    }

    if (project.status === "PENDING" && !hasInitiatedGenerationRef.current) {
      hasInitiatedGenerationRef.current = true;
      void handleGenerate();
    }
  }, [handleGenerate, isError, project, projectError, projectLoading]);

  useEffect(() => {
    if (deleteProjectData?.error === false) {
      logger.info("Project deleted successfully:", deleteProjectData);
      router.push("/");
    }
  }, [deleteProjectData, deleteError, router, isDeleteSuccess]);

  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }

      if (codeFlushTimeoutRef.current) {
        clearTimeout(codeFlushTimeoutRef.current);
      }

      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "dark relative h-screen w-full overflow-hidden bg-background text-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        "[--radius:2px] [--background:#111111] [--foreground:#e2e2e2]",
        "[--card:#1a1a1a] [--card-foreground:#e2e2e2] [--popover:#1a1a1a] [--popover-foreground:#f9f9f9]",
        "[--primary:#ffffff] [--primary-foreground:#000000] [--secondary:#1a1a1a] [--secondary-foreground:#f1f1f1]",
        "[--muted:#1a1a1a] [--muted-foreground:#777777] [--accent:#222222] [--accent-foreground:#f9f9f9]",
        "[--destructive:#ba1a1a] [--border:#222222] [--input:#333333] [--ring:#777777]",
      )}
    >
      <div className="absolute inset-0 z-40" ref={domRef}>
        <Canvas
          className="absolute inset-0"
          frames={frames}
          onFrameResize={handleFrameResize}
          onFrameMove={handleFrameMove}
          onReady={handleCanvasReady}
        />
      </div>

      <ProjectMenuPanel
        title={project?.title || "Untitled Project"}
        handleMenuClick={handleMenuClick}
      />

      <div className="pointer-events-none absolute inset-0 z-50">
        <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(980px,calc(100%-1.5rem))] -translate-x-1/2 rounded-md border border-input bg-card/90 p-2.5 shadow-2xl shadow-black/30 backdrop-blur-[1px]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 border border-input bg-muted p-1">
              <Button
                type="button"
                size="xs"
                variant={spec === "web" ? "secondary" : "ghost"}
                onClick={() => setSpec("web")}
                className={cn(
                  "h-7 px-2",
                  spec === "mobile" && "text-muted-foreground",
                )}
              >
                <Monitor data-icon="inline-start" className="size-4" />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.18em]",
                    mono.className,
                  )}
                >
                  Web
                </span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant={spec === "mobile" ? "secondary" : "ghost"}
                onClick={() => setSpec("mobile")}
                className={cn(
                  "h-7 px-2",
                  spec === "web" && "text-muted-foreground",
                )}
              >
                <Smartphone data-icon="inline-start" className="size-4" />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.18em]",
                    mono.className,
                  )}
                >
                  Mobile
                </span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {isGenerating && (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground",
                    mono.className,
                  )}
                >
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {activeStreamingScreen
                    ? `Generating: ${activeStreamingScreen}`
                    : "Preparing generation..."}
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
                  mono.className,
                )}
              >
                Use Enter to generate and Shift+Enter for a new line
              </span>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <SelectModel list={models} setModel={setModel} model={model} />

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canGenerate) void handleGenerate();
                }
              }}
              placeholder="What would you like to change or create?"
              className={cn(
                "scrolling h-15 min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition",
                "placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30",
                isGenerating && "cursor-not-allowed opacity-80",
                mono.className,
              )}
            />

            <Button
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="h-11 rounded-md px-4"
            >
              <Sparkles
                className={`size-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudioPageWrapper = () => {
  return (
    <Suspense>
      <StudioPage />
    </Suspense>
  );
};

export default StudioPageWrapper;
