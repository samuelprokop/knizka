/*
  Vývojové dáta: štartovací slovník mien a vzorový príbeh.
  Spúšťa sa: npm run db:seed (idempotentné – pri opakovaní záznamy aktualizuje).
  Poznámka: nepoužíva "@/db", lebo ten je "server-only" (len pre Next.js).
*/

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../src/db/schema";
import type { StorySpread } from "../src/db/schema";
import { SEED_NAMES } from "../src/lib/language/seed-names";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const SK_SPREADS: StorySpread[] = [
  { text: "Ráno sa {meno} zobudil{rod:|a} skôr ako slniečko. Dnes je veľký deň – prvý deň v škôlke!", scene: "Detská izba za úsvitu, hrdina sedí na posteli a naťahuje sa. Pokojná zóna vľavo hore." },
  { text: "Mama pomohla {meno:D} obliecť si nové tričko a do batôžka zbalili obľúbenú hračku.", scene: "Hrdina a mama pri skrini, batôžtek na stoličke. Pokojná zóna vpravo." },
  { text: "Cestou {meno} pozeral{rod:|a} na vtáčiky. „Aj oni idú do svojej škôlky?“ opýtal{rod:|a} sa.", scene: "Ulica s lipami, hrdina drží mamu za ruku, na strome sedia vrabce. Pokojná zóna hore." },
  { text: "Pred dverami škôlky sa {meno:D} trochu roztriasli kolená.", scene: "Farebné dvere škôlky, hrdina stojí pred nimi s batôžkom. Pokojná zóna vľavo." },
  { text: "Pani učiteľka sa usmiala: „Vitaj, {meno}! Čakali sme na teba.“", scene: "Usmiata učiteľka sa skláňa k hrdinovi pri vchode. Pokojná zóna vpravo hore." },
  { text: "V triede bolo plno hračiek, farbičiek a jeden veľký kobercový vláčik.", scene: "Svetlá trieda s hračkami a kobercom v tvare vláčika. Pokojná zóna hore." },
  { text: "Pri kocke sedelo dievčatko, ktoré sa tiež trochu bálo. {meno} si prisadol{rod:|a} bližšie.", scene: "Hrdina si sadá k dievčatku pri kockách. Pokojná zóna vľavo hore." },
  { text: "Spolu postavili vežu až do neba. Keď spadla, obaja sa rozosmiali.", scene: "Padajúca veža z kociek, dve smejúce sa deti. Pokojná zóna vpravo." },
  { text: "Na obed bola polievka s písmenkami. {meno} v nej hľadal{rod:|a} svoje meno.", scene: "Stôl s tanierom polievky, hrdina drží lyžicu. Pokojná zóna hore." },
  { text: "Po obede si všetci ľahli a pani učiteľka čítala rozprávku o odvážnom ježkovi.", scene: "Deti na ležadlách, učiteľka číta knihu. Pokojná zóna vľavo hore." },
  { text: "Poobede prišla mama. {meno} sa rozbehol{rod:|a} k nej: „Mami, zajtra idem zas!“", scene: "Hrdina beží v náručí mamy v šatni škôlky. Pokojná zóna vpravo hore." },
  { text: "Večer v posteli sa {meno} usmieval{rod:|a}. Nový deň, nová kamarátka – a vôbec to nebolo strašidelné.", scene: "Hrdina v posteli pri nočnej lampičke, za oknom hviezdy. Pokojná zóna hore." },
];

