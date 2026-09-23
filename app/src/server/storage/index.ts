import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/*
  Úložisko súborov za rozhraním. Lokálne ide o priečinok STORAGE_DIR mimo
  public/ (fotky detí nesmú byť verejne dostupné, S5). V produkcii sa
  vymení za šifrované úložisko v EÚ s krátkodobými odkazmi.

  Priestory (prefix kľúča): photos/ (lehota zmazania!), cards/, pages/, pdf/.
*/

export interface Storage {
  put(key: string, data: Buffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function localStorage(root: string): Storage {
  const resolve = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error(`Neplatný kľúč: ${key}`);
    return full;
  };
  return {
    async put(key, data) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    },
    get: (key) => readFile(resolve(key)),
    delete: (key) => rm(resolve(key), { force: true }),
  };
}

export const storage: Storage = localStorage(process.env.STORAGE_DIR ?? "./.storage");
