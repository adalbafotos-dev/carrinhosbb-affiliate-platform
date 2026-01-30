"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { ExternalLink, Link2, Shield, MapPinned, AlertCircle, ChevronDown, ChevronUp, Maximize2, Minimize2, Edit } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";

export function LinkHygienePanel() {
    const { links, editor, docText } = useEditorContext();
    const [isMapExpanded, setIsMapExpanded] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(true);
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);
    const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
    const linkRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const lastScrolledLinkRef = useRef<string | null>(null);
    const shouldIgnoreNextScrollRef = useRef(false);
    const savedScrollPositionRef = useRef<number>(0);
    const savedListScrollPositionRef = useRef<number>(0);
    const listScrollRef = useRef<HTMLDivElement | null>(null);

    // Estado para rastrear qual link está selecionado (atualizado pelo useEffect)
    const [currentSelectedLink, setCurrentSelectedLink] = useState<any>(null);

    const parseRelTokens = (rel?: string | null) =>
        (rel ?? "")
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean);

    const serializeRelTokens = (tokens: string[]) => (tokens.length ? tokens.join(" ") : null);

    const updateLink = (from: number, to: number, newAttrs: Record<string, any>) => {
        if (!editor) return;

        // Salva posição de scroll do container pai ANTES do update
        const scrollContainer = document.getElementById("intelligence-scroll-container");
        savedScrollPositionRef.current = scrollContainer?.scrollTop || 0;
        savedListScrollPositionRef.current = listScrollRef.current?.scrollTop || 0;

        // console.log('Saving scroll position:', savedScrollTop);

        // Flag para ignorar próximo scroll
        shouldIgnoreNextScrollRef.current = true;

        // 1. Seleciona o link alvo
        editor.chain().setTextSelection({ from, to }).run();

        // 2. Obtém os atributos atuais do link selecionado para garantir merge correto
        const currentAttrs = editor.getAttributes("link");

        // 3. Mescla com os novos atributos e garante que href exista
        const href = currentAttrs.href as string || ""; // Garante string
        const finalAttrs = { ...currentAttrs, ...newAttrs, href }; // href explícito para satisfazer tipagem

        // 4. Aplica a atualização mantendo o foco
        editor.chain().focus().extendMarkRange("link").setLink(finalAttrs).run();

        // reset handled after links refresh
    };

    // Função para restaurar scroll
    const restoreScroll = () => {
        const container = document.getElementById("intelligence-scroll-container");
        if (container) container.scrollTop = savedScrollPositionRef.current;
        if (listScrollRef.current) listScrollRef.current.scrollTop = savedListScrollPositionRef.current;
    };

    const toggleAttribute = (link: any, attr: string, value: string | null) => {
        if (attr === "rel") {
            const currentRel = parseRelTokens(link.rel);
            const targetVal = value || "";
            let newRel = [];
            if (currentRel.includes(targetVal)) {
                newRel = currentRel.filter((r: string) => r !== targetVal);
            } else {
                newRel = [...currentRel, targetVal];
            }

            const updatedAttrs: Record<string, any> = { rel: serializeRelTokens(newRel) };
            updateLink(link.from, link.to, updatedAttrs);
        }
        else if (attr === "target") {
            const newValue = link.target === "_blank" ? null : "_blank";
            const currentRel = parseRelTokens(link.rel);
            const cleanedRel = currentRel.filter((r: string) => r !== "noopener" && r !== "noreferrer");
            const nextRel = newValue ? [...cleanedRel, "noopener", "noreferrer"] : cleanedRel;
            updateLink(link.from, link.to, { target: newValue, rel: serializeRelTokens(nextRel) });
        }
        else if (attr === "data-entity-type") {
            // Para about e mention - cada um é independente agora
            const currentRel = parseRelTokens(link.rel);
            const targetValue = value || "";

            const hasAbout = currentRel.includes("about");
            const hasMention = currentRel.includes("mention");

            let nextHasAbout = hasAbout;
            let nextHasMention = hasMention;

            if (targetValue === "about") {
                nextHasAbout = !hasAbout;
            } else if (targetValue === "mention") {
                nextHasMention = !hasMention;
            }

            const baseRel = currentRel.filter((r: string) => r !== "about" && r !== "mention");
            if (nextHasAbout) baseRel.push("about");
            if (nextHasMention) baseRel.push("mention");

            let nextEntity: "about" | "mention" | null = null;
            if (nextHasAbout && !nextHasMention) {
                nextEntity = "about";
            } else if (nextHasMention && !nextHasAbout) {
                nextEntity = "mention";
            } else if (nextHasAbout && nextHasMention) {
                nextEntity = targetValue === "mention" ? "mention" : "about";
            }

            updateLink(link.from, link.to, {
                rel: serializeRelTokens(baseRel),
                "data-entity": nextEntity,
                "data-entity-type": nextEntity,
                "data-link-type": nextEntity,
            });
        }
    };

    const jumpToLink = (from: number, to: number, linkId: string) => {
        if (!editor) return;

        // Marca como último link com scroll
        lastScrolledLinkRef.current = linkId;

        // Seleciona TODO o link (from até to) para aparecer azul
        editor.chain().focus().setTextSelection({ from, to }).run();

        // Scroll into view - centralizado (apenas uma vez por link)
        setTimeout(() => {
            const { node } = editor.view.domAtPos(from);
            if (node) {
                (node as HTMLElement).scrollIntoView?.({ behavior: "smooth", block: "center" });
            }
        }, 50);
    };

    // Sincroniza o link selecionado:
    // 1. Quando a lista de links muda (atualização de atributos, texto, etc)
    // 2. Quando a seleção do usuário muda (clique, setas, etc)

    // Função pura para buscar o link na lista atual baseada na seleção atual
    const findCurrentLink = () => {
        if (!editor) return null;
        const { from, to } = editor.state.selection;
        return links.find(link => from >= link.from && to <= link.to) || null;
    };

    // Efeito para quando a prop 'links' muda (ex: atributo alterado)
    useEffect(() => {
        const link = findCurrentLink();
        setCurrentSelectedLink(link);

        // Ignora scroll se estiver atualizando atributos
        if (shouldIgnoreNextScrollRef.current) {
            requestAnimationFrame(() => restoreScroll());
            return;
        }

        // Só faz scroll se for um link DIFERENTE do último
        if (link?.id && link.id !== lastScrolledLinkRef.current) {
            lastScrolledLinkRef.current = link.id;

            // Scroll suave do painel para o link selecionado
            setTimeout(() => {
                const linkElement = linkRefs.current.get(link.id);
                if (linkElement) {
                    linkElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        }
    }, [links, editor]);

    useEffect(() => {
        if (!shouldIgnoreNextScrollRef.current) return;
        const handle = requestAnimationFrame(() => {
            restoreScroll();
            shouldIgnoreNextScrollRef.current = false;
        });
        return () => cancelAnimationFrame(handle);
    }, [links]);

    // Efeito para quando a seleção muda (ex: mover cursor)
    useEffect(() => {
        if (!editor) return;

        const handleSelectionUpdate = () => {
            const link = findCurrentLink();
            // Só atualiza se realmente mudou o link (ou se ficou null)
            // Para evitar re-renders desnecessários, mas garantindo que pegue mudanças de POSIÇÃO
            // Comparar IDs é bom.
            setCurrentSelectedLink(prev => {
                if (prev?.id === link?.id) return prev; // Mantém o objeto anterior se for o mesmo link (evita flicker?)
                // Mas espere! Se os atributos mudaram, o ID (que contem o href) pode ter mudado, ou não.
                // Se o ID for baseado em posição+href, e só o target mudou, o ID é o mesmo.
                // Se retornarmos 'prev', perdemos a atualização dos atributos novos que estão em 'link'.
                // REVERTER: Sempre atualizar se o ID for o mesmo mas o conteúdo for diferente?
                // Simplesmente setar o novo 'link' que vem da prop atualizada é o mais seguro.
                return link;
            });

            // Ignora scroll se estiver atualizando atributos
            if (shouldIgnoreNextScrollRef.current) {
                return;
            }

            // Só faz scroll se for um link DIFERENTE do último
            if (link?.id && link.id !== lastScrolledLinkRef.current) {
                lastScrolledLinkRef.current = link.id;

                // Scroll suave do painel para o link selecionado
                setTimeout(() => {
                    const linkElement = linkRefs.current.get(link.id);
                    if (linkElement) {
                        linkElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 100);
            }
        };

        // Roda imediatamente sempre que 'links' mudar
        handleSelectionUpdate();

        // Roda quando a seleção ou qualquer transação ocorrer (mudança de atributos)
        editor.on("selectionUpdate", handleSelectionUpdate);
        editor.on("transaction", handleSelectionUpdate);

        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
            editor.off("transaction", handleSelectionUpdate);
        };
    }, [editor, links]); // Depende de links para buscar corretamente dentro do callback

    // Link Metrics
    const metrics = useMemo(() => {
        const total = links.length;
        const internal = links.filter(l => ["internal", "mention", "about"].includes(l.type));
        const external = links.filter(l => l.type === "external" || l.type === "affiliate");
        const amazon = external.filter(l => l.href.includes("amazon") || l.href.includes("amzn"));
        const amazonWithoutSponsored = amazon.filter(l => !(l.rel || "").includes("sponsored"));
        const withBlank = links.filter(l => l.target === "_blank");
        const withNofollow = links.filter(l => (l.rel || "").includes("nofollow"));
        const withSponsored = links.filter(l => (l.rel || "").includes("sponsored"));

        // Position distribution (based on character position in text)
        const textLength = docText.length;
        const first20Percent = links.filter(l => l.from < textLength * 0.2);
        const middle60Percent = links.filter(l => l.from >= textLength * 0.2 && l.from < textLength * 0.8);
        const last20Percent = links.filter(l => l.from >= textLength * 0.8);

        // Anchor text analysis
        const anchorTexts = links.map(l => l.text.toLowerCase().trim());
        const uniqueAnchors = new Set(anchorTexts);
        const repeatedAnchors = anchorTexts.filter((text, index) =>
            anchorTexts.indexOf(text) !== index && text.length > 0
        );

        return {
            total,
            internal: internal.length,
            external: external.length,
            amazon: amazon.length,
            amazonWithoutSponsored: amazonWithoutSponsored.length,
            withBlank: withBlank.length,
            withNofollow: withNofollow.length,
            withSponsored: withSponsored.length,
            first20Percent: first20Percent.length,
            middle60Percent: middle60Percent.length,
            last20Percent: last20Percent.length,
            uniqueAnchors: uniqueAnchors.size,
            repeatedAnchors: repeatedAnchors.length
        };
    }, [links, docText]);

    const getLinkPosition = (from: number) => {
        const textLength = docText.length;
        const percent = (from / textLength) * 100;
        if (percent < 20) return { label: "Início", color: "bg-green-500" };
        if (percent < 80) return { label: "Meio", color: "bg-blue-500" };
        return { label: "Fim", color: "bg-purple-500" };
    };

    const LinkRow = ({ link }: { link: any }) => {
        const isExternal = link.type === "external" || link.type === "affiliate";
        const isAmazon = link.href.includes("amazon") || link.href.includes("amzn");
        const isAffiliate = link.type === "affiliate";
        const hasIssue = isAmazon && !(link.rel || "").includes("sponsored");
        const position = getLinkPosition(link.from);

        // Verifica se este link está selecionado
        const isSelected = currentSelectedLink?.id === link.id;

        return (
            <div
                ref={(el) => {
                    if (el) linkRefs.current.set(link.id, el);
                    else linkRefs.current.delete(link.id);
                }}
                className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${isSelected
                    ? "border-blue-500 shadow-lg ring-2 ring-blue-400 bg-(--surface)"
                    : hasIssue
                        ? "border-orange-500 shadow-md ring-1 ring-orange-400 bg-(--surface)"
                        : "border-(--border) bg-(--surface) hover:shadow-lg"
                    }`}
                onClick={() => jumpToLink(link.from, link.to, link.id)}
                title="Clique para ir até o link no editor"
            >
                <div className="flex items-start justify-between gap-2 overflow-hidden">
                    <div className="flex flex-col overflow-hidden flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold truncate text-(--text)" title={link.text}>
                                {link.text || "Link sem texto"}
                            </span>
                            {hasIssue && <AlertCircle size={16} className="text-red-600 shrink-0" />}
                        </div>
                        <span className="text-xs text-(--muted-2) truncate" title={link.href}>{link.href}</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                        {/* Position Indicator */}
                        <div className={`w-2 h-8 rounded-full ${position.color}`} title={`Posição: ${position.label}`} />

                        {/* Type Badge */}
                        {isAffiliate && <span className="text-xs px-2 py-1 rounded-md bg-purple-600 text-white font-bold uppercase">Affiliate</span>}
                        {isAmazon && <span className="text-xs px-2 py-1 rounded-md bg-orange-600 text-white font-bold uppercase">AMZ</span>}
                        {link.type === "external" && !isAmazon && <span className="text-xs px-2 py-1 rounded-md bg-gray-700 text-white font-bold uppercase dark:bg-gray-600">Ext</span>}
                        {link.type === "internal" && <span className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white font-bold uppercase">Int</span>}
                        {isExternal && <ExternalLink size={14} className="text-(--muted-2) shrink-0" />}
                        {!isExternal && <Link2 size={14} className="text-(--muted-2) shrink-0" />}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-(--border)">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleAttribute(link, "target", "_blank"); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm hover:shadow-md ${link.target === "_blank"
                            ? "bg-emerald-600 text-white border-2 border-emerald-700"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600"
                            }`}
                    >
                        _blank
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleAttribute(link, "rel", "nofollow"); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm hover:shadow-md ${(link.rel || "").includes("nofollow")
                            ? "bg-emerald-600 text-white border-2 border-emerald-700"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600"
                            }`}
                    >
                        nofollow
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleAttribute(link, "rel", "sponsored"); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm hover:shadow-md ${(link.rel || "").includes("sponsored")
                            ? "bg-orange-500 text-white border-2 border-orange-600"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600"
                            }`}
                    >
                        sponsored
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAttribute(link, "data-entity-type", "about"); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm hover:shadow-md ${(link.rel || "").includes("about")
                            ? "bg-purple-600 text-white border-2 border-purple-700"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600"
                            }`}
                    >
                        about
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAttribute(link, "data-entity-type", "mention"); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm hover:shadow-md ${(link.rel || "").includes("mention")
                            ? "bg-indigo-600 text-white border-2 border-indigo-700"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600"
                            }`}
                    >
                        mention
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section className={`space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3 transition-all ${isPanelExpanded ? "col-span-2" : ""}`}>
            <div className="flex items-center justify-between text-sm font-semibold uppercase text-(--text)">
                <span className="flex items-center gap-2">
                    <Shield size={16} />
                    Hygiene & Mapa
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {links.length} LINKS
                    </span>
                    <button
                        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                        className="p-1 rounded hover:bg-(--surface) transition-colors"
                        title={isPanelExpanded ? "Minimizar" : "Expandir"}
                    >
                        {isPanelExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* LINK MAP */}
            <div className="rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-3">
                <button
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="w-full flex items-center justify-between text-sm font-bold text-blue-900 dark:text-blue-100 mb-2"
                >
                    <span className="flex items-center gap-2">
                        <MapPinned size={16} />
                        Mapa de Links
                    </span>
                    {isMapExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isMapExpanded && (
                    <div className="space-y-3">
                        {/* Metrics Grid */}
                        <div className={`grid ${isPanelExpanded ? "grid-cols-4" : "grid-cols-2"} gap-3`}>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-300 dark:border-blue-700">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Total:</div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics.total}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-300 dark:border-blue-700">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Únicos (âncora):</div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics.uniqueAnchors}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-300 dark:border-green-700">
                                <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Internos:</div>
                                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                    {metrics.internal} <span className="text-sm">({metrics.total > 0 ? Math.round((metrics.internal / metrics.total) * 100) : 0}%)</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-300 dark:border-purple-700">
                                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Externos:</div>
                                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                    {metrics.external} <span className="text-sm">({metrics.total > 0 ? Math.round((metrics.external / metrics.total) * 100) : 0}%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Amazon & Attributes */}
                        <div className={`grid ${isPanelExpanded ? "grid-cols-4" : "grid-cols-2"} gap-3`}>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-orange-300 dark:border-orange-700">
                                <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">Amazon:</div>
                                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{metrics.amazon}</div>
                            </div>
                            <div className={`bg-white dark:bg-gray-900 rounded-lg p-3 border-2 ${metrics.amazonWithoutSponsored > 0 ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}>
                                <div className={`text-xs font-semibold mb-1 ${metrics.amazonWithoutSponsored > 0 ? "text-red-700 dark:text-red-300" : "text-gray-700 dark:text-gray-300"}`}>
                                    AMZ sem sponsored:
                                </div>
                                <div className={`text-2xl font-bold ${metrics.amazonWithoutSponsored > 0 ? "text-red-900 dark:text-red-100" : "text-gray-900 dark:text-gray-100"}`}>
                                    {metrics.amazonWithoutSponsored}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-300 dark:border-blue-700">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">_blank:</div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics.withBlank}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-300 dark:border-amber-700">
                                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">nofollow:</div>
                                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{metrics.withNofollow}</div>
                            </div>
                        </div>

                        {/* Distribution */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-blue-900 dark:text-blue-100">Distribuição:</div>
                            <div className="flex gap-1 h-8">
                                <div className="bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs" style={{ width: "20%" }}>
                                    Início ({metrics.first20Percent})
                                </div>
                                <div className="bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs" style={{ width: "60%" }}>
                                    Meio ({metrics.middle60Percent})
                                </div>
                                <div className="bg-purple-500 rounded flex items-center justify-center text-white font-bold text-xs" style={{ width: "20%" }}>
                                    Fim ({metrics.last20Percent})
                                </div>
                            </div>
                        </div>

                        {/* Warnings */}
                        {metrics.repeatedAnchors > 0 && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-700">
                                <AlertCircle size={18} className="text-amber-700 dark:text-amber-300 shrink-0" />
                                <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                    {metrics.repeatedAnchors} âncoras repetidas (varie o texto)
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* LINKS LIST */}
            <div>
                <button
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-(--text) mb-2"
                >
                    <span>Links ({links.length})</span>
                    {isListExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isListExpanded && (
                    <div ref={listScrollRef} className="space-y-2 max-h-[600px] overflow-y-auto">
                        {links.length === 0 && (
                            <p className="text-sm text-(--muted-2) text-center py-4">Nenhum link no documento.</p>
                        )}
                        {links.map((link) => (
                            <LinkRow key={link.id} link={link} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
