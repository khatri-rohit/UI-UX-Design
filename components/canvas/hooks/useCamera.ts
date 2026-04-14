"use client";

import { useCallback, useMemo, useState } from "react";
import { CanvasCamera, CanvasFrameData, CanvasViewport } from "../types";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function getFrameBounds(frames: CanvasFrameData[]) {
  const minX = Math.min(...frames.map((frame) => frame.x));
  const minY = Math.min(...frames.map((frame) => frame.y));
  const maxX = Math.max(...frames.map((frame) => frame.x + frame.w));
  const maxY = Math.max(...frames.map((frame) => frame.y + frame.h));

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export function useCamera(initialCamera: CanvasCamera = { x: 0, y: 0, z: 1 }) {
  const [camera, setCamera] = useState<CanvasCamera>(initialCamera);

  const panBy = useCallback((dx: number, dy: number) => {
    setCamera((current) => ({
      ...current,
      x: current.x - dx / current.z,
      y: current.y - dy / current.z,
    }));
  }, []);

  const zoomAt = useCallback(
    (delta: number, origin: { x: number; y: number }) => {
      setCamera((current) => {
        const nextZoom = clampZoom(current.z * (1 - delta * 0.01));
        const dx = origin.x / current.z - origin.x / nextZoom;
        const dy = origin.y / current.z - origin.y / nextZoom;

        return {
          x: current.x - dx,
          y: current.y - dy,
          z: nextZoom,
        };
      });
    },
    [],
  );

  const zoomToRect = useCallback(
    (
      rect: { x: number; y: number; w: number; h: number },
      viewport: CanvasViewport,
    ) => {
      if (!rect.w || !rect.h || !viewport.w || !viewport.h) {
        return;
      }

      const padding = 60;
      const scaleX = (viewport.w - padding * 2) / rect.w;
      const scaleY = (viewport.h - padding * 2) / rect.h;
      const z = clampZoom(Math.min(scaleX, scaleY));

      const x = -(rect.x - (viewport.w / z - rect.w) / 2);
      const y = -(rect.y - (viewport.h / z - rect.h) / 2);

      setCamera({ x, y, z });
    },
    [],
  );

  const zoomToFit = useCallback(
    (frames: CanvasFrameData[], viewport: CanvasViewport) => {
      if (!frames.length) {
        return;
      }

      const bounds = getFrameBounds(frames);
      zoomToRect(bounds, viewport);
    },
    [zoomToRect],
  );

  const api = useMemo(
    () => ({
      camera,
      setCamera,
      panBy,
      zoomAt,
      zoomToRect,
      zoomToFit,
    }),
    [camera, panBy, zoomAt, zoomToRect, zoomToFit],
  );

  return api;
}
