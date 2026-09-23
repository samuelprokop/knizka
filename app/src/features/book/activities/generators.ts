/*
  Generátory strán aktivít (špecifikácia: Generátory strán aktivít). Úlohy sa
  tvoria z mena, veku a príbehu; náhoda je deterministická podľa projektu.
*/

import type { BookFormat } from "@/config/catalog";
import type { BookLanguage } from "@/i18n/locales";
import { FORMAT_SPECS } from "../design";
import type { Random } from "../model/random";
import type { CountData, CountIcon, FindLettersData, MazeData } from "../model/types";

/** Abeceda jazyka pre hľadanie písmen – aj s diakritikou (závislosť od trhu). */
export const ALPHABETS: Record<BookLanguage, string> = {
  sk: "AÁÄBCČDĎEÉFGHIÍJKLĹĽMNŇOÓÔPRŔSŠTŤUÚVYÝZŽ",
  cs: "AÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPRŘSŠTŤUÚŮVYÝZŽ",
};

const LOCALE: Record<BookLanguage, string> = { sk: "sk-SK", cs: "cs-CZ" };

/** Vekové pásma špecifikácie: 3 – 4, 5 – 6, 7 – 8 rokov. */
const band = (age: number) => (age <= 4 ? 0 : age <= 6 ? 1 : 2);

export function uniqueNameLetters(name: string, language: BookLanguage): string[] {
  const letters = [...name.toLocaleUpperCase(LOCALE[language])].filter((ch) => /\p{L}/u.test(ch));
  return [...new Set(letters)];
}

export function generateFindLetters(name: string, age: number, language: BookLanguage, rand: Random): FindLettersData {
  const [rows, cols] = [[4, 6], [5, 8], [6, 9]][band(age)];
  const targets = uniqueNameLetters(name, language);
  const others = [...ALPHABETS[language]].filter((ch) => !targets.includes(ch));

  // Každé písmeno mena aspoň raz, spolu asi štvrtina mriežky; zvyšok iné písmená.
  const cells = rows * cols;
  const targetCount = Math.max(targets.length, Math.min(Math.round(cells / 4), targets.length * 3));
  const letters: string[] = [];
  for (let i = 0; i < targetCount; i++) letters.push(targets[i % targets.length]);
  while (letters.length < cells) letters.push(rand.pick(others));
  const shuffled = rand.shuffle(letters);

  const grid = Array.from({ length: rows }, (_, r) => shuffled.slice(r * cols, (r + 1) * cols));
  return { grid, targets };
}

const COUNT_ICONS: CountIcon[] = ["star", "apple", "ball", "flower", "fish", "heart"];

export function generateCount(age: number, rand: Random): CountData {
  const [groups, min, max] = [[3, 1, 5], [4, 2, 8], [4, 4, 12]][band(age)];
  const icons = rand.shuffle(COUNT_ICONS).slice(0, groups);
  // Rôzne počty, aby sa dali odpovede ľahko skontrolovať.
  const numbers = rand.shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i)).slice(0, groups);
  return { items: icons.map((icon, i) => ({ icon, n: numbers[i] })) };
}

export const MAZE_WALL = { top: 1, right: 2, bottom: 4, left: 8 } as const;

/** Bludisko s jedinou cestou (rekurzívne prehľadávanie s návratom). Rozmer podľa veku a formátu. */
export function generateMaze(age: number, format: BookFormat, rand: Random): MazeData {
  const base = [5, 7, 9][band(age)];
  const landscape = FORMAT_SPECS[format].orientation === "landscape";
  const cols = landscape ? Math.round(base * 1.8) : base;
  const rows = landscape ? base : Math.round(base * 1.2);

  const cells = new Array<number>(cols * rows).fill(0);
  const visited = new Array<boolean>(cols * rows).fill(false);
  const stack = [0];
  visited[0] = true;
  const moves = [
    { dx: 0, dy: -1, wall: MAZE_WALL.top, opposite: MAZE_WALL.bottom },
    { dx: 1, dy: 0, wall: MAZE_WALL.right, opposite: MAZE_WALL.left },
    { dx: 0, dy: 1, wall: MAZE_WALL.bottom, opposite: MAZE_WALL.top },
    { dx: -1, dy: 0, wall: MAZE_WALL.left, opposite: MAZE_WALL.right },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const x = current % cols;
    const y = Math.floor(current / cols);
    const options = moves.filter(({ dx, dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny * cols + nx];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const move = rand.pick(options);
    const nextIndex = (y + move.dy) * cols + (x + move.dx);
    cells[current] |= move.wall;
    cells[nextIndex] |= move.opposite;
    visited[nextIndex] = true;
    stack.push(nextIndex);
  }
  return { cols, rows, cells };
}
