"use client";

import { useEffect, useState } from "react";

import { Skeleton, SkeletonResolveList, SkeletonResolveRow, SkeletonReveal } from "@/components/Skeleton";

/* Interaktívna ukážka skeletonu pre katalóg UI – kosti, zotretie karty, prelínanie zoznamu. */

const STORIES = [
  { title: "Janko ide do škôlky", meta: "3 – 5 rokov · míľniky" },
  { title: "Výprava za stratenou hviezdou", meta: "4 – 7 rokov · dobrodružstvo" },
  { title: "Tajomstvo starého lesa", meta: "5 – 8 rokov · dobrodružstvo" },
  { title: "Veľká oslava", meta: "3 – 6 rokov · sviatky" },
];

export function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, [round]);

  const reload = () => {
    setLoading(true);
    setRound((r) => r + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="self-start rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-ink transition disabled:opacity-50"
      >
        {loading ? "Načítava sa…" : "Načítať znova"}
      </button>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-extrabold">Karta – zotretie zľava doprava</h2>
        <div className="max-w-sm rounded-3xl bg-white p-5 ring-1 ring-ink/10">
          <SkeletonReveal
            key={round}
            loading={loading}
            skeleton={
              <span className="flex flex-col gap-3">
                <Skeleton className="size-14 rounded-2xl" />
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-4 w-full" />
              </span>
            }
          >
            <span className="flex flex-col gap-3">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-orange font-heading text-xl font-extrabold">J</span>
              <span className="block font-heading text-lg font-extrabold">Janko</span>
              <span className="block text-sm text-ink/70">Karta hrdinu je pripravená na schválenie.</span>
            </span>
          </SkeletonReveal>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-extrabold">Zoznam – postupné prelínanie bez posunu</h2>
        <ul className="flex max-w-lg flex-col gap-2">
          <SkeletonResolveList loading={loading} stagger={0.08}>
            {STORIES.map((story, i) => (
              <li key={story.title}>
                <SkeletonResolveRow
                  index={i}
                  className="rounded-2xl bg-white p-4 ring-1 ring-ink/10"
                  content={
                    <span className="flex flex-col gap-1">
                      <span className="block font-semibold">{story.title}</span>
                      <span className="block text-sm text-ink/60">{story.meta}</span>
                    </span>
                  }
                  skeleton={
                    <span className="flex flex-col gap-2 p-4">
                      <Skeleton className="h-5 w-3/5" />
                      <Skeleton className="h-4 w-2/5" />
                    </span>
                  }
                />
              </li>
            ))}
          </SkeletonResolveList>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-extrabold">Samostatné kosti</h2>
        <div className="flex max-w-lg flex-col gap-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-10 w-2/3" animate={false} />
          <p className="text-sm text-ink/60">Posledná kosť je bez lesku (animate = false).</p>
        </div>
      </section>
    </div>
  );
}
