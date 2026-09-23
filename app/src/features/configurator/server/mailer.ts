import "server-only";

/*
  PLACEHOLDER e-mailov konfigurátora (odkaz na návrat, kniha je hotová).
  Skutočné šablóny a odosielanie pripravuje balík D (server/email) – potom
  sa táto funkcia len presmeruje tam. Zatiaľ sa e-mail vypíše do konzoly
  servera, aby sa dal odkaz pri vývoji otvoriť.

  Do e-mailu nikdy nejde fotka dieťaťa (A2, O2). Meno v predmete je
  povolené (slovník: email.subject.*), ale nevypisuje sa do logu.
*/

export type ConfiguratorMail = {
  to: string;
  kind: "link" | "preview_ready";
  subject: string;
  url: string;
};

export type Mailer = { send(mail: ConfiguratorMail): Promise<void> };

const consoleMailer: Mailer = {
  async send(mail) {
    if (process.env.NODE_ENV === "test") return;
    // Mimo vývoja by sa do logu dostal e-mail a odkaz s tokenom – tam musí byť skutočné odosielanie (D).
    if (process.env.NODE_ENV === "production") {
      console.warn(`[e-mail · ${mail.kind}] neodoslaný – chýba odosielanie (balík D)`);
      return;
    }
    // Predmet s menom dieťaťa sa do logu nepíše – len druh e-mailu a odkaz.
    console.info(`[e-mail · ${mail.kind}] → ${mail.to}\n  ${mail.url}`);
  },
};

export const getMailer = (): Mailer => consoleMailer;
