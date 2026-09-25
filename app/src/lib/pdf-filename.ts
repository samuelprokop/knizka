/*
  Názov sťahovaného PDF podľa knihy („Janko ide do škôlky – TAKTIK.pdf“) namiesto
  technického ID. Hlavička má ASCII náhradu (staršie prehliadače) aj plný UTF-8 názov
  s diakritikou (RFC 6266 / 5987).
*/

export function pdfDisposition(title: string, suffix?: string) {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim() || "kniha";
  const full = `${clean}${suffix ? ` – ${suffix}` : ""}.pdf`;
  const ascii = full
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/–/g, "-")
    .replace(/[^\x20-\x7e]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(full)}`;
}
