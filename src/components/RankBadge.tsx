"use client";

import Image from "next/image";
import type { RankName } from "@/domain/types";
import { rankImagePath } from "@/domain/ranks";
import { COPY } from "@/data/copy";

export function RankBadge({ rank }: { rank: RankName }) {
  return (
    <div className="panel rank-badge">
      <div className="rank-image-frame">
        <Image
          src={rankImagePath(rank)}
          alt={rank}
          fill
          className="rank-image"
          sizes="64px"
        />
      </div>
      <div>
        <div className="label">{COPY.ranks.rank}</div>
        <div className="title-sm">{rank}</div>
      </div>
    </div>
  );
}
