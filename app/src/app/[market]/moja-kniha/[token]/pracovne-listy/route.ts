import { getMarket, isMarketCode } from "@/config/markets";
import { loadPersonalPage } from "@/features/checkout/server/personal";
import { createTranslator } from "@/i18n/format";
import { pdfDisposition } from "@/lib/pdf-filename";
import { renderBookPdfInWorker } from "@/server/render";
import { storage } from "@/server/storage";

/*
  Pracovné listy z osobnej stránky knihy (7.3): strany aktivít ako samostatné PDF
  na vytlačenie doma. Po zaplatení sa kniha nemení – PDF sa vyrobí pri prvom
  stiahnutí a ďalej sa podáva z úložiska.
*/
export async function GET(_request: Request, { params }: RouteContext<"/[market]/moja-kniha/[token]/pracovne-listy">) {
  const { market, token } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const view = await loadPersonalPage(token);
  if (!view || view.market !== market || !view.latestOrderId || view.worksheetCount === 0) {
    return new Response(null, { status: 404 });
  }

  const key = `pdf/${view.latestOrderId}-worksheets.pdf`;
  let pdf: Buffer;
  try {
    pdf = await storage.get(key);
  } catch {
    pdf = await renderBookPdfInWorker(view.book, "worksheets");
    await storage.put(key, pdf, "application/pdf");
  }

  const t = createTranslator(getMarket(market).uiLanguage);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfDisposition(view.bookTitle, t("personal.worksheets.file")),
      "Cache-Control": "private, no-store",
    },
  });
}
