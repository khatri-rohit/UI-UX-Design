import { GenerationPlatform } from "./types";

const H_GAP = 100; // gap between screens in same generation
const V_GAP = 120; // gap between generations (vertical breathing room)

export function getGenerationLayout(
  existingFrames: Array<{ x: number; y: number; w: number; h: number }>,
  screens: Array<{ name: string; w: number; h: number }>, // pass dims in
): { x: number; y: number }[] {
  const hasFrames = existingFrames.length > 0;
  const startY = hasFrames
    ? Math.max(...existingFrames.map((frame) => frame.y + frame.h)) + V_GAP
    : 0;
  const minX = hasFrames
    ? Math.min(...existingFrames.map((frame) => frame.x))
    : 0;
  const maxX = hasFrames
    ? Math.max(...existingFrames.map((frame) => frame.x + frame.w))
    : 0;
  const midX = hasFrames ? (minX + maxX) / 2 : 0;

  // Position each screen with its actual width
  let currentX = 0;
  const totalW = screens.reduce(
    (sum, s, i) => sum + s.w + (i < screens.length - 1 ? H_GAP : 0),
    0,
  );
  const startX = midX - totalW / 2;

  return screens.map((screen) => {
    const x = startX + currentX;
    currentX += screen.w + H_GAP;
    return { x, y: startY };
  });
}

export function getInitialDimensions(screenType: string): {
  w: number;
  h: number;
} {
  return getInitialDimensionsForPlatform(screenType, "web");
}

export function getInitialDimensionsForPlatform(
  screenType: string,
  platform: GenerationPlatform,
): {
  w: number;
  h: number;
} {
  const type = screenType.toLowerCase();

  if (platform === "mobile") {
    if (type.includes("tablet")) return { w: 768, h: 1024 };
    if (type.includes("modal") || type.includes("dialog"))
      return { w: 360, h: 640 };
    return { w: 390, h: 844 };
  }

  if (
    type.includes("landing") ||
    type.includes("home") ||
    type.includes("hero")
  )
    return { w: 1200, h: 800 }; // wide landing page

  if (type.includes("dashboard") || type.includes("admin"))
    return { w: 1280, h: 900 }; // wide dashboard

  if (type.includes("tablet")) return { w: 768, h: 1024 };

  if (type.includes("modal") || type.includes("dialog"))
    return { w: 480, h: 400 };

  // Default — medium web page with stable desktop baseline width
  return { w: 960, h: 700 };
}
