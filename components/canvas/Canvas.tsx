"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasFrame } from "./CanvasFrame";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasToolbar } from "./CanvasToolbar";
import { useCamera } from "./hooks/useCamera";
import {
  CanvasCamera,
  CanvasFrameData,
  CanvasHandle,
  CanvasViewport,
} from "./types";

interface CanvasProps {
  frames: CanvasFrameData[];
  onFrameResize?: (id: string, w: number, h: number) => void;
  onFrameMove?: (id: string, x: number, y: number) => void;
  onReady?: (handle: CanvasHandle) => void;
  className?: string;
}

const MIN_CANVAS_ZOOM = 0.05;
const MAX_CANVAS_ZOOM = 4;
const RESIZE_ZOOM_ANIMATION_MS = 180;

function clampCanvasZoom(zoom: number) {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom));
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function Canvas({
  frames,
  onFrameResize,
  onFrameMove,
  onReady,
  className,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const { camera, setCamera, panBy, zoomAt, zoomToFit } = useCamera();
  const cameraRef = useRef(camera);
  const onFrameMoveRef = useRef(onFrameMove);
  const isSpacePressedRef = useRef(isSpacePressed);
  const frameMapRef = useRef<Map<string, CanvasFrameData>>(new Map());
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const frameDragRafRef = useRef<number | null>(null);
  const pendingFrameMoveRef = useRef<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const frameDragRef = useRef<{
    active: boolean;
    frameId: string | null;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    frameId: null,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    onFrameMoveRef.current = onFrameMove;
  }, [onFrameMove]);

  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  useEffect(() => {
    frameMapRef.current = new Map(frames.map((frame) => [frame.id, frame]));
  }, [frames]);

  const getViewportSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return { w: 0, h: 0 };
    }

    return {
      w: el.clientWidth,
      h: el.clientHeight,
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    const { w, h } = getViewportSize();
    zoomAt(-10, { x: w / 2, y: h / 2 });
  }, [getViewportSize, zoomAt]);

  const handleZoomOut = useCallback(() => {
    const { w, h } = getViewportSize();
    zoomAt(10, { x: w / 2, y: h / 2 });
  }, [getViewportSize, zoomAt]);

  const handleFitToFrames = useCallback(
    (targetFrames: CanvasFrameData[] = frames) => {
      const nextViewport = getViewportSize();
      zoomToFit(targetFrames, nextViewport);
    },
    [frames, getViewportSize, zoomToFit],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateViewport = () => {
      setViewport(getViewportSize());
    };

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(containerRef.current);
    const rafId = requestAnimationFrame(updateViewport);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [getViewportSize]);

  const pointerDrag = useRef<{
    active: boolean;
    x: number;
    y: number;
  }>({
    active: false,
    x: 0,
    y: 0,
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target;
      const htmlTarget = target instanceof HTMLElement ? target : null;
      const isPanButton =
        event.button === 1 ||
        event.button === 2 ||
        (event.button === 0 && isSpacePressedRef.current);

      if (!isPanButton) {
        return;
      }

      if (htmlTarget?.closest('[data-canvas-no-pan="true"]')) {
        return;
      }

      pointerDrag.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
      };
      setIsPanning(true);

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDrag.current.active) {
        return;
      }

      const dx = event.clientX - pointerDrag.current.x;
      const dy = event.clientY - pointerDrag.current.y;

      pointerDrag.current.x = event.clientX;
      pointerDrag.current.y = event.clientY;

      panBy(dx, dy);
    },
    [panBy],
  );

  const onPointerUp = useCallback(() => {
    pointerDrag.current.active = false;
    setIsPanning(false);
  }, []);

  const onPointerCancel = useCallback(() => {
    pointerDrag.current.active = false;
    setIsPanning(false);
  }, []);

  const flushPendingFrameMove = useCallback(() => {
    const pendingMove = pendingFrameMoveRef.current;
    const moveFrame = onFrameMoveRef.current;

    if (!pendingMove || !moveFrame) {
      return;
    }

    pendingFrameMoveRef.current = null;
    moveFrame(pendingMove.id, pendingMove.x, pendingMove.y);
  }, []);

  const onFramePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, frame: CanvasFrameData) => {
      const moveFrame = onFrameMoveRef.current;

      if (!moveFrame || event.button !== 0 || isSpacePressedRef.current) {
        return;
      }

      if (event.target instanceof HTMLIFrameElement) {
        return;
      }

      const frameState = frameMapRef.current.get(frame.id);
      if (!frameState) {
        return;
      }

      frameDragRef.current = {
        active: true,
        frameId: frame.id,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: frameState.x,
        originY: frameState.y,
      };
      setDraggingFrameId(frame.id);

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onFramePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, frame: CanvasFrameData) => {
      const drag = frameDragRef.current;

      if (
        !drag.active ||
        drag.pointerId !== event.pointerId ||
        drag.frameId !== frame.id
      ) {
        return;
      }

      const zoom = cameraRef.current.z || 1;
      const nextX = Math.round(
        drag.originX + (event.clientX - drag.startClientX) / zoom,
      );
      const nextY = Math.round(
        drag.originY + (event.clientY - drag.startClientY) / zoom,
      );

      pendingFrameMoveRef.current = { id: frame.id, x: nextX, y: nextY };

      if (frameDragRafRef.current === null) {
        frameDragRafRef.current = requestAnimationFrame(() => {
          frameDragRafRef.current = null;
          flushPendingFrameMove();
        });
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [flushPendingFrameMove],
  );

  const stopFrameDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, frame: CanvasFrameData) => {
      const drag = frameDragRef.current;

      if (
        !drag.active ||
        drag.pointerId !== event.pointerId ||
        drag.frameId !== frame.id
      ) {
        return;
      }

      if (frameDragRafRef.current !== null) {
        cancelAnimationFrame(frameDragRafRef.current);
        frameDragRafRef.current = null;
      }

      flushPendingFrameMove();

      frameDragRef.current = {
        active: false,
        frameId: null,
        pointerId: null,
        startClientX: 0,
        startClientY: 0,
        originX: 0,
        originY: 0,
      };
      setDraggingFrameId(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [flushPendingFrameMove],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const rect = event.currentTarget.getBoundingClientRect();
        zoomAt(event.deltaY, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        return;
      }

      panBy(event.deltaX, event.deltaY);
    },
    [panBy, zoomAt],
  );

  const handle = useMemo<CanvasHandle>(
    () => ({
      getCamera: () => camera,
      setCamera,
      panBy,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      zoomToFit: handleFitToFrames,
      getViewportSize,
    }),
    [
      camera,
      getViewportSize,
      handleFitToFrames,
      handleZoomIn,
      handleZoomOut,
      panBy,
      setCamera,
    ],
  );

  const animateCameraTo = useCallback(
    (targetCamera: CanvasCamera, duration = RESIZE_ZOOM_ANIMATION_MS) => {
      const from = cameraRef.current;
      const unchanged =
        Math.abs(from.x - targetCamera.x) < 0.001 &&
        Math.abs(from.y - targetCamera.y) < 0.001 &&
        Math.abs(from.z - targetCamera.z) < 0.001;

      if (unchanged) {
        return;
      }

      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(progress);
        const nextCamera = {
          x: from.x + (targetCamera.x - from.x) * eased,
          y: from.y + (targetCamera.y - from.y) * eased,
          z: from.z + (targetCamera.z - from.z) * eased,
        };

        cameraRef.current = nextCamera;
        setCamera(nextCamera);

        if (progress < 1) {
          resizeAnimationFrameRef.current = requestAnimationFrame(step);
          return;
        }

        resizeAnimationFrameRef.current = null;
      };

      resizeAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [setCamera],
  );

  useEffect(() => {
    let lastRatio = window.devicePixelRatio || 1;
    let lastViewport = getViewportSize();
    let resizeRaf: number | null = null;

    const onResize = () => {
      if (resizeRaf !== null) {
        cancelAnimationFrame(resizeRaf);
      }

      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;

        const nextViewport = getViewportSize();
        if (!nextViewport.w || !nextViewport.h) {
          return;
        }

        const currentRatio = window.devicePixelRatio || 1;
        const previousCamera = cameraRef.current;

        if (!lastViewport.w || !lastViewport.h) {
          lastViewport = nextViewport;
        }

        const worldCenterX =
          lastViewport.w / (2 * previousCamera.z) - previousCamera.x;
        const worldCenterY =
          lastViewport.h / (2 * previousCamera.z) - previousCamera.y;

        const ratioChanged = currentRatio !== lastRatio;
        const targetZoom = ratioChanged
          ? clampCanvasZoom((previousCamera.z * lastRatio) / currentRatio)
          : previousCamera.z;

        animateCameraTo(
          {
            x: nextViewport.w / (2 * targetZoom) - worldCenterX,
            y: nextViewport.h / (2 * targetZoom) - worldCenterY,
            z: targetZoom,
          },
          ratioChanged ? RESIZE_ZOOM_ANIMATION_MS : 120,
        );

        lastRatio = currentRatio;
        lastViewport = nextViewport;
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (resizeRaf !== null) {
        cancelAnimationFrame(resizeRaf);
      }
      window.removeEventListener("resize", onResize);
    };
  }, [animateCameraTo, getViewportSize]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      if (isEditableElement(event.target) || isEditableElement(document.activeElement)) {
        return;
      }

      event.preventDefault();
      setIsSpacePressed(true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      setIsSpacePressed(false);
    };

    const onWindowBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      if (frameDragRafRef.current !== null) {
        cancelAnimationFrame(frameDragRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onReady?.(handle);
  }, [handle, onReady]);

  const worldTransform = `translate(${camera.x * camera.z}px, ${camera.y * camera.z}px) scale(${camera.z})`;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <CanvasGrid camera={camera} viewport={viewport} />

      <div
        className="absolute inset-0 origin-top-left"
        style={{ transform: worldTransform, transformOrigin: "0 0" }}
      >
        {frames.map((frame) => (
          <CanvasFrame
            key={frame.id}
            frame={frame}
            onResize={onFrameResize}
            onPointerDown={onFramePointerDown}
            onPointerMove={onFramePointerMove}
            onPointerUp={stopFrameDrag}
            onPointerCancel={stopFrameDrag}
            isDragging={draggingFrameId === frame.id}
            isSpacePanning={isSpacePressed}
          />
        ))}
      </div>

      <CanvasToolbar
        zoom={camera.z}
        onFit={() => handleFitToFrames()}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  );
}
