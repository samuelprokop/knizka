/*
  Dvojstrana náhľadu: dve strany vedľa seba; obálka a zadná strana samostatne
  (obálka vpravo, zadná strana vľavo – ako zatvorená kniha).
*/

import type { PreviewSpread } from "../model/pages";
import type { Book } from "../model/types";
import { BookPage, type PageRenderOptions } from "./BookPage";

import "../styles/fonts.css";
import "../styles/book.css";

export function BookSpread({
  book,
  spread,
  opts,
  className,
}: {
  book: Book;
  spread: PreviewSpread;
  opts?: PageRenderOptions;
  className?: string;
}) {
  if ("single" in spread) {
    const onRight = spread.single.type === "cover";
    return (
      <div className={`bk-spread${className ? ` ${className}` : ""}`} data-single="true">
        {onRight && <div aria-hidden="true" />}
        <BookPage book={book} page={spread.single} opts={opts} />
        {!onRight && <div aria-hidden="true" />}
      </div>
    );
  }
  return (
    <div className={`bk-spread${className ? ` ${className}` : ""}`}>
      <BookPage book={book} page={spread.left} opts={opts} />
      <BookPage book={book} page={spread.right} opts={opts} />
    </div>
  );
}
