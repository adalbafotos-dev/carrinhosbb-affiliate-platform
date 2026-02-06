import Link from "next/link";
import { createSiloAction } from "@/app/admin/silos/actions";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function NewSiloPage() {
    await requireAdminSession();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-(--text)">Novo Silo</h1>
                    <p className="text-sm text-(--muted-2)">Crie um novo pilar de conteúdo.</p>
                </div>
                <Link
                    href="/admin/silos"
                    className="rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm font-semibold text-(--muted) hover:bg-(--surface-muted)"
                >
                    Voltar
                </Link>
            </div>

            <form action={createSiloAction} className="space-y-5 rounded-xl border border-(--border) bg-(--surface) p-6 max-w-2xl">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome">
                        <input
                            name="name"
                            required
                            className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none bg-(--bg) text-(--text)"
                            placeholder="Ex: Unhas de Gel"
                        />
                    </Field>
                    <Field label="Slug">
                        <input
                            name="slug"
                            required
                            className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none bg-(--bg) text-(--text)"
                            placeholder="Ex: unhas-de-gel"
                        />
                    </Field>
                </div>

                <Field label="Descrição">
                    <textarea
                        name="description"
                        rows={3}
                        className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none bg-(--bg) text-(--text)"
                        placeholder="Breve descrição sobre este pilar..."
                    />
                </Field>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        className="rounded-md bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper) hover:bg-(--brand-accent)"
                    >
                        Criar silo
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1 text-sm">
            <span className="text-[11px] font-semibold uppercase text-(--muted-2)">{label}</span>
            {children}
        </label>
    );
}
