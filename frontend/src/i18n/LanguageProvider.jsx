import { useCallback, useEffect, useState } from "react";

import LanguageContext from "./LanguageContext";
import { startPageTranslation, translateText } from "./translator";

// =====================================================
// JalRakshak AI - language (English / Kannada)
// =====================================================

const STORAGE_KEY = "jalrakshak_language";

function readSavedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "kn" ? "kn" : "en";
  } catch {
    return "en";
  }
}

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readSavedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage unavailable (private mode); language still works.
    }

    if (language === "en") {
      return undefined;
    }

    return startPageTranslation(document.body, language);
  }, [language]);

  // For text that never reaches the page as plain text,
  // e.g. desktop notifications.
  const t = useCallback(
    (text) => translateText(text, language) ?? text,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
