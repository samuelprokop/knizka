import { ACTIVITIES, LAYOUTS, LIMITS, STYLES } from "@/config/catalog";
import { MARKET_CODES, MARKETS, formatMoney } from "@/config/markets";
import { Card, Notice, PageHeader } from "@/features/admin/components/ui";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function MarketSettingsPage() {
  await requireAdminPage("trh");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nastavenia trhu" description="Zatiaľ len na čítanie – zdroj je config/markets.ts a config/catalog.ts v kóde." />

      <Notice tone="info">
        Návrh pre ďalšiu verziu: presunúť ceny, limity a zapínanie štýlov/layoutov/aktivít do DB tabuľky per trh (napr.{" "}
        <code>market_settings</code>), aby sa dali meniť bez nasadenia. Kým k tomu nedôjde, zmeny robí vývojár v týchto súboroch a
        nasadí ich.
      </Notice>

      {MARKET_CODES.map((code) => {
        const market = MARKETS[code];
        return (
          <Card key={code}>
            <h2 className="mb-3 text-base font-semibold text-ink">
              Trh {code} · {market.currency} · jazyk rozhrania {market.uiLanguage}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-medium text-ink/70">Ceny</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(market.prices).map(([key, value]) =>
                      typeof value === "number" ? (
                        <tr key={key} className="border-b border-ink/5">
                          <td className="py-1 text-ink/60">{key}</td>
                          <td className="py-1 text-right font-medium text-ink">{formatMoney(value, market)}</td>
                        </tr>
                      ) : null
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-ink/70">Doprava a platba</h3>
                <p className="text-sm text-ink/80">DPH na knihu: {market.vatBookPercent} %</p>
                <p className="text-sm text-ink/80">Doprava zdarma od: {formatMoney(market.freeShippingFromMinor, market)}</p>
                <p className="text-sm text-ink/80">Dodanie: {market.deliveryWorkingDays} pracovných dní</p>
                <p className="text-sm text-ink/80">Platby: {market.paymentMethods.join(", ")}</p>
                <p className="text-sm text-ink/80">Dopravcovia: {market.carriers.map((c) => c.name).join(", ")}</p>
                <p className="text-sm text-ink/80">Jazyky knihy: {market.bookLanguages.join(", ")}</p>
              </div>
            </div>
          </Card>
        );
      })}

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Katalóg možností (spoločný pre všetky trhy)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-medium text-ink/70">Štýly</h3>
            <p className="text-sm text-ink/80">{STYLES.join(", ")}</p>
            <h3 className="mt-3 mb-1 text-sm font-medium text-ink/70">Layouty</h3>
            <p className="text-sm text-ink/80">{LAYOUTS.join(", ")}</p>
            <h3 className="mt-3 mb-1 text-sm font-medium text-ink/70">Aktivity</h3>
            <p className="text-sm text-ink/80">{ACTIVITIES.join(", ")}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium text-ink/70">Limity</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(LIMITS).map(([key, value]) => (
                  <tr key={key} className="border-b border-ink/5">
                    <td className="py-1 text-ink/60">{key}</td>
                    <td className="py-1 text-right font-medium text-ink">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
