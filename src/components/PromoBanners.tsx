import banner1 from "@/assets/banner-1.png";
import banner2 from "@/assets/banner-2.png";

const banners = [
  {
    title: "Lançamentos gênesis de edição limitada",
    text: "Colecione edições raras direto dos criadores, antes da revelação pública.",
    img: banner1,
    cta: "Explorar",
  },
  {
    title: "Arte digital selecionada e muito mais",
    text: "Explore novos artistas, coleções verificadas e obras digitais que definem a cena.",
    img: banner2,
    cta: "Explorar",
  },
];
export function PromoBanners() {
  return (
    <section
      aria-label="Destaques"
      className="mx-auto mt-16 grid max-w-[1200px] gap-4 px-4 md:grid-cols-2"
    >
      {banners.map((b) => (
        <article
          key={b.title}
          className="grid grid-cols-[120px_1fr] overflow-hidden rounded-md bg-surface md:grid-cols-[160px_1fr]"
        >
          <img
            src={b.img}
            alt=""
            width={160}
            height={160}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="flex flex-col justify-center gap-2 p-4 text-right text-xs">
            <h3 className="font-bold">{b.title}</h3>
            <p className="text-muted">{b.text}</p>
            <a
              href="#catalogo"
              className="ml-auto rounded border border-accent px-3 py-1 text-accent hover:bg-accent hover:text-bg"
            >
              {b.cta} →
            </a>
          </div>
        </article>
      ))}
    </section>
  );
}
