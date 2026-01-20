export function randomGain(base: number): number {
  const spread = Math.max(2, Math.round(base * 0.2));
  const min = Math.max(1, base - spread);
  const max = base + spread;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function eloDeltaFromScore(score: number): number {
  let base: number;
  if (score >= 100) base = 500;
  else if (score > 95) base = 425;
  else if (score >= 90) base = 330;
  else if (score >= 75) base = 250;
  else if (score >= 55) base = 185;
  else if (score >= 40) base = -50;
  else if (score >= 20) base = -70;
  else if (score >= 11) base = -90;
  else base = -150;

  return base > 0 ? randomGain(base) : base;
}

export function clampElo(x: number) {
  return Math.max(0, Math.round(x));
}
