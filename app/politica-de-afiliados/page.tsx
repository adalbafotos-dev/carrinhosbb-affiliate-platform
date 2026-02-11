import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Aviso de afiliados Amazon",
  description:
    "Entenda como funciona a monetização por afiliados do Lindisse, em conformidade com o Programa de Associados da Amazon.",
};

const LAST_UPDATED_ISO = "2026-02-10";
const LAST_UPDATED_LABEL = "10 de fevereiro de 2026";

export default function PoliticaAfiliadosPage() {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Aviso de Afiliados Amazon</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          A transparência e a ética são os pilares da relação entre o Lindisse e você, nossa leitora e colega de
          profissão.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Em conformidade com os Requisitos do Acordo Operacional do Programa de Associados da Amazon e com as
          diretrizes de publicidade digital, esta página tem o objetivo de explicar, de forma clara, a nossa relação
          comercial com a Amazon Brasil.
        </p>
      </header>

      <div className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted)">
        <div className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">1. Declaração Oficial de Associado</h2>
            <p>
              O Lindisse (lindisse.com.br) participa do Programa de Associados da Amazon, um serviço de intermediação
              de anúncios desenvolvido para permitir que sites cobrem taxas de publicidade ao anunciar e linkar para a{" "}
              <a className="text-(--brand-hot) underline" href="https://www.amazon.com.br" rel="noreferrer">
                Amazon.com.br
              </a>
              .
            </p>
            <blockquote className="rounded-2xl border border-(--border) bg-(--surface-muted) p-4 font-medium text-(--ink)">
              "Como participante do Programa de Associados da Amazon, o Lindisse ganha com compras qualificadas."
            </blockquote>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">2. O que isso significa para você?</h2>
            <p>
              Na prática, significa que quando você clica em um link de produto em nossos guias (seja uma cabine LED,
              um micromotor, um kit de fibra ou géis) e realiza uma compra na Amazon, nós podemos receber uma pequena
              comissão.
            </p>
            <p>É importante que você saiba que:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-(--ink)">Custo Zero para Você:</span> o preço do produto não muda e
                não fica mais caro por você ter clicado no nosso link. A comissão é paga pela própria Amazon, saindo
                da margem deles, não do seu bolso.
              </li>
              <li>
                <span className="font-medium text-(--ink)">Apoio ao Projeto:</span> essa comissão ajuda a custear a
                manutenção do site, a compra de produtos para testes e a produção de conteúdo técnico gratuito e de
                alta qualidade para a comunidade de Nail Designers.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">3. Nossa Independência Editorial</h2>
            <p>
              A existência dessa parceria nunca influencia nossa nota, nossa análise técnica ou nosso veredito sobre um
              produto.
            </p>
            <p>No Lindisse, a biossegurança e a performance na mesa de atendimento vêm em primeiro lugar.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Se um equipamento é popular e paga boa comissão, mas não atinge a potência real prometida ou oferece
                risco à saúde da unha, nós não o recomendaremos.
              </li>
              <li>
                Nossas listas de "Melhores do Ano" ou "Guias de Compra" são baseadas em critérios técnicos
                (viscosidade, RPM, durabilidade, eficiência de cura), independentemente da comissão gerada.
              </li>
            </ul>
            <p>Nossa lealdade é com a profissional que usa o equipamento, não com a marca que o vende.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">4. Sobre Preços e Disponibilidade</h2>
            <p>
              O Lindisse é um portal de conteúdo e curadoria, não somos uma loja. Nós não vendemos, não estocamos e
              não enviamos produtos.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-(--ink)">Variação de Preços:</span> os preços e a disponibilidade
                dos produtos na Amazon mudam constantemente. O preço exibido em nossos artigos é o preço verificado no
                momento da redação ou da última atualização do post. Sempre confira o valor final diretamente no site
                da Amazon antes de finalizar a compra.
              </li>
              <li>
                <span className="font-medium text-(--ink)">Imagens:</span> as imagens de produtos utilizadas no site
                são fornecidas pela API da Amazon ou são fotos de divulgação das marcas, servindo para ilustrar o
                review.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">5. Responsabilidade sobre Entrega e Suporte</h2>
            <p>
              Como o processo de compra é realizado inteiramente dentro do ambiente seguro da Amazon, o Lindisse não
              tem acesso aos seus dados de pagamento, endereço ou detalhes do pedido.
            </p>
            <p>Qualquer questão relacionada a:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Entrega e Logística;</li>
              <li>Trocas e Devoluções;</li>
              <li>Garantia de produtos;</li>
              <li>Cobranças;</li>
            </ul>
            <p>
              Deve ser tratada diretamente com o suporte ao cliente da Amazon.com.br ou com o vendedor parceiro
              indicado na página do produto.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">6. Cookies de Rastreamento</h2>
            <p>
              Ao clicar em um de nossos links de afiliado, a Amazon insere um arquivo simples (cookie) no seu
              navegador, que permanece ativo por normalmente 24 horas. Esse cookie serve apenas para informar a Amazon
              que aquele visitante veio do Lindisse, para que a comissão seja atribuída corretamente. Esse processo é
              seguro, anônimo e não coleta dados pessoais seus.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">7. Dúvidas?</h2>
            <p>
              Se você tiver qualquer dúvida sobre nossa política de monetização ou quiser saber mais sobre como
              testamos os produtos, sinta-se à vontade para entrar em contato conosco pelo e-mail:{" "}
              <a className="text-(--brand-hot) underline" href="mailto:contato@lindisse.com.br" rel="noreferrer">
                contato@lindisse.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
