"use client";

import type { Card } from "@/lib/types";
import { isRed, prettySuit } from "@/lib/cards";
import clsx from "clsx";

export function CardView({
  card,
  hidden = false,
  small = false,
}: {
  card: Card | null;
  hidden?: boolean;
  small?: boolean;
}) {
  const sizeClass = small ? "card-shell small" : "card-shell";

  if (hidden) {
    return (
      <div className={clsx(sizeClass, "card-back")}>
        <div className="card-back-inner" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className={clsx(sizeClass, "card-empty")} />
    );
  }

  const red = isRed(card.s);
  return (
    <div className={clsx(sizeClass, "card-face", red ? "red" : "dark")}>
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
