import kn from "./kn";

// =====================================================
// JalRakshak AI - page translator
// =====================================================
//
// Translates visible English text on the page into the
// selected language using the dictionaries in this folder.
// It works on the rendered page, so every existing page is
// covered without rewriting each component, and live text
// (e.g. alert messages from the backend) is translated as
// it arrives.
//
// Only a text node's VALUE is changed, never the node
// itself, so React keeps working normally. When React
// re-renders a text node with new English text, the
// observer sees the change and translates it again.

const DICTIONARIES = { kn };

// Text with numbers inside: [pattern, (captured numbers) => text]
const PATTERNS = {
  kn: [
    [/^(\d+) readings? available$/i, (n) => `${n} ವಾಚನಗಳು ಲಭ್ಯವಿದೆ`],
    [/^(\d+) alerts?$/i, (n) => `${n} ಎಚ್ಚರಿಕೆಗಳು`],
    [/^(\d+) devices?$/i, (n) => `${n} ಸಾಧನಗಳು`],
    [/^(\d+) records?$/i, (n) => `${n} ದಾಖಲೆಗಳು`],
    [/^every (\d+) seconds?$/i, (n) => `ಪ್ರತಿ ${n} ಸೆಕೆಂಡಿಗೆ`],
  ],
};

// Trailing punctuation that is kept as-is around a match.
const TRAILING = /(\s*(?:\.{3}|…|[.:!]))$/;

// Attributes that contain user-visible text.
const ATTRIBUTES = ["placeholder", "title", "aria-label"];

// Never translate inside these elements.
const SKIP_SELECTOR =
  "script, style, textarea, code, pre, [data-no-translate], .leaflet-control-attribution";

function normalizeKey(text) {
  return text
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildLookup(dictionary) {
  const lookup = new Map();

  Object.entries(dictionary).forEach(([english, translated]) => {
    const key = normalizeKey(english.replace(TRAILING, ""));
    const value = translated.replace(TRAILING, "");

    lookup.set(key, value);
  });

  return lookup;
}

const LOOKUPS = Object.fromEntries(
  Object.entries(DICTIONARIES).map(([lang, dictionary]) => [
    lang,
    buildLookup(dictionary),
  ])
);

/**
 * Translate a single string. Returns the translation, or
 * null when the dictionary has no entry for it.
 */
export function translateText(text, lang) {
  const lookup = LOOKUPS[lang];

  if (!lookup || !text) {
    return null;
  }

  const trimmed = text.trim();

  if (!trimmed || !/[A-Za-z]/.test(trimmed)) {
    return null;
  }

  const leading = text.slice(0, text.indexOf(trimmed));
  const trailingSpace = text.slice(leading.length + trimmed.length);

  // A leading bullet ("• Litres") is kept as-is.
  const bullet = trimmed.match(/^[•·]\s*/);

  if (bullet) {
    const rest = translateText(trimmed.slice(bullet[0].length), lang);
    return rest === null
      ? null
      : `${leading}${bullet[0]}${rest.trim()}${trailingSpace}`;
  }

  // Phrases with a number in them ("20 readings available")
  for (const [pattern, build] of PATTERNS[lang] || []) {
    const match = trimmed.match(pattern);
    if (match) {
      return `${leading}${build(...match.slice(1))}${trailingSpace}`;
    }
  }

  // 1. Exact phrase (ignoring case and underscores)
  let translated = lookup.get(normalizeKey(trimmed));

  // 2. Phrase with its trailing punctuation removed
  let punctuation = "";

  if (translated === undefined) {
    const match = trimmed.match(TRAILING);

    if (match) {
      punctuation = match[1];
      translated = lookup.get(
        normalizeKey(trimmed.slice(0, -punctuation.length))
      );
    }
  }

  if (translated === undefined) {
    return null;
  }

  return `${leading}${translated}${punctuation}${trailingSpace}`;
}

/**
 * Starts translating the page. Returns a function that stops
 * translating and restores the original English text.
 */
export function startPageTranslation(root, lang) {
  // node -> { original, translated }
  const textState = new Map();
  // element -> { attribute: { original, translated } }
  const attributeState = new Map();

  const shouldSkip = (element) =>
    !element || element.closest(SKIP_SELECTOR);

  const translateTextNode = (node) => {
    const current = node.nodeValue;
    const state = textState.get(node);

    // Our own change coming back through the observer.
    if (state && current === state.translated) {
      return;
    }

    const translated = translateText(current, lang);

    if (translated === null || translated === current) {
      textState.delete(node);
      return;
    }

    textState.set(node, { original: current, translated });
    node.nodeValue = translated;
  };

  const translateAttributes = (element) => {
    ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) {
        return;
      }

      const current = element.getAttribute(attribute);
      const states = attributeState.get(element) || {};
      const state = states[attribute];

      if (state && current === state.translated) {
        return;
      }

      const translated = translateText(current, lang);

      if (translated === null || translated === current) {
        return;
      }

      states[attribute] = { original: current, translated };
      attributeState.set(element, states);
      element.setAttribute(attribute, translated);
    });
  };

  const translateTree = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!shouldSkip(node.parentElement)) {
        translateTextNode(node);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE || shouldSkip(node)) {
      return;
    }

    translateAttributes(node);

    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (child) =>
          child.nodeType === Node.ELEMENT_NODE &&
          child.matches(SKIP_SELECTOR)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      }
    );

    let child = walker.nextNode();

    while (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        translateTextNode(child);
      } else {
        translateAttributes(child);
      }

      child = walker.nextNode();
    }
  };

  translateTree(root);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        if (!shouldSkip(mutation.target.parentElement)) {
          translateTextNode(mutation.target);
        }
      } else if (mutation.type === "attributes") {
        if (!shouldSkip(mutation.target)) {
          translateAttributes(mutation.target);
        }
      } else {
        mutation.addedNodes.forEach(translateTree);
      }
    });

    // Forget nodes React has removed so memory stays small
    // on pages that update every few seconds.
    if (textState.size > 3000) {
      textState.forEach((_, node) => {
        if (!node.isConnected) textState.delete(node);
      });
      attributeState.forEach((_, element) => {
        if (!element.isConnected) attributeState.delete(element);
      });
    }
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  });

  return () => {
    observer.disconnect();

    // Put the English text back.
    textState.forEach((state, node) => {
      if (node.isConnected && node.nodeValue === state.translated) {
        node.nodeValue = state.original;
      }
    });

    attributeState.forEach((states, element) => {
      Object.entries(states).forEach(([attribute, state]) => {
        if (element.getAttribute(attribute) === state.translated) {
          element.setAttribute(attribute, state.original);
        }
      });
    });
  };
}
