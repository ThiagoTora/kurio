interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export function PriceRange({ min, max, value, onChange }: Props) {
  const pct = (n: number) =>
    max === min ? 0 : ((n - min) / (max - min)) * 100;

  return (
    <div className="range-dual">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-accent/40" />
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 bg-accent"
        style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
      />
      <input
        type="range"
        aria-label="Preço mínimo em ETH"
        min={min}
        max={max}
        step={0.01}
        value={value[0]}
        onChange={(e) =>
          onChange([Math.min(Number(e.target.value), value[1]), value[1]])
        }
      />
      <input
        type="range"
        aria-label="Preço máximo em ETH"
        min={min}
        max={max}
        step={0.01}
        value={value[1]}
        onChange={(e) =>
          onChange([value[0], Math.max(Number(e.target.value), value[0])])
        }
      />
    </div>
  );
}
