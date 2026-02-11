import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Colaboradores",
  description: "Conheça os colaboradores do Lindisse e seus canais oficiais.",
};

type Collaborator = {
  name: string;
  role: string;
  handle: string;
  links: Array<{ label: string; href: string }>;
};

const collaborators: Collaborator[] = [
  {
    name: "Ana Linda Ferreira",
    role: "Manicure",
    handle: "@lindissestetic",
    links: [{ label: "Pinterest", href: "https://br.pinterest.com/lindissestetic/" }],
  },
  {
    name: "Adalba",
    role: "SEO - Dev",
    handle: "@adalbafilms",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/adalbafilms/" },
      { label: "Site", href: "https://adalbapro.com.br/" },
    ],
  },
];

export default function ColaboradoresPage() {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Colaboradores</h1>
      </header>

      <section className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <ul className="grid gap-5 md:grid-cols-2">
          {collaborators.map((collaborator) => (
            <li key={collaborator.name} className="space-y-2 rounded-2xl border border-(--border) bg-(--surface-muted) p-5">
              <h2 className="text-xl font-semibold text-(--ink)">{collaborator.name}</h2>
              <p className="text-sm text-(--muted)">
                {collaborator.role} · <span className="font-medium text-(--ink)">{collaborator.handle}</span>
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                {collaborator.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-(--brand-hot) underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
