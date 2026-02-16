import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a equipe do Lindisse para parcerias, dúvidas e sugestões.",
  alternates: {
    canonical: "/contato",
  },
};

export default function ContatoPage() {
  return (
    <div className="space-y-6 page-in">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">Lindisse</p>
        <h1 className="mt-2 text-3xl font-semibold">Contato</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--muted)">
          Fale com a equipe para parcerias, dúvidas sobre reviews ou sugestões de novos conteúdos.
        </p>
      </header>

      <section className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted)">
        <p>
          Email:{" "}
          <a className="font-semibold text-(--brand-hot) underline" href="mailto:contato@lindisse.com.br">
            contato@lindisse.com.br
          </a>
        </p>
        <p className="mt-3">Horário de resposta: segunda a sexta, das 9h às 18h (BRT).</p>

        <div className="mt-5">
          <a
            href="https://api.whatsapp.com/send?phone=5511961714762"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-(--brand-hot) px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Falar no WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
