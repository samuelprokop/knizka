/*
  Vytvorenie alebo reset interného používateľa administrácie. Heslo sa nikdy
  nezapisuje do kódu ani repozitára – buď sa vygeneruje náhodne a vypíše raz do
  konzoly, alebo sa zadá cez ADMIN_PASSWORD (napr. v CI).

  Použitie:
    npm run admin:create-user -- --email redaktor@example.sk --name "Test Redaktor" --role content_editor
    npm run admin:create-user -- --email admin@example.sk --name "Test Admin" --role admin
*/

import { randomBytes, scryptSync } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "../../src/db/schema";

const ROLES = schema.adminRole.enumValues;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function main() {
  const email = arg("email");
  const name = arg("name");
  const role = arg("role");
  const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");

  if (!email || !name || !role) {
    console.error("Chýba --email, --name alebo --role.");
    console.error(`Povolené roly: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    console.error(`Neznáma rola „${role}“. Povolené: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const { hash, salt } = hashPassword(password);
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, normalizedEmail)).limit(1);

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({ name, role: role as (typeof ROLES)[number], passwordHash: hash, passwordSalt: salt, active: true })
      .where(eq(schema.adminUsers.id, existing.id));
    console.log(`Aktualizovaný používateľ ${normalizedEmail} (rola: ${role}).`);
  } else {
    await db.insert(schema.adminUsers).values({ email: normalizedEmail, name, role: role as (typeof ROLES)[number], passwordHash: hash, passwordSalt: salt });
    console.log(`Vytvorený používateľ ${normalizedEmail} (rola: ${role}).`);
  }

  if (!arg("password") && !process.env.ADMIN_PASSWORD) {
    console.log(`Vygenerované heslo (zapíšte si ho, nezobrazí sa znova): ${password}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
