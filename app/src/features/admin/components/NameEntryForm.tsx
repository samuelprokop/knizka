"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CASE_KEYS, type Gender, type NameForms } from "@/lib/language";
import { saveNameEntryAction } from "../actions/names";
import { Button, Field, Input, Notice, Select } from "./ui";

const CASE_NAMES: Record<(typeof CASE_KEYS)[number], string> = {
  N: "Nominatív (kto, čo)",
  G: "Genitív (koho, čoho)",
  D: "Datív (komu, čomu)",
  A: "Akuzatív (koho, čo)",
  V: "Vokatív (oslovenie)",
  L: "Lokál (o kom, o čom)",
  I: "Inštrumentál (kým, čím)",
};

export type NameEntryInitial = {
  language: "sk" | "cs";
  name: string;
  gender: Gender;
  forms: NameForms;
  declinable: boolean;
  diminutives: string[];
  baseName: string | null;
};

export function NameEntryForm({ initial }: { initial: NameEntryInitial }) {
  const router = useRouter();
  const [language, setLanguage] = useState(initial.language);
  const [name, setName] = useState(initial.name);
  const [gender, setGender] = useState<Gender>(initial.gender);
  const [forms, setForms] = useState<NameForms>(initial.forms);
  const [declinable, setDeclinable] = useState(initial.declinable);
  const [diminutives, setDiminutives] = useState(initial.diminutives.join(", "));
  const [baseName, setBaseName] = useState(initial.baseName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveNameEntryAction({ language, name, gender, forms, declinable, diminutives, baseName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/slovnik");
      router.refresh();
    });
  };

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Jazyk" htmlFor="language">
          <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value as "sk" | "cs")}>
            <option value="sk">sk</option>
            <option value="cs">cs</option>
          </Select>
        </Field>
        <Field label="Rod" htmlFor="gender">
          <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="girl">dievča</option>
            <option value="boy">chlapec</option>
          </Select>
        </Field>
        <Field label="Meno (N)" htmlFor="name" hint="Podoba v nominatíve, napr. Anna.">
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Základné meno" htmlFor="baseName" hint="Ak je toto domácka podoba (Janko → Ján).">
          <Input id="baseName" value={baseName} onChange={(e) => setBaseName(e.target.value)} />
        </Field>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-medium text-ink/80">Tvary</legend>
        {CASE_KEYS.map((key) => (
          <Field key={key} label={`${key} – ${CASE_NAMES[key]}`} htmlFor={`form-${key}`}>
            <Input
              id={`form-${key}`}
              required
              value={forms[key]}
              onChange={(e) => setForms((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </Field>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" checked={declinable} onChange={(e) => setDeclinable(e.target.checked)} className="size-4" />
        Meno sa skloňuje
      </label>

      <Field label="Domácke podoby" htmlFor="diminutives" hint="Oddeľte čiarkou, napr. Anička, Anka, Aňa.">
        <Input id="diminutives" value={diminutives} onChange={(e) => setDiminutives(e.target.value)} />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>
          Uložiť
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/slovnik")}>
          Zrušiť
        </Button>
      </div>
    </form>
  );
}
