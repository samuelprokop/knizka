export const PDF_KINDS = ["ebook", "print-interior", "print-cover"] as const;
export type PdfKind = (typeof PDF_KINDS)[number];
