"use client";

import { useEffect, useRef } from "react";
import { CanvasCamera, CanvasViewport } from "./types";

interface CanvasGridProps {
  camera: CanvasCamera;
  viewport: CanvasViewport;
  size?: number;
}

export function CanvasGrid({ camera, viewport, size = 24 }: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport.w || !viewport.h) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.w * dpr);
    canvas.height = Math.floor(viewport.h * dpr);
    canvas.style.width = `${viewport.w}px`;
    canvas.style.height = `${viewport.h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewport.w, viewport.h);

    const pageBounds = {
      minX: -camera.x,
      minY: -camera.y,
      maxX: -camera.x + viewport.w / camera.z,
      maxY: -camera.y + viewport.h / camera.z,
    };

    const startX = Math.ceil(pageBounds.minX / size) * size;
    const startY = Math.ceil(pageBounds.minY / size) * size;
    const endX = Math.floor(pageBounds.maxX / size) * size;
    const endY = Math.floor(pageBounds.maxY / size) * size;

    const majorStep = 2;
    const majorDot = "#2f2f2f";
    const majorRadius = 2;

    for (let pageY = startY, row = 0; pageY <= endY; pageY += size, row += 1) {
      if (row % majorStep !== 0) {
        continue;
      }

      const canvasY = (pageY + camera.y) * camera.z;

      for (
        let pageX = startX, col = 0;
        pageX <= endX;
        pageX += size, col += 1
      ) {
        if (col % majorStep !== 0) {
          continue;
        }

        const canvasX = (pageX + camera.x) * camera.z;

        ctx.beginPath();
        ctx.fillStyle = majorDot;
        ctx.arc(canvasX, canvasY, majorRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [camera, viewport, size]);

  return <canvas className="absolute inset-0 z-0" ref={canvasRef} />;
}
