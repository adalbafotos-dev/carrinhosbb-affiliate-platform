import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política editorial",
  description:
    "Conheça os princípios, metodologia de reviews, transparência de afiliados e política de atualizações do Lindisse.",
};

const LAST_UPDATED_ISO = "2026-02-10";
const LAST_UPDATED_LABEL = "10 de fevereiro de 2026";

export default function PoliticaEditorialPage() {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Política Editorial</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          No Lindisse, entendemos que a confiança da nossa audiência é o nosso ativo mais valioso. Diferente de
          portais de beleza genéricos, nossa missão é profissionalizar o mercado de Nail Design no Brasil através da
          informação qualificada.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Esta Política Editorial foi estabelecida para garantir que todo o conteúdo publicado em nossas páginas —
          sejam reviews de cabines, guias de géis ou comparativos de motores — siga rigorosos padrões de integridade,
          precisão técnica e independência.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Ao ler o Lindisse, você deve saber exatamente como nossos conteúdos são criados, revisados e como monetizamos
          o nosso trabalho.
        </p>
      </header>

      <div className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted)">
        <div className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">1. Nossos Princípios Editoriais</h2>
            <p>Nossa produção de conteúdo é guiada por três pilares inegociáveis:</p>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-(--ink)">1.1. Independência e Imparcialidade</h3>
              <p>
                Nossas análises e recomendações de produtos são baseadas exclusivamente na avaliação técnica da nossa
                equipe e na análise de especificações reais. Não aceitamos pagamentos de marcas para alterar a opinião
                de um review.
              </p>
              <p>
                Se um produto tem baixa potência ou esquenta demais na unha da cliente, nós diremos. Se um kit é
                apenas "barato" mas não entrega resultado profissional, nós alertaremos.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-(--ink)">1.2. Foco na Biossegurança e Saúde</h3>
              <p>
                Não tratamos unhas apenas como estética. Nossos artigos priorizam a saúde da lâmina ungueal e a
                segurança do profissional.
              </p>
              <p>
                Evitamos recomendar produtos ou práticas que, embora populares ou "virais" nas redes sociais, possam
                causar danos a longo prazo, alergias ou riscos de contaminação cruzada.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-(--ink)">1.3. Clareza e Semântica Forte</h3>
              <p>
                Nosso compromisso é traduzir termos técnicos complexos (como polimerização, viscosidade e reação
                exotérmica) para uma linguagem clara e aplicável ao dia a dia de mesa.
              </p>
              <p>
                O conteúdo deve ser fácil de entender para a iniciante, mas tecnicamente denso para a profissional
                experiente.
              </p>
            </section>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">2. Como Criamos Nossos Reviews</h2>
            <p>
              Nossa metodologia de avaliação busca fugir do "achismo". Para recomendar um produto (seja uma lixa
              elétrica, um aspirador ou um preparador), analisamos:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-(--ink)">Especificações Técnicas:</span> voltagem, RPM, composição
                química, tipo de lâmpada (LED/UV), registro na ANVISA (quando aplicável).
              </li>
              <li>
                <span className="font-medium text-(--ink)">Custo-Benefício:</span> o produto entrega o que promete
                pelo preço cobrado?
              </li>
              <li>
                <span className="font-medium text-(--ink)">Durabilidade:</span> o equipamento aguenta o fluxo de um
                dia inteiro de atendimentos?
              </li>
              <li>
                <span className="font-medium text-(--ink)">Feedback Real:</span> cruzamos nossa análise com avaliações
                verificadas de compradores reais na Amazon e em fóruns especializados para identificar padrões de
                defeitos ou qualidades.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">3. Transparência e Monetização (Afiliados)</h2>
            <p>
              O Lindisse é um projeto sustentado majoritariamente através do marketing de afiliados, mantendo nossa
              independência editorial.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-(--ink)">Programa de Associados Amazon:</span> o Lindisse.com.br
                participa do Programa de Associados da Amazon. Isso significa que, ao clicar em links de produtos em
                nosso site e realizar uma compra, podemos receber uma pequena comissão.
              </li>
              <li>
                <span className="font-medium text-(--ink)">Sem Custo para Você:</span> essa comissão é paga pela
                Amazon, não altera em nenhum centavo o preço final do produto para você.
              </li>
              <li>
                <span className="font-medium text-(--ink)">Sem Influência na Nota:</span> a existência de uma parceria
                de afiliado nunca influencia a nota ou o veredito de um produto. Se um produto paga uma comissão alta
                mas é de baixa qualidade, ele não será recomendado.
              </li>
            </ul>
            <p>Nossa lealdade é com a Nail Designer, não com a marca.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">4. Publicidade e Conteúdo Patrocinado</h2>
            <p>
              Caso publiquemos algum conteúdo que foi pago diretamente por uma marca (o chamado "Publipost" ou
              "Artigo Patrocinado"), isso será explicitamente sinalizado no topo da página com termos como
              "Patrocinado por [Marca]" ou "Em parceria com [Marca]", seguindo as diretrizes do CONAR e as boas
              práticas de publicidade digital.
            </p>
            <p>No momento, focamos em conteúdo orgânico e reviews independentes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">5. Conteúdo Vivo: Atualizações e Correções</h2>
            <p>
              O mercado de unhas evolui rápido. Novos géis são lançados e máquinas antigas saem de linha. Adotamos a
              política de "Conteúdo Vivo":
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-(--ink)">Revisão Constante:</span> periodicamente, revisamos nossos
                guias principais para garantir que os produtos recomendados ainda estão disponíveis e que os preços
                mencionados condizem com a realidade do mercado.
              </li>
              <li>
                <span className="font-medium text-(--ink)">Correção de Erros:</span> se identificarmos (ou formos
                avisados de) qualquer erro factual em nossos textos, faremos a correção prontamente.
              </li>
            </ul>
            <p>
              Se você encontrar um link quebrado, um preço muito discrepante ou uma informação técnica que precisa de
              ajuste, entre em contato conosco.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">6. Isenção de Responsabilidade</h2>
            <p>
              O conteúdo do Lindisse tem caráter informativo, educacional e de orientação de compra. Embora focados em
              técnica e biossegurança, nossos artigos não substituem consultoria jurídica, treinamentos certificados
              por órgãos oficiais ou diagnósticos médicos relacionados a patologias das unhas.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
