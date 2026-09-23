/*
  Z častí knihy fyzické strany (tlač, e-kniha) a dvojstrany (listovací náhľad).
  Párne strany sú vľavo, nepárne vpravo; strana 1 leží oproti prednej predsádke.
*/

import type { Book, InteriorPage, PageRef } from "./types";

export function interiorPages(book: Pick<Book, "parts">): InteriorPage[] {
  const pages: InteriorPage[] = [];
  book.parts.forEach((part, partIndex) => {
    if (part.kind === "story_spread") {
      pages.push({ number: pages.length + 1, partIndex, side: "left" });
      pages.push({ number: pages.length + 1, partIndex, side: "right" });
    } else {
      pages.push({ number: pages.length + 1, partIndex });
    }
  });
  return pages;
}

export type PreviewSpread = { id: string; left: PageRef; right: PageRef } | { id: string; single: PageRef };

/**
 * Dvojstrany náhľadu: obálka, [predsádka | 1], [2 | 3] …, [posledná | predsádka], zadná strana.
 * Pri 32 aj 40 stranách sedí dvojstrana príbehu vždy na [párna | nepárna].
 */
export function previewSpreads(book: Pick<Book, "parts">): PreviewSpread[] {
  const pages = interiorPages(book);
  const ref = (page: InteriorPage | undefined): PageRef => (page ? { type: "interior", page } : { type: "blank" });

  const spreads: PreviewSpread[] = [{ id: "cover", single: { type: "cover" } }];
  spreads.push({ id: "p1", left: { type: "endpaper", position: "front" }, right: ref(pages[0]) });
  for (let i = 1; i < pages.length; i += 2) {
    const left = pages[i];
    const right = pages[i + 1];
    spreads.push({
      id: `p${left.number}`,
      left: ref(left),
      right: right ? ref(right) : { type: "endpaper", position: "back" },
    });
  }
  // Pri párnom počte strán končí posledná strana vľavo a oproti nej je zadná predsádka.
  spreads.push({ id: "back", single: { type: "back_cover" } });
  return spreads;
}

/** Poradie strán e-knihy a PDF: obálka, predsádka, vnútro, predsádka, zadná strana. */
export function ebookPages(book: Pick<Book, "parts">): PageRef[] {
  return [
    { type: "cover" },
    { type: "endpaper", position: "front" },
    ...interiorPages(book).map((page): PageRef => ({ type: "interior", page })),
    { type: "endpaper", position: "back" },
    { type: "back_cover" },
  ];
}
