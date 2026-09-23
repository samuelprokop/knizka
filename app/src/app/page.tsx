import { BookHero } from "@/components/BookHero";

export default function Home() {
  return (
    <main>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 sm:px-10">
        {/* PLACEHOLDER: logo a názov novej Značky, kým nepadne rozhodnutie z Fázy 0 */}
        <span className="font-heading text-lg font-extrabold text-ink">
          [Názov Značky]
        </span>
        <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30">
          Vytvoriť knihu
        </button>
      </header>

      <BookHero />
    </main>
  );
}
