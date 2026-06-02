const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "S",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "H2",
  "H3",
  "H4",
  "A",
  "IMG",
  "SPAN",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TD",
  "TH",
]);

const ALLOWED_ATTRS = {
  A: new Set(["href", "target", "rel"]),
  IMG: new Set(["src", "alt"]),
};

function withParser(html, fallback = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return fallback || html || "";
  }
  return null;
}

export function htmlToPlainText(html) {
  const ssrFallback = withParser(html, String(html || "").replace(/<[^>]*>/g, " "));
  if (ssrFallback !== null) {
    return ssrFallback.replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function hasMeaningfulCommunityContent(html) {
  const text = htmlToPlainText(html);
  if (text) return true;
  return /<img[\s\S]*?>/i.test(String(html || ""));
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * HTML이 아닌 단순 텍스트면 이스케이프 후 줄바꿈을 <br />로, 아니면 기존 HTML 새니타이즈.
 */
export function prepareContentForDisplay(html) {
  const s = String(html || "").trim();
  if (!s) return "";
  if (!/<[a-z][\s\S]*>/i.test(s)) {
    return escapeHtml(s).replace(/\n/g, "<br />");
  }
  return sanitizeCommunityHtml(s);
}

export function sanitizeCommunityHtml(html) {
  const ssrFallback = withParser(html, String(html || ""));
  if (ssrFallback !== null) {
    return ssrFallback;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tag = node.tagName.toUpperCase();

    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      while (node.firstChild) {
        fragment.appendChild(node.firstChild);
      }
      node.replaceWith(fragment);
      return;
    }

    Array.from(node.attributes).forEach((attr) => {
      const allowed = ALLOWED_ATTRS[tag];
      const name = attr.name.toLowerCase();
      if (!allowed || !allowed.has(attr.name)) {
        node.removeAttribute(attr.name);
        return;
      }
      if (tag === "A" && name === "href") {
        const href = node.getAttribute("href") || "";
        if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
          node.removeAttribute("href");
        }
      }
      if (tag === "IMG" && name === "src") {
        const src = node.getAttribute("src") || "";
        if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) {
          node.remove();
        }
      }
    });

    if (tag === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noreferrer");
    }

    Array.from(node.childNodes).forEach(cleanNode);
  };

  Array.from(root.childNodes).forEach(cleanNode);
  return root.innerHTML;
}

export function extractPreviewText(html, fallback = "내용이 없습니다.") {
  const text = htmlToPlainText(html);
  return text || fallback;
}
