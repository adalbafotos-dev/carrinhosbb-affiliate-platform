export const revalidate = 86400;

export default function ContatoPage() {
  return (
    <div className="space-y-6 page-in">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">Lindisse</p>
        <h1 className="mt-2 text-3xl font-semibold">Contato</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--muted)">
          Fale com a equipe para parcerias, duvidas sobre reviews ou sugestoes de novos conteudos.
        </p>
      </header>

      <section className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted)">
        <p>
          Email:{" "}
          <a className="font-semibold text-(--brand-hot) underline" href="mailto:contato@lindisse.com.br">
            contato@lindisse.com.br
          </a>
        </p>
        <p className="mt-3">Horario de resposta: segunda a sexta, das 9h as 18h (BRT).</p>
      </section>
    </div>
  );
}
