import "server-only";

/*
  Verdikt fotky (K2.2) je teraz implementovaný v server/qa (balík B) – skutočná
  kontrola ostrosti, jasu a rozlíšenia namiesto mocku. Tento súbor ostáva ako
  stabilná cesta pre existujúce importy v konfigurátore (hero.ts, PhotoUploader).
*/
export type { PhotoAdvice, PhotoCheckInput, PhotoChecker, PhotoReason, PhotoVerdict } from "@/server/qa/photo-checker";
export { getPhotoChecker, heuristicPhotoChecker } from "@/server/qa/photo-checker";
