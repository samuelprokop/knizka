"use client";

import { useFlyToBasket } from "@/components/FlyToBasket";
import { buttonClass } from "@/features/configurator/components/ui";
import { NextArrow } from "@/components/buttons";

export function AnimationsDemo() {
  const basket = useFlyToBasket("Košík");
  return (
    <>
      <button type="button" className={buttonClass("next")} onClick={(e) => void basket.fly(e.currentTarget)}>
        Schváliť a objednať
        <NextArrow />
      </button>
      {basket.layer}
    </>
  );
}
