"use client";

import { SquareDashed, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: CanvasToolbarProps) {
  return (
    <div
      data-canvas-no-pan="true"
      className="absolute left-5 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-5 rounded-md border border-input bg-card/95 p-1 py-3 shadow-md backdrop-blur-sm"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onZoomIn}
        className="cursor-pointer"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onZoomOut}
        className="cursor-pointer"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onFit}
        className="cursor-pointer"
      >
        <SquareDashed className="size-4" />
      </Button>
      <div className="min-w-12 px-2 text-center text-xs text-muted-foreground">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
