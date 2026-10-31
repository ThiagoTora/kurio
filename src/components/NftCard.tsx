import type { Nft } from "@/types/nft";
import { Link } from "@tanstack/react-router";

export function NftCard({ nft }: { nft: Nft }) {
  return (
    <li>
      <Link
        to="/nft/$id"
        params={{ id: nft.id }}
        className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="rounded-sm bg-surface p-2.5">
          <img
            src={nft.image}
            alt={nft.name}
            width={220}
            height={220}
            loading="lazy"
            className="aspect-square w-full rounded-lg object-cover"
          />
        </div>
        <p className="mt-3 truncate text-xs">{nft.name}</p>
        <p className="mt-1 text-xs font-bold text-accent">
          {nft.price} ETH
          {nft.oldPrice && (
            <>
              <span className="sr-only"> preço anterior </span>
              <span className="ml-2 font-normal text-accent/70">
                {nft.oldPrice} ETH
              </span>
            </>
          )}
        </p>
      </Link>
    </li>
  );
}

export function NftCardSkeleton() {
  return (
    <li aria-hidden>
      <div className="rounded-sm bg-surface p-2.5">
        <div className="skeleton aspect-square w-full rounded-lg" />
      </div>
      <div className="skeleton mt-3 h-3 w-2/3 rounded" />
      <div className="skeleton mt-2 h-3 w-1/3 rounded" />
    </li>
  );
}
