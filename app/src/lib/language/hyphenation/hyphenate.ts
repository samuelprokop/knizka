/*
  Delenie slov (J7) – Liangov algoritmus nad vzormi TeX (hyph-utf8).
  Jadro je čisté a bez vzorov; vzory dodá hyphenation/server.ts (licencie tam).
  Výstup: text s mäkkými spojovníkmi (U+00AD) – prehliadač aj PDF ich zlomia
  len na konci riadku, inak sú neviditeľné.
*/

export const SOFT_HYPHEN = "­";

export type HyphenationOptions = {
  /** Min. počet písmen pred/za zlomom (sadzba SK aj CZ: 2 a 3). */
  leftMin?: number;
  rightMin?: number;
  /** Kratšie slová sa nedelia vôbec. */
  minWordLength?: number;
};

export type Hyphenator = (word: string) => string[];

export function createHyphenator(patterns: string, exceptions: string, options: HyphenationOptions = {}): Hyphenator {
  const leftMin = options.leftMin ?? 2;
  const rightMin = options.rightMin ?? 3;
  const minWordLength = options.minWordLength ?? 5;

  const table = new Map<string, number[]>();
  let maxLength = 0;
  for (const pattern of patterns.split(/\s+/).filter(Boolean)) {
    const letters: string[] = [];
    const weights: number[] = [0];
    for (const char of pattern) {
      if (char >= "0" && char <= "9") weights[weights.length - 1] = Number(char);
      else {
        letters.push(char);
        weights.push(0);
      }
    }
    const key = letters.join("");
    table.set(key, weights);
    maxLength = Math.max(maxLength, letters.length);
  }

  const exceptionMap = new Map(
    exceptions
      .split(/\s+/)
      .filter(Boolean)
      .map((e) => [e.replace(/-/g, ""), e.split("-")] as const)
  );

  return (word: string) => {
    const lower = word.toLowerCase();
    const chars = [...lower];
    if (chars.length < minWordLength) return [word];
    const exception = exceptionMap.get(lower);
    if (exception) return splitLike(word, exception.map((p) => [...p].length));

    const padded = [".", ...chars, "."];
    const points = new Array(padded.length + 1).fill(0);
    for (let i = 0; i < padded.length; i++) {
      for (let len = 1; len <= maxLength && i + len <= padded.length; len++) {
        const weights = table.get(padded.slice(i, i + len).join(""));
        if (!weights) continue;
        weights.forEach((w, k) => {
          if (w > points[i + k]) points[i + k] = w;
        });
      }
    }

    // points[k + 1] = váha zlomu pred znakom chars[k] (posun o úvodnú bodku).
    const sizes: number[] = [];
    let last = 0;
    for (let k = leftMin; k <= chars.length - rightMin; k++) {
      if (points[k + 1] % 2 === 1) {
        sizes.push(k - last);
        last = k;
      }
    }
    sizes.push(chars.length - last);
    return splitLike(word, sizes);
  };
}

function splitLike(word: string, sizes: number[]): string[] {
  const chars = [...word];
  const parts: string[] = [];
  let index = 0;
  for (const size of sizes) {
    parts.push(chars.slice(index, index + size).join(""));
    index += size;
  }
  return parts;
}

/**
 * Vloží mäkké spojovníky do textu. Nedelí slová z `protect` (meno dieťaťa
 * a postáv vo všetkých tvaroch), slová s veľkými písmenami vnútri (skratky)
 * ani časti s číslicami.
 */
export function hyphenateText(text: string, hyphenator: Hyphenator, protect: Iterable<string> = []): string {
  const protectedWords = new Set([...protect].map((w) => w.toLowerCase()));
  return text.replace(/\p{L}+/gu, (word) => {
    if (protectedWords.has(word.toLowerCase())) return word;
    if (/\p{Lu}/u.test(word.slice(1))) return word;
    return hyphenator(word).join(SOFT_HYPHEN);
  });
}
