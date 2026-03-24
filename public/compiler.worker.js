importScripts("https://unpkg.com/@babel/standalone/babel.min.js");

self.onmessage = function ({ data: { screenName, code } }) {
  try {
    const cleaned = sanitizeModelOutput(code);

    // Babel.transform — same API shape as sucrase
    const { code: js } = Babel.transform(cleaned, {
      presets: [
        ["react", { runtime: "classic" }],
        ["typescript", { allExtensions: true, isTSX: true }],
      ],
      filename: `${screenName}.tsx`,
    });

    const safeJs = sanitizeInlineScript(js);
    validateGeneratedJavaScript(safeJs);

    self.postMessage({
      screenName,
      html: buildHTML(screenName, safeJs),
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({
      screenName,
      html: buildErrorHTML(screenName, message),
      error: message,
    });
  }
};

function sanitizeModelOutput(raw) {
  return String(raw)
    .replace(/^```(?:tsx?|typescript|jsx?)?\n?/gm, "")
    .replace(/^```$/gm, "")
    .replace(
      /<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^>]*><\/script>/gi,
      "",
    )
    .trim();
}

function validateGeneratedJavaScript(js) {
  try {
    // Parse-only validation so syntax issues surface as compile errors.
    new Function(js);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generated JavaScript syntax error: ${message}`);
  }
}

function sanitizeInlineScript(js) {
  return String(js).replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeForSingleQuotedJsString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/<\/script/gi, "<\\/script");
}

function buildHTML(screenName, js) {
  const safeScreenName = escapeForSingleQuotedJsString(screenName);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { min-width:100%; width:max-content; }
  body { background:#111; color:#fff; font-family: system-ui, sans-serif; overflow:auto; }
  #root { min-width:100%; min-height:100vh; }
  #error { padding:12px; font-size:10px; color:#ff6b6b; font-family:monospace; white-space:pre-wrap; }
</style>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
</head>
<body>
<div id="root"></div>
<script>
// Shim View, Text etc → plain divs so RN components don't crash
const View = ({style, children, ...p}) => React.createElement('div', {style, ...p}, children)
const Text = ({style, children, ...p}) => React.createElement('span', {style:{display:'block',...style}, ...p}, children)
const ScrollView = ({style, children, ...p}) => React.createElement('div', {style:{overflowY:'auto',...style}, ...p}, children)
const TouchableOpacity = ({style, onPress, children, ...p}) => React.createElement('div', {style:{cursor:'pointer',...style}, onClick:onPress, ...p}, children)
const Image = ({source, style, ...p}) => React.createElement('img', {src:(source && source.uri) || source, style:{objectFit:'cover',...style}, ...p})
const FlatList = ({data=[], renderItem, keyExtractor, style}) =>
  React.createElement('div', {style}, data.map((item,i) =>
    React.createElement(React.Fragment, {key: keyExtractor ? keyExtractor(item,i) : i}, renderItem({item,index:i}))
  ))
const StyleSheet = { create: s => s }
const SafeAreaView = View
const TextInput = ({style, placeholder, value, onChangeText, ...p}) =>
  React.createElement('input', {style:{outline:'none',background:'transparent',...style}, placeholder, value, onChange: e => onChangeText && onChangeText(e.target.value), ...p})

try {
${js}

// Resolve generated component by safe known names.
const Component =
  (typeof GeneratedScreen !== 'undefined' && GeneratedScreen) ||
  (typeof Screen !== 'undefined' && Screen) ||
  (() => React.createElement(View, {style:{padding:16}}, React.createElement(Text, null, '${safeScreenName}')))

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing root element')

if (ReactDOM.createRoot) {
  ReactDOM.createRoot(rootEl).render(React.createElement(Component))
} else {
  ReactDOM.render(React.createElement(Component), rootEl)
}
} catch(e) {
  document.getElementById('root').innerHTML = '<div id="error">Runtime error:\\n' + e.message + '</div>'
}
// Dimension reporter — runs after React renders
(function() {
  let rafId = 0

  function scheduleReport() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      reportSize()
    })
  }

  function reportSize() {
    const body = document.body
    const html = document.documentElement
    const root = document.getElementById('root')

    const width = Math.max(
      root ? root.scrollWidth : 0,
      root ? root.offsetWidth : 0,
      body.scrollWidth, body.offsetWidth,
      html.scrollWidth, html.offsetWidth,
      html.clientWidth
    )
      
    const height = Math.max(
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0,
      body.scrollHeight, body.offsetHeight,
      html.scrollHeight, html.offsetHeight,
      html.clientHeight
    )

    window.parent.postMessage({
      type: 'iframe-resize',
      screenName: '${safeScreenName}',
      width,
      height,
    }, '*')
  }

  // Report after first paint
  if (document.readyState === 'complete') {
    scheduleReport()
  } else {
    window.addEventListener('load', scheduleReport)
  }

  // Follow-up reports for async content.
  setTimeout(scheduleReport, 0)
  setTimeout(scheduleReport, 150)
  window.addEventListener('resize', scheduleReport)

  // Re-report if content changes (lazy images, dynamic content)
  const ro = new ResizeObserver(scheduleReport)
  ro.observe(document.body)
  const root = document.getElementById('root')
  if (root) ro.observe(root)

  const mo = new MutationObserver(scheduleReport)
  mo.observe(root || document.body, { childList: true, subtree: true, attributes: true, characterData: true })
})()
</script>
</body>
</html>`;
}

function buildErrorHTML(screenName, errorMessage) {
  const escaped = escapeHtml(errorMessage);
  const escapedScreenName = escapeHtml(screenName);
  return `<!DOCTYPE html>
<html>
<head><style>
  body{margin:0;background:#1a0a0a;color:#ff6b6b;font-family:monospace;padding:12px;font-size:10px;}
  h4{color:#ff9999;margin-bottom:8px;font-size:11px;}
  pre{white-space:pre-wrap;word-break:break-word;}
</style></head>
<body>
  <h4>Compile error - ${escapedScreenName}</h4>
  <pre>${escaped}</pre>
</body>
</html>`;
}
