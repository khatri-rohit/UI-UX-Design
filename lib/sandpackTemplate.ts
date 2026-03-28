import { extractDependencies } from "./dependencyExtractor";

export const SANDBOX_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; }
    #root { width: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    // Auto-dimension reporter — injected by platform, invisible to generated code
    (function() {
      var lastW = 0, lastH = 0

      function report() {
        var el = document.documentElement
        var w = Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth)
        var h = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight)

        // Only post if meaningfully changed
        if (Math.abs(w - lastW) < 4 && Math.abs(h - lastH) < 4) return
        lastW = w
        lastH = h

        window.parent.postMessage({
          type: 'frame-dimensions',
          width: w,
          height: h
        }, '*')
      }

      // Fire after React mounts and paints
      window.addEventListener('load', function() {
        // Small delay — React root renders after load
        setTimeout(report, 100)
        setTimeout(report, 500)  // catch lazy images, fonts
      })

      // Watch for ANY content change
      var ro = new ResizeObserver(report)
      ro.observe(document.documentElement)

      // Watch for dynamic content additions
      var mo = new MutationObserver(report)
      mo.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      })
    })()
  </script>
</body>
</html>`;

export const SANDBOX_ENTRY = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
`;

export function buildSandpackFiles(
  code: string,
): Record<string, { code: string }> {
  const cleaned = code
    .replace(/^```(?:tsx?|typescript|jsx?)?\n?/gm, "")
    .replace(/^```$/gm, "")
    .trim();

  // Ensure React is imported — inject if missing
  const { dependencies } = extractDependencies(cleaned);

  return {
    "/package.json": {
      code: JSON.stringify({ main: "/index.tsx", dependencies }, null, 2),
    },
    "/public/index.html": { code: SANDBOX_HTML },
    "/index.tsx": { code: SANDBOX_ENTRY },
    "/App.tsx": { code: cleaned },
  };
}

// export function buildSandpackFiles(
//   code: string,
// ): Record<string, { code: string }> {
//   const cleaned = code
//     .replace(/^```(?:tsx?|typescript|jsx?)?\n?/gm, "")
//     .replace(/^```$/gm, "")
//     .trim();

//   return {
//     // Sandpack reads this to find the entry point
//     "/package.json": {
//       code: JSON.stringify(
//         {
//           main: "/index.tsx", // ← this is what the error says is missing
//           dependencies: {
//             react: "^18.0.0",
//             "react-dom": "^18.0.0",
//           },
//         },
//         null,
//         2,
//       ),
//     },

//     "/public/index.html": { code: SANDBOX_HTML },
//     "/index.tsx": { code: SANDBOX_ENTRY },
//     "/App.tsx": { code: cleaned },
//   };
// }
