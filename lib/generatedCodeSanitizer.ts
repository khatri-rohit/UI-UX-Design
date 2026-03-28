const ALLOWED_IMPORT_PACKAGES = new Set([
  "react",
  "react-dom",
  "recharts",
  "lucide-react",
  "clsx",
]);

const CODE_START_RE =
  /^\s*(import|export|const\s+GeneratedScreen|function\s+GeneratedScreen|type\s+|interface\s+|class\s+)/;

const LOCAL_IMPORT_RE =
  /^\s*import\s+(?:[^'\"]*\s+from\s+)?['\"](\.\/|\.\.\/|\/|@\/)[^'\"]+['\"]\s*;?\s*$/;

function basePackageFromImport(path: string): string {
  if (path.startsWith("@")) {
    return path.split("/").slice(0, 2).join("/");
  }
  return path.split("/")[0];
}

function stripLeadingNonCode(text: string): string {
  const lines = text.split("\n");
  const firstCodeLine = lines.findIndex((line) => CODE_START_RE.test(line));
  if (firstCodeLine <= 0) return text;
  return lines.slice(firstCodeLine).join("\n");
}

function sanitizeImports(text: string): string {
  const lines = text.split("\n");

  const cleaned = lines.filter((line) => {
    if (LOCAL_IMPORT_RE.test(line)) return false;

    const importMatch = line.match(
      /^\s*import\s+(?:[^'\"]*\s+from\s+)?['\"]([^'\"]+)['\"]\s*;?\s*$/,
    );

    if (!importMatch) return true;

    const importPath = importMatch[1];
    if (
      importPath.startsWith("./") ||
      importPath.startsWith("../") ||
      importPath.startsWith("/") ||
      importPath.startsWith("@/")
    ) {
      return false;
    }

    const pkg = basePackageFromImport(importPath);
    return ALLOWED_IMPORT_PACKAGES.has(pkg);
  });

  return cleaned.join("\n");
}

function stripAnimationTokens(text: string): string {
  return text
    .replace(/\bframer-motion\b/g, "")
    .replace(/\bmotion\/react\b/g, "")
    .replace(
      /\b(?:animate-[^\s'\"`]+|transition(?:-[^\s'\"`]+)?|duration-\d+|ease-[^\s'\"`]+|delay-\d+)\b/g,
      "",
    )
    .replace(/[ \t]{2,}/g, " ");
}

function ensureDefaultExport(text: string): string {
  if (/export\s+default\s+GeneratedScreen\s*;?/.test(text)) return text;

  if (
    /(?:const\s+GeneratedScreen\s*=|function\s+GeneratedScreen\s*\()/.test(text)
  ) {
    return `${text.trim()}\n\nexport default GeneratedScreen;\n`;
  }

  return text;
}

function fallbackStaticScreen(): string {
  return `import React from "react";

function GeneratedScreen() {
  return (
    <main className="w-full min-h-screen bg-slate-950 text-slate-100 p-8 lg:p-12">
      <section className="w-full max-w-6xl mx-auto border border-slate-800 rounded-2xl bg-slate-900/70 p-6 lg:p-8">
        <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight">Design Preview</h1>
        <p className="mt-3 text-slate-300 leading-relaxed">
          The previous model output was sanitized because it included unsupported imports or invalid preface text.
        </p>
      </section>
    </main>
  );
}

export default GeneratedScreen;
`;
}

export function sanitizeGeneratedCode(raw: string): string {
  let next = raw
    .replace(/^```(?:tsx?|typescript|jsx?)?\n?/gm, "")
    .replace(/^```$/gm, "")
    .replace(/^\uFEFF/, "")
    .trim();

  next = stripLeadingNonCode(next);
  next = sanitizeImports(next);
  next = stripAnimationTokens(next);
  next = ensureDefaultExport(next).trim();

  const hasGeneratedScreen =
    /(?:const\s+GeneratedScreen\s*=|function\s+GeneratedScreen\s*\()/.test(
      next,
    ) && /export\s+default\s+GeneratedScreen\s*;?/.test(next);

  if (!hasGeneratedScreen || next.length < 40) {
    return fallbackStaticScreen();
  }

  return `${next}\n`;
}
