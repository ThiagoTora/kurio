import { useId, useState } from "react";
import featuredImg from "@/assets/featured.png";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NftListParams, NftListResponse } from "@/types/nft";
import { PriceRange } from "./PriceRange";

interface Props {
  facets?: NftListResponse["facets"];
  search: NftListParams;
  onChange: (patch: Partial<NftListParams>) => void;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

function FacetList({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: { key: string; label: string; count: number }[];
  selected?: string;
  onSelect: (key: string | undefined) => void;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 font-bold">
        {title}
      </h2>
      <ul className="space-y-3">
        {items.map((i) => {
          const active = selected === i.key;
          return (
            <li key={i.key}>
              <button
                aria-pressed={active}
                onClick={() => onSelect(active ? undefined : i.key)}
                className={`flex w-full justify-between rounded-sm py-0.5 pl-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  active
                    ? "text-primary"
                    : "text-foreground/90 hover:text-primary"
                }`}
              >
                <span>{i.label}</span>
                <span className="font-bold">({i.count})</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FiltersPanel({ facets, search, onChange }: Props) {
  const priceTitle = useId();
  const min = Number(facets?.priceRange.min ?? 0.02);
  const max = Number(facets?.priceRange.max ?? 12.3);

  const [draft, setDraft] = useState<[number, number] | null>(null);
  const range: [number, number] = draft ?? [
    Number(search.minPrice ?? min),
    Number(search.maxPrice ?? max),
  ];

  return (
    <div className="space-y-6">
      <FacetList
        title="Coleções"
        items={(facets?.collections ?? []).map((c) => ({
          key: c.slug,
          label: c.label,
          count: c.count,
        }))}
        selected={search.collection}
        onSelect={(key) => onChange({ collection: key })}
      />

      <section aria-labelledby={priceTitle}>
        <h2 id={priceTitle} className="mb-3 font-bold">
          Faixa de preço
        </h2>
        <PriceRange min={min} max={max} value={range} onChange={setDraft} />
        <p className="mt-3 text-muted-foreground">
          Preço: {fmt(range[0])} - {fmt(range[1])} ETH
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            onChange({
              minPrice: range[0].toFixed(2),
              maxPrice: range[1].toFixed(2),
            });
            setDraft(null);
          }}
        >
          Aplicar
        </Button>
      </section>

      <FacetList
        title="Rede"
        items={(facets?.networks ?? []).map((n) => ({
          key: n.slug,
          label: n.label,
          count: n.count,
        }))}
        selected={search.network}
        onSelect={(key) =>
          onChange({ network: key as NftListParams["network"] })
        }
      />
    </div>
  );
}

function FeaturedNft() {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-sm bg-surface"
    >
      <div className="px-3 pt-4 text-center">
        <h2 id={id} className="text-sm font-bold text-primary">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-2 text-[11px] font-bold tracking-wide">
          OFERTA LIMITADA
        </p>
      </div>
      <img
        src={featuredImg}
        alt="Macaco com chapéu bucket verde e moletom roxo"
        width={200}
        height={200}
        loading="lazy"
        className="mt-3 aspect-square w-full rounded-xl object-cover"
      />
    </section>
  );
}

// desktop (≥ 1024 px): coluna fixa ao lado da listagem
export function FiltersSidebar(props: Props) {
  return (
    <aside
      aria-label="Filtros"
      className="hidden flex-col gap-4 text-xs lg:flex"
    >
      <div className="rounded-sm bg-surface p-4">
        <FiltersPanel {...props} />
      </div>
      <FeaturedNft />
    </aside>
  );
}

// tablet e mobile (< 1024 px): botão que abre o drawer com foco controlado
export function FiltersDrawer({ total, ...props }: Props & { total?: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetTitle>Filtros</SheetTitle>
        <SheetDescription className="sr-only">
          Filtre o catálogo por coleção, preço e rede.
        </SheetDescription>
        <FiltersPanel {...props} />
        <SheetClose asChild>
          <Button className="mt-2">
            Ver resultados{total !== undefined ? ` (${total})` : ""}
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
