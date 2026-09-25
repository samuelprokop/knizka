import { isMarketCode } from "@/config/markets";
import { getOrder } from "@/features/checkout/server/orders";
import { hasProjectSession } from "@/features/configurator/server/session";
import { loadBookVersion } from "@/features/book/server/versions";
import { pdfDisposition } from "@/lib/pdf-filename";
import { storage } from "@/server/storage";

async function bookTitleOf(versionId: string | null) {
  const book = versionId ? await loadBookVersion(versionId) : null;
  return book?.meta.title ?? "kniha";
}

export async function GET(_request: Request, { params }: RouteContext<"/[market]/objednavka/[id]/ebook">) {
  const { market, id } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const order = await getOrder(id);
  if (!order || order.market !== market || order.status === "pending_payment") return new Response(null, { status: 404 });
  if (!(await hasProjectSession(order.projectId))) return new Response(null, { status: 403 });

  let pdf: Buffer;
  try {
    pdf = await storage.get(`pdf/${order.id}-ebook.pdf`);
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfDisposition(await bookTitleOf(order.bookVersionId), "TAKTIK"),
      "Cache-Control": "private, no-store",
    },
  });
}
