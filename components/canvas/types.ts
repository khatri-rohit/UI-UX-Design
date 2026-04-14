import { GenerationPlatform } from "@/lib/types";

export type FrameRenderState =
  | "skeleton"
  | "streaming"
  | "compiling"
  | "done"
  | "error";

export interface CanvasFrameData {
  id: string;
  screenName: string;
  platform: GenerationPlatform;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  state: FrameRenderState;
}

export interface CanvasCamera {
  x: number;
  y: number;
  z: number;
}

export interface CanvasViewport {
  w: number;
  h: number;
}

export interface CanvasHandle {
  getCamera: () => CanvasCamera;
  setCamera: (camera: CanvasCamera) => void;
  panBy: (dx: number, dy: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: (frames?: CanvasFrameData[]) => void;
  getViewportSize: () => CanvasViewport;
}
