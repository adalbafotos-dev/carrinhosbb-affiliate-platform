export const revalidate = 86400;

export default function SobrePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold">Sobre</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--muted)">
          Este projeto existe para simplificar decisões sobre unhas e manicure: o que comprar, o que evitar e como escolher com segurança.
        </p>
      </header>

      <div className="rounded-3xl border border-(--border) bg-(--paper) p-8 text-sm text-(--muted) space-y-3">
        <p>
          O conteúdo é construído em formato de guias e reviews, com estrutura em silos para facilitar a navegação e a linkagem interna.
        </p>
        <p>
          Se você chegou aqui por vídeos ou pins, seja bem-vinda: a ideia é aprofundar o assunto com textos claros e úteis.
        </p>
      </div>
    </div>
  );
}

