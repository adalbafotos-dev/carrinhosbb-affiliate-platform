"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Segment = {
  text: string;
  href?: string;
};

type NarrativeCard = {
  title: string;
  segments: Segment[];
};

const NARRATIVE_CARDS: NarrativeCard[] = [
  {
    title: "O Coração da Mesa: Eletrônicos",
    segments: [
      {
        text: "A qualidade do seu alongamento depende diretamente da potência da sua máquina. Não adianta usar o melhor gel se a cura for ineficiente. Nós analisamos as especificações técnicas, a vida útil e a potência real dos melhores equipamentos do mercado, desde ",
      },
      { text: "cabines LED/UV", href: "/equipamentos" },
      { text: " até " },
      { text: "lixadeiras elétricas de alta rotação", href: "/equipamentos" },
      { text: ", para que você invista em durabilidade." },
    ],
  },
  {
    title: "Para Começar sem Erro",
    segments: [
      {
        text: "Iniciar no mundo das unhas pode ser confuso com tantas opções de compra avulsa. Para quem busca economia inicial sem abrir mão da qualidade, a melhor estratégia é buscar ",
      },
      { text: "kits completos", href: "/kits" },
      {
        text: ". Avaliamos quais conjuntos da Amazon oferecem o melhor custo-benefício, separando aqueles que trazem itens profissionais daqueles que são apenas brinquedos.",
      },
    ],
  },
  {
    title: "O Universo da Fibra",
    segments: [
      {
        text: "A técnica queridinha do Brasil exige filamentos de alta qualidade para não pinicar e sumir no gel. Testamos a aderência, a espessura e a flexibilidade das principais marcas de ",
      },
      { text: "fibra de vidro", href: "/fibra" },
      {
        text: " disponíveis, ajudando você a encontrar o material que garante aquela estrutura fina e resistente que as clientes amam.",
      },
    ],
  },
  {
    title: "A Química dos Géis",
    segments: [
      {
        text: "Hard, Soft, Base, Control. A variedade é enorme e comprar o pote errado é dinheiro jogado fora. Nossos comparativos focam na viscosidade, sensação térmica (ardência) e tempo de cura dos ",
      },
      { text: "géis mais vendidos", href: "/geis" },
      {
        text: ", para que você saiba exatamente qual produto comprar para curvatura, ponto de tensão ou apenas capa base.",
      },
    ],
  },
  {
    title: "Alongamento Express",
    segments: [
      {
        text: "Para quem busca agilidade de aplicação ou soluções modernas como o sistema Soft Gel, a qualidade do material plástico é tudo. Analisamos a resistência, o formato e a naturalidade das ",
      },
      { text: "postiças e tips de cobertura completa", href: "/posticas" },
      { text: ", indicando quais marcas oferecem aquele acabamento realista que não trinca com facilidade." },
    ],
  },
  {
    title: "Acabamento e Decoração",
    segments: [
      {
        text: "O diferencial visual está nos detalhes que encantam. Mas nem todo glitter brilha igual e nem todo top coat mantém o brilho por 20 dias. Fizemos a seleção dos melhores ",
      },
      { text: "itens de decoração, esmaltes em gel e finalizadores", href: "/decoracao" },
      { text: " para que você compre materiais que valorizem sua arte, e não aqueles que descascam na primeira semana." },
    ],
  },
  {
    title: "Gestão e Mobiliário",
    segments: [
      {
        text: "Um bom Nail Designer precisa de um ambiente que funcione. Além dos produtos químicos, avaliamos itens essenciais para a estrutura do seu negócio, como mesas, luminárias, aspiradores de pó e ",
      },
      { text: "itens para a profissão", href: "/profissao" },
      { text: ", focando em ergonomia e apresentação profissional para o seu espaço." },
    ],
  },
];

function siloGradient(index: number) {
  const gradients = [
    "linear-gradient(145deg, rgba(241,188,153,0.45), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(229,209,195,0.72), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(243,97,65,0.16), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(166,119,100,0.18), rgba(255,255,255,0.96))",
  ];

  return gradients[index % gradients.length];
}

export function SiloNarrativeCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const cancelClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    dragRef.current.active = true;
    dragRef.current.startX = event.clientX;
    dragRef.current.scrollLeft = scroller.scrollLeft;
    dragRef.current.moved = false;
    setDragging(true);
    scroller.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || !dragRef.current.active) return;

    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 5) {
      dragRef.current.moved = true;
    }
    scroller.scrollLeft = dragRef.current.scrollLeft - delta;
  };

  const finishDrag = (pointerId: number) => {
    const scroller = scrollerRef.current;
    if (!scroller || !dragRef.current.active) return;

    dragRef.current.active = false;
    setDragging(false);

    if (dragRef.current.moved) {
      cancelClickRef.current = true;
      setTimeout(() => {
        cancelClickRef.current = false;
      }, 0);
    }

    try {
      scroller.releasePointerCapture(pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (cancelClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      ref={scrollerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      className={`stagger-grid flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      style={{ touchAction: "pan-y" }}
      aria-label="Cards deslizáveis de conteúdo"
    >
      {NARRATIVE_CARDS.map((card, index) => (
        <article
          key={card.title}
          className="snap-start shrink-0 basis-[88%] rounded-3xl border border-(--border) p-5 sm:basis-[68%] lg:basis-[calc((100%-3rem)/4)]"
          style={{ background: siloGradient(index) }}
        >
          <h3 className="text-xl font-semibold text-(--ink)">{card.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-(--muted)">
            {card.segments.map((segment, segmentIndex) =>
              segment.href ? (
                <Link key={`${card.title}-${segmentIndex}`} href={segment.href} className="font-semibold text-(--brand-hot) underline">
                  {segment.text}
                </Link>
              ) : (
                <span key={`${card.title}-${segmentIndex}`}>{segment.text}</span>
              )
            )}
          </p>
        </article>
      ))}
    </div>
  );
}
