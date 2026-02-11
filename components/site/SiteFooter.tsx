import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Share2 } from "lucide-react";
import logoLindisseMonocromatic from "@/public/logomarca-lindisse-monocromatic.webp";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-(--border) bg-(--paper)">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2 xl:grid-cols-4">
        <section className="flex h-full flex-col items-start gap-2">
          <h2 className="text-sm font-semibold text-(--ink)">Lindisse: Excelência em Cada Detalhe</h2>
          <p className="text-xs leading-relaxed text-(--muted-2)">
            Muito mais que indicações de produtos: entregamos o conhecimento técnico por trás do acabamento perfeito.
            Do motor ao top coat, ajudamos você a montar um arsenal de alta performance para fidelizar suas clientes.
          </p>
          <Link href="/" className="mt-auto inline-flex items-center justify-start pt-4">
            <Image src={logoLindisseMonocromatic} alt="Lindisse" className="h-16 w-auto md:h-20" />
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Aviso de Transparência</h2>
          <p className="text-xs leading-relaxed text-(--muted-2)">
            Como Associado da Amazon, eu ganho com compras qualificadas. Alguns links neste site podem ser links de
            afiliado. Isso não altera o seu preço e ajuda a manter este projeto de curadoria técnica ativo.
          </p>
          <p className="text-xs leading-relaxed text-(--muted-2)">
            O Lindisse é um serviço de recomendação de produtos da Amazon, focado em posts analíticos para que você
            possa tomar decisões de compra rápidas, seguras e profissionais. Seja para encontrar ótimos produtos ou
            descobrir dicas úteis para o seu studio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Páginas de Termos do site</h2>
          <ul className="space-y-1 text-xs text-(--muted-2)">
            <li>
              <Link className="hover:text-(--brand-hot)" href="/colaboradores">
                Colaboradores da lindisse.com.br
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/politica-de-privacidade">
                Política de privacidade da lindisse.com.br
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/politica-editorial">
                Política Editorial na lindisse.com.br
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/politica-de-afiliados">
                Política de afiliados na lindisse.com.br
              </Link>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Fale Conosco</h2>
          <ul className="space-y-1 text-xs text-(--muted-2)">
            <li>
              <a className="hover:text-(--brand-hot)" href="mailto:contato@lindisse.com.br" rel="noreferrer">
                contato@lindisse.com.br
              </a>
            </li>
            <li>Endereço: R. Pais Leme, 215 - Pinheiros, São Paulo - SP, 05424-150</li>
            <li>
              Telefone:{" "}
              <a className="hover:text-(--brand-hot)" href="tel:+5511961714762" rel="noreferrer">
                (11) 96171-4762
              </a>
            </li>
            <li className="flex items-center gap-1 pt-1 font-medium text-(--ink)">
              <Share2 size={14} aria-hidden="true" />
              <span>Redes sociais oficiais</span>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--paper) px-2.5 py-1 hover:border-(--brand-hot)"
                href="https://br.pinterest.com/lindissestetic/"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest oficial da Lindisse"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E60023] text-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
                    <path d="M12 2C6.49 2 2 6.49 2 12c0 4.23 2.64 7.84 6.36 9.29-.09-.79-.16-2 .03-2.86.17-.73 1.07-4.65 1.07-4.65s-.27-.53-.27-1.31c0-1.23.71-2.15 1.6-2.15.75 0 1.11.56 1.11 1.24 0 .76-.49 1.89-.74 2.94-.21.89.45 1.62 1.33 1.62 1.6 0 2.82-1.69 2.82-4.12 0-2.15-1.55-3.65-3.76-3.65-2.56 0-4.07 1.92-4.07 3.91 0 .77.3 1.6.67 2.05.07.09.08.17.06.26-.07.29-.22.89-.26 1.01-.04.16-.12.19-.29.12-1.09-.45-1.77-1.87-1.77-3.01 0-2.45 1.78-4.7 5.14-4.7 2.7 0 4.8 1.92 4.8 4.5 0 2.69-1.7 4.85-4.06 4.85-.79 0-1.54-.41-1.8-.9l-.49 1.85c-.18.69-.66 1.55-.98 2.08.74.23 1.52.35 2.33.35 5.51 0 10-4.49 10-10S17.51 2 12 2z" />
                  </svg>
                </span>
                <span className="font-medium text-(--ink)">Pinterest</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
            <li className="break-all text-[11px] text-(--muted-3)">https://br.pinterest.com/lindissestetic/</li>
          </ul>
        </section>
      </div>

      <div className="border-t border-(--border) py-6 text-center text-xs text-(--muted-3)">
        © {new Date().getFullYear()} Lindisse. Todos os direitos reservados.
      </div>
    </footer>
  );
}
