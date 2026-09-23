import "server-only";

import { storage } from "@/server/storage";
import type { GeneratedImage, ImageProvider, TextProvider } from "./types";

/*
  Mock adaptéry – vracajú zástupné obrázky a vzorový text, aby sa dal celý
  proces vyvíjať a testovať bez prístupu k AI a bez fotiek skutočných detí (N10).
*/

const META = { provider: "mock", model: "mock-1", costMicroUsd: 0 };

async function placeholder(label: string, width: number, height: number): Promise<GeneratedImage> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<rect width="100%" height="100%" fill="#fff4ec"/>
<text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(width / 16)}" fill="#ff661a">${label}</text>
</svg>`;
  const storageKey = `mock/${crypto.randomUUID()}.svg`;
  await storage.put(storageKey, Buffer.from(svg), "image/svg+xml");
  return { storageKey, width, height };
}

export const mockImageProvider: ImageProvider = {
  id: "mock",
  async portrait(req) {
    return { image: await placeholder(`portrét · ${req.style}`, 768, 768), meta: META };
  },
  async characterCard(req) {
    const [portrait, fullBody, smile, surprise] = await Promise.all([
      placeholder(`portrét · ${req.style}`, 768, 768),
      placeholder(`postava · ${req.style}`, 768, 1152),
      placeholder("úsmev", 512, 512),
      placeholder("prekvapenie", 512, 512),
    ]);
    return { images: { portrait, fullBody, smile, surprise }, meta: META };
  },
  async scene(req) {
    const width = req.aspect === "2:1" ? 2048 : 1024;
    return { image: await placeholder(`scéna · ${req.style}`, width, 1024), meta: META };
  },
};

export const mockTextProvider: TextProvider = {
  id: "mock",
  async storyIdeas() {
    return {
      ideas: [
        { title: "Výprava za stratenou hviezdou", summary: "{meno} nájde v záhrade hviezdu, ktorá spadla z neba, a pomôže jej vrátiť sa domov." },
        { title: "Tajomstvo starého lesa", summary: "{meno} sa s kamarátom vydá do lesa, kde stromy rozprávajú." },
        { title: "Veľká oslava", summary: "{meno} pripravuje prekvapenie pre celú rodinu." },
      ],
      meta: META,
    };
  },
  async writeStory(brief, idea) {
    const title = "title" in idea ? idea.title : "Môj príbeh";
    return {
      story: {
        title,
        annotation: `Príbeh, v ktorom je {meno} hlavným hrdinom.`,
        spreads: Array.from({ length: brief.spreads }, (_, i) => ({
          text: `Dvojstrana ${i + 1}: {meno} {rod:zažil|zažila} ďalšie dobrodružstvo.`,
          scene: `Scéna ${i + 1}: hrdina v záhrade za domom, pokojná zóna vľavo hore.`,
        })),
        bible: { characters: ["{meno}"], places: ["záhrada"] },
        moral: "Odvaha je, keď sa bojíš, a aj tak pomôžeš.",
        questions: ["Čo {meno} našiel?", "Komu pomohol?", "Čo by si urobil ty?"],
      },
      meta: META,
    };
  },
  async rewriteSpread(text, instruction) {
    return { text: `${text} (prepísané: ${instruction})`, meta: META };
  },
};