const CS_SPREADS: StorySpread[] = [
  { text: "Ráno se {meno} probudil{rod:|a} dřív než sluníčko. Dnes je velký den – první den ve školce!", scene: SK_SPREADS[0].scene },
  { text: "Maminka pomohla {meno:D} obléct nové tričko a do batůžku zabalili oblíbenou hračku.", scene: SK_SPREADS[1].scene },
  { text: "Cestou se {meno} díval{rod:|a} na ptáčky. „Jdou taky do své školky?“ zeptal{rod:|a} se.", scene: SK_SPREADS[2].scene },
  { text: "Před dveřmi školky se {meno:D} trochu roztřásla kolena.", scene: SK_SPREADS[3].scene },
  { text: "Paní učitelka se usmála: „Vítej, {meno:V}! Čekali jsme na tebe.“", scene: SK_SPREADS[4].scene },
  { text: "Ve třídě bylo plno hraček, pastelek a jeden velký kobercový vláček.", scene: SK_SPREADS[5].scene },
  { text: "U kostek sedělo děvčátko, které se taky trochu bálo. {meno} si přisedl{rod:|a} blíž.", scene: SK_SPREADS[6].scene },
  { text: "Spolu postavili věž až do nebe. Když spadla, oba se rozesmáli.", scene: SK_SPREADS[7].scene },
  { text: "K obědu byla polévka s písmenky. {meno} v ní hledal{rod:|a} svoje jméno.", scene: SK_SPREADS[8].scene },
  { text: "Po obědě si všichni lehli a paní učitelka četla pohádku o statečném ježkovi.", scene: SK_SPREADS[9].scene },
  { text: "Odpoledne přišla maminka. {meno} se k ní rozběhl{rod:|a}: „Mami, zítra jdu zas!“", scene: SK_SPREADS[10].scene },
  { text: "Večer v posteli se {meno} usmíval{rod:|a}. Nový den, nová kamarádka – a vůbec to nebylo strašidelné.", scene: SK_SPREADS[11].scene },
];

async function seedNames() {
  for (const entry of SEED_NAMES) {
    const values = {
      language: entry.language,
      name: entry.forms.N,
      gender: entry.gender,
      forms: entry.forms,
      declinable: entry.declinable ?? true,
      diminutives: entry.diminutives ?? [],
      baseName: entry.baseName ?? null,
      // Neoverené korektorom – kým ich neprejde jazykový balík.
      verified: false,
    };
    await db
      .insert(schema.nameDictionary)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.nameDictionary.language, schema.nameDictionary.name],
        set: values,
      });
  }
  console.log(`Mená: ${SEED_NAMES.length}`);
}

async function seedStories() {
  const [story] = await db
    .insert(schema.stories)
    .values({
      slug: "prvy-den-v-skolke",
      category: "milestones",
      ageMin: 3,
      ageMax: 5,
      spreads: 12,
      styles: ["watercolor", "modern", "animated", "crayon"],
      companionSlots: 1,
      published: true,
    })
    .onConflictDoUpdate({ target: schema.stories.slug, set: { published: true } })
    .returning();

  const editions = [
    {
      language: "sk",
      title: "{meno} ide do škôlky",
      annotation: "Prvý deň v škôlke je veľké dobrodružstvo. {meno} zistí, že nové miesto môže byť plné kamarátov.",
      developmentGoal: "Pripraviť dieťa na nástup do škôlky a zmierniť obavy z nového prostredia.",
      spreads: SK_SPREADS,
    },
    {
      language: "cs",
      title: "{meno} jde do školky",
      annotation: "První den ve školce je velké dobrodružství. {meno} zjistí, že nové místo může být plné kamarádů.",
      developmentGoal: "Připravit dítě na nástup do školky a zmírnit obavy z nového prostředí.",
      spreads: CS_SPREADS,
    },
  ];

  for (const edition of editions) {
    await db
      .insert(schema.storyEditions)
      .values({ storyId: story.id, version: 1, author: "Redakcia TAKTIK (vzorový text)", detailSlots: ["toy", "kindergarten", "teacher"], ...edition })
      .onConflictDoUpdate({
        target: [schema.storyEditions.storyId, schema.storyEditions.language, schema.storyEditions.version],
        set: edition,
      });
  }
  console.log(`Príbehy: 1 (${editions.length} edície)`);
}

async function main() {
  await seedNames();
  await seedStories();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
