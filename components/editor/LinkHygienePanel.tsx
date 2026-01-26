"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { ExternalLink, Link2, Shield } from "lucide-react";

export function LinkHygienePanel() {
    const { links, editor } = useEditorContext();

    const updateLink = (from: number, to: number, attrs: Record<string, any>) => {
        if (!editor) return;
        // We select the range and update the link mark
        // To minimize disruption, we could try to restore selection, but clicking the sidebar usually steals focus anyway.
        editor.chain().focus().setTextSelection({ from, to }).updateAttributes("link", attrs).run();
    };

    const toggleAttribute = (link: any, attr: string, value: string | null) => {
        // Logic for rel (space separated)
        if (attr === "rel") {
            const currentRel = (link.rel || "").split(" ").filter(Boolean);
            const targetVal = value || "";
            let newRel = [];
            if (currentRel.includes(targetVal)) {
                newRel = currentRel.filter((r: string) => r !== targetVal);
            } else {
                newRel = [...currentRel, targetVal];
            }
            updateLink(link.from, link.to, { rel: newRel.join(" ") || null });
        }
        // Logic for target
        else if (attr === "target") {
            const newValue = link.target === "_blank" ? null : "_blank";
            updateLink(link.from, link.to, { target: newValue });
        }
        else {
            const currentType = link.dataEntityType;
            const isSame = currentType === value;
            updateLink(link.from, link.to, { "data-link-type": isSame ? null : value, "data-entity-type": isSame ? null : value });
        }
    };

    const externalLinks = links.filter((l) => l.type !== "internal" && l.type !== "mention" && l.type !== "about");
    const otherLinks = links.filter((l) => l.type === "internal" || l.type === "mention" || l.type === "about");

    const LinkRow = ({ link }: { link: any }) => {
        const isExternal = link.type === "external" || link.type === "affiliate";
        const isSponsored = (link.rel || "").includes("sponsored");
        const isNofollow = (link.rel || "").includes("nofollow");
        const isBlank = link.target === "_blank";
        const isAbout = link.type === "about";
        const isMention = link.type === "mention";
        const isAffiliate = link.type === "affiliate";

        return (
            <div className="rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-2 space-y-2">
                <div className="flex items-start justify-between gap-2 overflow-hidden">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[11px] font-medium truncate text-[color:var(--text)]" title={link.text}>{link.text || "Link sem texto"}</span>
                        <span className="text-[10px] text-[color:var(--muted-2)] truncate" title={link.href}>{link.href}</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                        {isAffiliate && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 font-bold uppercase dark:bg-purple-900/50 dark:text-purple-300">Affiliate</span>}
                        {link.type === "external" && <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-700 font-bold uppercase dark:bg-gray-800 dark:text-gray-300">Ext</span>}
                        {link.type === "internal" && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase dark:bg-blue-900/50 dark:text-blue-300">Int</span>}
                        {isExternal && <ExternalLink size={12} className="text-[color:var(--muted-2)] shrink-0" />}
                        {!isExternal && <Link2 size={12} className="text-[color:var(--muted-2)] shrink-0" />}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[color:var(--border)]">
                    <button
                        onClick={() => toggleAttribute(link, "target", "_blank")}
                        className={`px-1.5 py-0.5 text-[9px] rounded border ${isBlank ? "bg-blue-100 text-blue-900 border-blue-300 font-semibold dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700" : "text-[color:var(--muted)] border-transparent hover:bg-[color:var(--surface-muted)]"}`}
                    >
                        _blank
                    </button>
                    <button
                        onClick={() => toggleAttribute(link, "rel", "nofollow")}
                        className={`px-1.5 py-0.5 text-[9px] rounded border ${isNofollow ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700" : "text-[color:var(--muted)] border-transparent hover:bg-[color:var(--surface-muted)]"}`}
                    >
                        nofollow
                    </button>
                    <button
                        onClick={() => toggleAttribute(link, "rel", "sponsored")}
                        className={`px-1.5 py-0.5 text-[9px] rounded border ${isSponsored ? "bg-purple-100 text-purple-900 border-purple-300 font-semibold dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-700" : "text-[color:var(--muted)] border-transparent hover:bg-[color:var(--surface-muted)]"}`}
                    >
                        sponsored
                    </button>
                    <button
                        onClick={() => toggleAttribute(link, "data-link-type", "about")}
                        className={`px-1.5 py-0.5 text-[9px] rounded border ${isAbout ? "bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-700" : "text-[color:var(--muted)] border-transparent hover:bg-[color:var(--surface-muted)]"}`}
                    >
                        about
                    </button>
                    <button
                        onClick={() => toggleAttribute(link, "data-link-type", "mention")}
                        className={`px-1.5 py-0.5 text-[9px] rounded border ${isMention ? "bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-700" : "text-[color:var(--muted)] border-transparent hover:bg-[color:var(--surface-muted)]"}`}
                    >
                        mention
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-[color:var(--muted)]">
                <span className="inline-flex items-center gap-2">
                    <Shield size={14} /> Hygiene
                </span>
                <span className="text-[10px] text-[color:var(--muted-2)]">{links.length} links</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {links.map((link) => (
                    <LinkRow key={link.id} link={link} />
                ))}
                {links.length === 0 && <p className="text-[10px] text-[color:var(--muted-2)] text-center">Nenhum link detectado.</p>}
            </div>
        </section>
    );
}
