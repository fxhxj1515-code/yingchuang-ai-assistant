import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import id from "./locales/id.json";
import vi from "./locales/vi.json";
import th from "./locales/th.json";
import ms from "./locales/ms.json";
import tl from "./locales/tl.json";

// Detect browser language
const browserLang = navigator.language?.split("-")[0] ?? "en";
const supportedLngs = ["en", "zh", "id", "vi", "th", "ms", "tl"];
const defaultLng = supportedLngs.includes(browserLang) ? browserLang : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    id: { translation: id },
    vi: { translation: vi },
    th: { translation: th },
    ms: { translation: ms },
    tl: { translation: tl },
  },
  lng: defaultLng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
