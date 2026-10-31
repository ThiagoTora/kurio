import nft1 from "@/assets/nfts/1.png";
import nft2 from "@/assets/nfts/2.png";
import nft3 from "@/assets/nfts/3.png";
import nft4 from "@/assets/nfts/4.png";

const posts = [
  {
    img: nft1,
    alt: "Gorila de casaco bege e gola alta verde",
    date: "12 de setembro",
    read: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
  },
  {
    img: nft2,
    alt: "Macaco de óculos escuros e jaqueta verde",
    date: "13 de setembro",
    read: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
  },
  {
    img: nft3,
    alt: "Gorila de chapéu bucket e moletom roxo",
    date: "15 de setembro",
    read: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
  },
  {
    img: nft4,
    alt: "Macaco laranja com fones de ouvido",
    date: "15 de setembro",
    read: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
  },
];

export function JournalSection() {
  return (
    <section
      aria-labelledby="journal-title"
      className="mx-auto mt-20 max-w-[1200px] px-4"
    >
      <div className="text-center">
        <h2 id="journal-title" className="text-xl font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-[11px] text-muted">
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p) => (
          <li key={p.title}>
            <article className="h-full overflow-hidden rounded-md bg-surface">
              <img
                src={p.img}
                alt={p.alt}
                width={280}
                height={200}
                loading="lazy"
                className="aspect-[7/5] w-full object-cover"
              />
              <div className="space-y-2 p-3 text-[11px]">
                <p className="text-muted">
                  {p.date} <span aria-hidden>|</span> {p.read}
                </p>
                <h3 className="text-xs font-bold leading-snug">{p.title}</h3>
                <p className="text-muted">{p.text}</p>
                <span
                  aria-disabled="true"
                  title="Indisponível nesta demonstração"
                  className="inline-block font-bold text-accent"
                >
                  Ler mais →
                </span>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
