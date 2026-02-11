import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Saiba como o Lindisse coleta, usa e protege dados pessoais, em conformidade com a LGPD e com transparência sobre afiliados.",
};

const LAST_UPDATED_ISO = "2026-02-10";
const LAST_UPDATED_LABEL = "10 de fevereiro de 2026";

export default function PoliticaPrivacidadePage() {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Bem-vindo(a) ao Lindisse.com.br. No Lindisse, a sua privacidade é levada tão a sério quanto a qualidade
          técnica do nosso conteúdo. Esta Política de Privacidade descreve de forma transparente como coletamos,
          usamos, armazenamos e protegemos suas informações pessoais ao acessar nosso portal, em conformidade com a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD) e com as políticas dos nossos parceiros
          comerciais. Ao utilizar o Lindisse, você concorda com as práticas descritas neste documento.
        </p>
      </header>

      <div className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted)">
        <div className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">1. Quem Somos (Controlador de Dados)</h2>
            <p>
              O Lindisse é um portal de conteúdo especializado em reviews técnicos e educacionais para Nail Designers
              e entusiastas do mercado de unhas.
            </p>
            <p className="font-medium text-(--ink)">Dados de contato:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                E-mail para privacidade:{" "}
                <a className="text-(--brand-hot) underline" href="mailto:contato@lindisse.com.br" rel="noreferrer">
                  contato@lindisse.com.br
                </a>
              </li>
              <li>
                Website:{" "}
                <a className="text-(--brand-hot) underline" href="https://lindisse.com.br" rel="noreferrer">
                  https://lindisse.com.br
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">2. Quais Dados Coletamos e Por Quê</h2>
            <p>
              Coletamos o mínimo necessário de dados para oferecer uma experiência segura e personalizada. Os dados
              são coletados de três formas:
            </p>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-(--ink)">2.1. Dados fornecidos por você</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Comentários: quando você deixa um comentário em nossos artigos, coletamos os dados mostrados no
                  formulário (como nome e e-mail), além do endereço de IP e dados do navegador para auxiliar na
                  detecção de spam.
                </li>
                <li>
                  Contato: se você entrar em contato conosco via e-mail, utilizaremos seu endereço de e-mail apenas
                  para responder à sua solicitação.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-(--ink)">2.2. Dados coletados automaticamente (Cookies)</h3>
              <p>Utilizamos cookies e tecnologias semelhantes para melhorar a sua navegação e analisar o tráfego do site.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Cookies de Análise: utilizamos ferramentas como o Google Analytics para entender como os visitantes
                  usam o site (quais páginas são mais visitadas, tempo de permanência etc.). Esses dados são
                  anonimizados.
                </li>
                <li>Cookies de Afiliados: para rastrear as vendas qualificadas provenientes dos nossos links.</li>
              </ul>
            </section>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">3. Divulgação de Links de Afiliado (Amazon e Parceiros)</h2>
            <p>A transparência é um pilar do Lindisse.</p>
            <p>
              O Lindisse.com.br participa do Programa de Associados da Amazon, um serviço de intermediação de anúncios
              destinado a oferecer uma maneira para que sites ganhem taxas de publicidade ao anunciar e linkar para a
              Amazon.com.br.
            </p>
            <p>
              Como funciona: quando você clica em um link de produto em nosso site que direciona para a Amazon, um
              cookie especial é ativado no seu navegador. Esse cookie não captura seus dados pessoais (nome, endereço),
              mas permite que a Amazon saiba que você chegou lá através do nosso site. Se você realizar uma compra, nós
              recebemos uma pequena comissão.
            </p>
            <p>Seu custo: isso não altera em nada o preço do produto para você.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">4. Com Quem Compartilhamos seus Dados</h2>
            <p>
              Nós não vendemos seus dados pessoais. O compartilhamento ocorre apenas com fornecedores de serviços
              essenciais para o funcionamento do site, como:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provedor de Hospedagem: para manter o site no ar.</li>
              <li>Serviços de Análise (Google Analytics): para monitoramento de tráfego (dados anônimos).</li>
              <li>Plataformas de Afiliados (Amazon): apenas dados de rastreamento de cliques para atribuição de vendas.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">5. Segurança dos Dados</h2>
            <p>Adotamos medidas técnicas e administrativas aptas a proteger os seus dados pessoais de acessos não autorizados.</p>
            <p>
              Certificado SSL: todo o tráfego entre o seu navegador e os servidores do Lindisse é criptografado através
              do protocolo HTTPS, garantindo que seus dados não sejam interceptados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">6. Conteúdo Incorporado de Outros Sites</h2>
            <p>
              Artigos neste site podem incluir conteúdo incorporado (por exemplo: vídeos do YouTube, imagens do
              Instagram etc.). O conteúdo incorporado de outros sites comporta-se exatamente da mesma maneira como se o
              visitante tivesse visitado o outro site.
            </p>
            <p>
              Estes sites podem coletar dados sobre você, usar cookies, incorporar rastreamento adicional de terceiros
              e monitorar sua interação com esse conteúdo incorporado, incluindo o rastreamento de sua interação com o
              conteúdo incorporado se você tem uma conta e está logado naquele site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">7. Seus Direitos (LGPD)</h2>
            <p>De acordo com a LGPD, você tem total controle sobre seus dados. Você tem o direito de:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Solicitar acesso aos dados que possuímos.</li>
              <li>Solicitar a correção de dados incompletos ou desatualizados.</li>
              <li>
                Solicitar a exclusão dos seus dados pessoais dos nossos registros (exceto quando a manutenção for
                necessária para cumprimento de obrigação legal).
              </li>
            </ul>
            <p>
              Para exercer qualquer um desses direitos, envie um e-mail para{" "}
              <a className="text-(--brand-hot) underline" href="mailto:contato@lindisse.com.br" rel="noreferrer">
                contato@lindisse.com.br
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">8. Alterações nesta Política</h2>
            <p>
              Podemos atualizar nossa Política de Privacidade periodicamente para refletir mudanças em nossas práticas,
              tecnologias ou exigências legais. Recomendamos que você revise esta página regularmente. A data da
              &quot;Última atualização&quot; estará sempre visível no topo do documento.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
