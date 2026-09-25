export const PDF_KINDS = ["ebook", "worksheets", "print-interior", "print-cover"] as const;
export type PdfKind = (typeof PDF_KINDS)[number];
