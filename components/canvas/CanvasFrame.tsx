"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  loadSandpackClient,
  SandpackClient,
} from "@codesandbox/sandpack-client";
import { buildSandpackFiles } from "@/lib/sandpackTemplate";
import { CanvasFrameData } from "./types";

interface CanvasFrameProps {
  frame: CanvasFrameData;
  onResize?: (id: string, w: number, h: number) => void;
  onPointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    frame: CanvasFrameData,
  ) => void;
  onPointerMove?: (
    event: React.PointerEvent<HTMLDivElement>,
    frame: CanvasFrameData,
  ) => void;
  onPointerUp?: (
    event: React.PointerEvent<HTMLDivElement>,
    frame: CanvasFrameData,
  ) => void;
  onPointerCancel?: (
    event: React.PointerEvent<HTMLDivElement>,
    frame: CanvasFrameData,
  ) => void;
  isDragging?: boolean;
  isSpacePanning?: boolean;
}

export const CanvasFrame = memo(function CanvasFrame({
  frame,
  onResize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  isDragging,
  isSpacePanning,
}: CanvasFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const clientRef = useRef<SandpackClient | null>(null);
  const { id, x, y, w, h, platform, content, state, screenName } = frame;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "frame-dimensions") return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const reportedW = Number(event.data.width) || 0;
      const reportedH = Number(event.data.height) || 0;
      if (!reportedW || !reportedH) return;

      const nextW =
        platform === "web"
          ? Math.min(Math.max(Math.ceil(reportedW), 1440), 4096)
          : w;
      const nextH =
        platform === "web"
          ? Math.min(Math.max(Math.ceil(reportedH), 220), 20000)
          : Math.min(Math.max(Math.ceil(reportedH), 560), 2200);

      if (Math.abs(nextW - w) < 4 && Math.abs(nextH - h) < 4) {
        return;
      }

      onResize?.(id, nextW, nextH);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id, onResize, platform, w, h]);

  useEffect(() => {
    if (state !== "done" || !content || !iframeRef.current) return;

    const nextSandbox = {
      files: buildSandpackFiles(content),
      entry: "/index.tsx",
      template: "create-react-app-typescript" as const,
    };

    if (clientRef.current) {
      clientRef.current.updateSandbox(nextSandbox);
      return;
    }

    void loadSandpackClient(iframeRef.current, nextSandbox, {
      showOpenInCodeSandbox: false,
      showErrorScreen: true,
      showLoadingScreen: true,
      externalResources: [
        "https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,container-queries",
      ],
    }).then((client) => {
      clientRef.current = client;
    });
  }, [content, state]);

  useEffect(() => {
    return () => {
      clientRef.current?.destroy();
    };
  }, []);

  const statusTone = useMemo(() => {
    if (state === "done") return { bg: "#dcfce7", fg: "#166534" };
    if (state === "error") return { bg: "#fee2e2", fg: "#991b1b" };
    return { bg: "#e2e8f0", fg: "#334155" };
  }, [state]);

  return (
    <div
      data-frame-id={id}
      className={`absolute overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl shadow-black/40 ${
        isDragging
          ? "cursor-grabbing"
          : isSpacePanning
            ? "cursor-grab"
            : "cursor-default"
      }`}
      style={{ left: x, top: y, width: w, height: h }}
      onPointerDown={(event) => onPointerDown?.(event, frame)}
      onPointerMove={(event) => onPointerMove?.(event, frame)}
      onPointerUp={(event) => onPointerUp?.(event, frame)}
      onPointerCancel={(event) => onPointerCancel?.(event, frame)}
    >
      <div className="absolute -top-7 left-0 text-[10px] font-mono tracking-widest text-white/50">
        {screenName}
      </div>

      {(state === "skeleton" || state === "streaming") && (
        <div className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold text-emerald-900">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          {state === "streaming"
            ? `Generating ${screenName}`
            : "Preparing screen"}
        </div>
      )}

      {state === "skeleton" && <FrameSkeleton />}
      {state === "streaming" && <FrameStreaming />}
      {state === "compiling" && (
        <div className="flex h-full items-center justify-center bg-slate-100 text-xs text-slate-600">
          Compiling preview...
        </div>
      )}
      {state === "done" && (
        <iframe
          ref={iframeRef}
          className="h-full w-full border-none"
          allow="cross-origin-isolated"
        />
      )}
      {state === "error" && (
        <div className="h-full overflow-auto bg-red-50 p-3 font-mono text-xs text-red-700">
          Compile failed
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize"
        style={{ background: statusTone.bg, color: statusTone.fg }}
      >
        {state}
      </div>
    </div>
  );
});

function FrameSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-2 bg-white p-3">
      {[96, 82, 100, 74, 88].map((width, index) => (
        <div
          key={`${width}-${index}`}
          className="animate-pulse rounded-md bg-slate-200"
          style={{
            height: index === 0 ? 88 : 12,
            width: `${width}%`,
          }}
        />
      ))}
    </div>
  );
}

function FrameStreaming() {
  return (
    <div className="flex h-full w-full flex-col gap-2 bg-white p-3">
      <div className="h-1.5 w-14 animate-pulse rounded-full bg-slate-300" />
      <div className="font-mono text-xs text-slate-500">Receiving code...</div>
    </div>
  );
}
