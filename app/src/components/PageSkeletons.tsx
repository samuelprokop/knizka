import { Skeleton } from "@/components/Skeleton";

/*
  Kostry celých stránok pre loading.tsx – kým server pripraví krok, košík či
  objednávku. Rozloženie kopíruje skutočné stránky, aby nič neposkočilo.
*/

/** Obálka krokov konfigurátora (WizardShell): hlavička, lišta priebehu, obsah, lišta s cenou. */
export function WizardSkeleton({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper" role="status" aria-label={label}>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Skeleton className="h-12 w-14 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded-full" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
          <Skeleton className="h-4 w-44" />
          <div className="mt-2 grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="block py-2">
                <Skeleton className="h-1.5 rounded-full" />
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-3/4 sm:h-11" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-14 rounded-2xl" />
        </div>

        <div className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-between border-t border-ink/10 bg-white/95 px-4 py-3 sm:-mx-6 sm:px-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </main>
    </div>
  );
}

/** Košík, pokladňa a stránky objednávky: nadpis, karta položky, riadky, tlačidlo. */
export function CheckoutSkeleton({ label }: { label: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10" role="status" aria-label={label}>
      <Skeleton className="h-10 w-1/2" />
      <div className="flex gap-4 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
        <Skeleton className="size-20 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-11 w-44 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex justify-between gap-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-full sm:w-56" />
    </main>
  );
}
