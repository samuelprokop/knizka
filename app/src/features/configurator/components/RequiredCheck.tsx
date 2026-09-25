"use client";

/*
  Povinné zaškrtávacie políčko vo formulári (napr. obchodné podmienky). Keď ho zákazník
  nezaškrtne a odošle, namiesto systémovej bubliny a modrého zvýraznenia prehliadača
  sa políčko zafarbí do chybovej farby stránky, jemne sa zatrasie a pod ním je text chyby.
  Kontrolu robí stále prehliadač (required) – formulár sa bez zaškrtnutia neodošle.
*/

import { useId, useState, type ReactNode } from "react";

import { Check, FieldError } from "./ui";

export function RequiredCheck({
  name,
  message,
  children,
  checked: controlled,
  onCheckedChange,
}: {
  name: string;
  message: string;
  children: ReactNode;
  /** Riadené zvonka (napr. „Súhlasím“ v okne s podmienkami). */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const id = useId();
  const [own, setOwn] = useState(false);
  const checked = controlled ?? own;
  const setChecked = (v: boolean) => (onCheckedChange ? onCheckedChange(v) : setOwn(v));
  const [invalid, setInvalid] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Zaškrtnuté zvonka (okno s podmienkami) – chyba už neplatí.
  const shownInvalid = invalid && !checked;

  return (
    <div className="flex flex-col">
      <div key={attempt} className={shownInvalid ? "motion-safe:animate-[nudge_0.32s_cubic-bezier(0.16,1,0.3,1)]" : undefined}>
        <Check
          id={id}
          name={name}
          required
          checked={checked}
          invalid={shownInvalid}
          dense
          aria-describedby={shownInvalid ? `${id}-error` : undefined}
          onInvalid={(e) => {
            // Bez systémovej bubliny – chybu ukážeme sami, vo farbách stránky.
            e.preventDefault();
            setInvalid(true);
            setAttempt((n) => n + 1);
            e.currentTarget.focus({ preventScroll: true });
          }}
          onChange={(v) => {
            setChecked(v);
            if (v) setInvalid(false);
          }}
        >
          {children}
        </Check>
      </div>
      {shownInvalid && (
        <div id={`${id}-error`} className="pl-9">
          <FieldError>{message}</FieldError>
        </div>
      )}
    </div>
  );
}
