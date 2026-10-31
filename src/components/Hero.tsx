import heroImage from "../assets/hero.png";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-10 md:grid-cols-2"
    >
      <div>
        <p className="text-xs text-muted">Bem-vindo à Kurio</p>
        <h1
          id="hero-title"
          className="mt-4 text-3xl font-bold leading-tight md:text-4xl"
        >
          SEJA DONO DO FUTURO DA ARTE DIGITAL
        </h1>
        <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da
          cultura de inovação.
        </p>
        <a
          href="#catalogo"
          className="mt-6 inline-block rounded bg-accent px-5 py-2 text-xs font-bold text-bg hover:opacity-90"
        >
          EXPLORAR
        </a>
      </div>
      <img
        src={heroImage}
        alt="Macaco de óculos escuros e jaqueta verde em arte digital"
        width={460}
        height={460}
        fetchPriority="high"
        className="mx-auto aspect-square w-full max-w-[460px] rounded-xl object-cover"
      />
    </section>
  );
}
