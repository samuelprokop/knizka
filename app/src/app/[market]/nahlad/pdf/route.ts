import { pdfDisposition } from "@/lib/pdf-filename";
import { isMarketCode } from "@/config/markets";
import { buildDemoBook, parseDemoParams } from "@/features/book/server/demo";
import { PDF_KINDS, renderBookPdfInWorker } from "@/server/render";

/*
  PDF demo knihy (vývoj): ?druh=ebook | print-interior | print-cover + voľby ako /nahlad.
  Produkčné PDF (po platbe, balík D) volá renderBookPdfInWorker nad uzamknutou verziou.
*/

export async function GET(request: Request, { params }: RouteContext<"/[market]/nahlad/pdf">) {
  const { market } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const search = new URL(request.url).searchParams;
  const kind = PDF_KINDS.find((k) => k === search.get("druh")) ?? "ebook";

  const { book } = await buildDemoBook(market, parseDemoParams(search));
  const pdf = await renderBookPdfInWorker(book, kind);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfDisposition(`${book.meta.title} (${book.options.format}, ${kind})`, "ukážka"),
      "Cache-Control": "private, no-store",
    },
  });
}
