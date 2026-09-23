import "server-only";

/*
  Presmerované na @/server/email (balík D) – skutočné šablóny a odosielanie
  sú tam, toto je len alias na pôvodné volania konfigurátora.
*/

export { getMailer, type Mail as ConfiguratorMail, type Mailer } from "@/server/email";
