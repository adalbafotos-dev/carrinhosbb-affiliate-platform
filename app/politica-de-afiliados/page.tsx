export const revalidate = 86400;

export default function PoliticaAfiliadosPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold">Política de afiliados</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--muted)">
          Transparência total: alguns links neste site podem gerar comissão para o projeto.
        </p>
      </header>

      <div className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted) space-y-4">
        <p className="font-medium text-(--muted)">Aviso padrão</p>
        <p>
          Como Associado da Amazon, eu ganho com compras qualificadas. Isso não altera o seu preço.
        </p>

        <p className="font-medium text-(--ink)">Como marcamos links</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Links de afiliados são marcados com <code className="text-(--brand-accent)">rel="sponsored"</code>.</li>
          <li>Quando necessário, também usamos <code className="text-(--brand-accent)">nofollow</code> para deixar a intenção clara.</li>
          <li>Por padrão, links de compra abrem em nova aba.</li>
        </ul>

        <p className="font-medium text-(--muted)">Recomendação</p>
        <p>
          Antes de comprar, compare avaliações, garantias e compatibilidade com o seu uso (iniciante, profissional, salão).
        </p>
      </div>
    </div>
  );
}

