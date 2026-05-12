import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
// Import UMD builds directly — opencc-js has "type":"module" which Metro can't resolve
const { Converter: ConverterT2CN } = require("opencc-js/dist/umd/t2cn.js");
const { Converter: ConverterCN2T } = require("opencc-js/dist/umd/cn2t.js");

export type LangMode = "en" | "zh-TW" | "zh-CN";

const STORAGE_KEY = "newsblock_lang";

const convertToSimplified = ConverterT2CN({ from: "tw", to: "cn" });
const convertToTraditional = ConverterCN2T({ from: "cn", to: "tw" });

export function toSimplified(text: string): string {
  return convertToSimplified(text);
}

export function toTraditional(text: string): string {
  return convertToTraditional(text);
}

interface LangContextValue {
  lang: LangMode;
  setLang: (lang: LangMode) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangMode>("en");

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v === "en" || v === "zh-TW" || v === "zh-CN") setLangState(v);
    });
  }, []);

  function setLang(mode: LangMode) {
    setLangState(mode);
    SecureStore.setItemAsync(STORAGE_KEY, mode);
  }

  const value = useMemo(() => ({ lang, setLang }), [lang]);

  return React.createElement(LangContext.Provider, { value }, children);
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
