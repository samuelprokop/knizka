import "server-only";

/*
  PLACEHOLDER odosielania e-mailov – bez napojenia na poskytovateľa. Rozhranie
  je pripravené na výmenu za skutočné odosielanie (Resend, Postmark…) bez
  zmeny volajúceho kódu. Konfigurátor (balík A) mal dočasný výpis priamo
  v `features/configurator/server/mailer.ts` – ten teraz len presmerúva sem.

  Do e-mailu (ani do jeho logu) nikdy nejde fotka dieťaťa ani meno v tele
  správy mimo predmetu (A2, O2, S13) – predmet smie meno obsahovať
  (slovník: email.subject.*), ale do konzoly sa vypisuje len druh e-mailu.
*/

export type Mail = {
  to: string;
  /** Druh e-mailu – len pre log a prípadné šablóny podľa poskytovateľa. */
  kind: string;
  subject: string;
  /** Hlavný odkaz e-mailu (návrat do projektu, osobná stránka knihy, sledovanie zásielky…). */
  url: string;
};

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

const consoleMailer: Mailer = {
  async send(mail) {
    if (process.env.NODE_ENV === "test") return;
    if (process.env.NODE_ENV === "production") {
      console.warn(`[e-mail · ${mail.kind}] neodoslaný – chýba odosielanie (balík D, PLACEHOLDER)`);
      return;
    }
    console.info(`[e-mail · ${mail.kind}] → ${mail.to}\n  ${mail.url}`);
  },
};

export const getMailer = (): Mailer => consoleMailer;
