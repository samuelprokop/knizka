/*
  Množné číslo pre slovenčinu aj češtinu: 1 → one, 2 – 4 → few, inak many
  (0, 5 a viac, desatinné). Texty majú tri kľúče s príponou:
    t(`gen.eta.${pluralForm(minutes)}`, { minutes })  →  „1 minútu / 3 minúty / 7 minút“
*/

export type PluralForm = "one" | "few" | "many";

export function pluralForm(n: number): PluralForm {
  if (n === 1) return "one";
  if (Number.isInteger(n) && n >= 2 && n <= 4) return "few";
  return "many";
}
