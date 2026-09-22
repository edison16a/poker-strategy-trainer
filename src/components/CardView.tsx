"use client";

import type { Card } from "@/domain/types";
import { isRed, prettySuit } from "@/domain/cards";
import clsx from "clsx";

/** One playing card, face up, face down (`hidden`), or a placeholder back (`card` null). */
export function CardView({
  card,
  hidden = false,
  small = false,
  animateFlip = false,
}: {
  card: Card | null;
  hidden?: boolean;
  small?: boolean;
  animateFlip?: boolean;
}) {
  const sizeClass = small ? "card-shell small" : "card-shell";
  const flipClass = animateFlip ? "card-flip" : "";

  if (hidden || !card) {
    return (
      <div className={clsx(sizeClass, "card-back", flipClass)}>
        <div className="card-back-inner" />
      </div>
    );
  }

  const red = isRed(card.s);
  return (
    <div className={clsx(sizeClass, "card-face", red ? "red" : "dark", flipClass)}>
      <div className="card-rank top">
        {card.r}
        <span className="suit">{prettySuit(card.s)}</span>
      </div>
      <div className="card-suit">{prettySuit(card.s)}</div>
      <div className="card-rank bottom">
        {card.r}
        <span className="suit">{prettySuit(card.s)}</span>
      </div>
    </div>
  );
}
