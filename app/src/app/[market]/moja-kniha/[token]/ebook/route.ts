import { isMarketCode } from "@/config/markets";
import { loadPersonalPage } from "@/features/checkout/server/personal";
import { storage } from "@/server/storage";

/** E-kniha na stiahnutie z osobnej stránky – prístup cez token, bez cookie session. */
export async function GET(_request: Request, { params }: RouteContext<"/[market]/moja-kniha/[token]/ebook">) {
  const { market, token } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const view = await loadPersonalPage(token);
  if (!view || view.market !== market || !view.latestOrderId) return new Response(null, { status: 404 });

  let pdf: Buffer;
  try {
    pdf = await storage.get(`pdf/${view.latestOrderId}-ebook.pdf`);
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kniha-${view.projectId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
