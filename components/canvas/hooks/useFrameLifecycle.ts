import { RefObject, useCallback, useEffect, useRef } from "react";
import {
  loadSandpackClient,
  SandpackClient,
} from "@codesandbox/sandpack-client";

import { buildSandpackFiles } from "@/lib/sandpackTemplate";
import { FrameState } from "@/lib/canvas-state";

interface UseFrameLifecycleOptions {
  content: string;
  state: FrameState;
  containerRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

const DESTROY_GRACE_MS = 5000;
const INTERSECTION_ROOT_MARGIN = "300px 300px";

export function useFrameLifecycle({
  content,
  state,
  containerRef,
  iframeRef,
}: UseFrameLifecycleOptions) {
  const clientRef = useRef<SandpackClient | null>(null);
  const isMountedRef = useRef(false);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mount = useCallback(async () => {
    console.log(content);
    console.log(iframeRef.current);
    if (!iframeRef.current || !content) return;
    const client = await loadSandpackClient(
      iframeRef.current,
      {
        files: buildSandpackFiles(content),
        entry: "/index.tsx",
        template: "create-react-app-typescript",
      },
      {
        showOpenInCodeSandbox: false,
        showErrorScreen: true,
        showLoadingScreen: true,
        externalResources: [
          "https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,container-queries",
        ],
      },
    );

    clientRef.current = client;
    isMountedRef.current = true;
  }, [content, iframeRef]);

  const destroy = useCallback(() => {
    clientRef.current?.destroy();
    clientRef.current = null;
    isMountedRef.current = false;

    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
  }, [iframeRef]);

  useEffect(() => {
    if (state !== "done" || !content || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (destroyTimerRef.current) {
            clearTimeout(destroyTimerRef.current);
            destroyTimerRef.current = null;
          }

          void mount();
          return;
        }

        if (destroyTimerRef.current) {
          clearTimeout(destroyTimerRef.current);
        }

        destroyTimerRef.current = setTimeout(() => {
          destroy();
          destroyTimerRef.current = null;
        }, DESTROY_GRACE_MS);
      },
      { rootMargin: INTERSECTION_ROOT_MARGIN, threshold: 0 },
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (destroyTimerRef.current) {
        clearTimeout(destroyTimerRef.current);
        destroyTimerRef.current = null;
      }
    };
  }, [containerRef, content, destroy, mount, state]);

  useEffect(() => {
    if (!clientRef.current || !content || !isMountedRef.current) return;

    clientRef.current.updateSandbox({ files: buildSandpackFiles(content) });
  }, [content]);

  useEffect(() => {
    return () => {
      if (destroyTimerRef.current) {
        clearTimeout(destroyTimerRef.current);
      }
      destroy();
    };
  }, [destroy]);

  return {
    clientRef,
    isMountedRef,
  };
}
