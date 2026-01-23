"use client";

import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";
import type { EditorMeta, ImageAsset, LinkItem, OutlineItem } from "@/components/editor/types";
import type { Silo } from "@/lib/types";

export type EditorContextValue = {
  editor: Editor | null;
  meta: EditorMeta;
  setMeta: (patch: Partial<EditorMeta>) => void;
  outline: OutlineItem[];
  links: LinkItem[];
  docText: string;
  docHtml: string;
  silos: Silo[];
  slugStatus: "idle" | "checking" | "ok" | "taken";
  saving: boolean;
  previewMode: "desktop" | "mobile";
  setPreviewMode: (mode: "desktop" | "mobile") => void;
  onHeroUpload: (file: File) => void;
  onOpenHeroPicker: () => void;
  onOpenMedia: () => void;
  onOpenLinkDialog: () => void;
  onInsertProduct: () => void;
  onInsertYoutube: () => void;
  onInsertTable: () => void;
  onInsertSection: () => void;
  onInsertFaq: () => void;
  onInsertHowTo: () => void;
  onInsertCtaBest: () => void;
  onInsertCtaValue: () => void;
  onInsertCtaTable: () => void;
  onAlignImage: (align: "left" | "center" | "right") => void;
  onSelectLink: (link: LinkItem) => void;
  onInsertImage: (asset: ImageAsset) => void;
  onUpdateImageAlt: (url: string, alt: string) => void;
  onRemoveImage: (url: string) => void;
  onJumpToHeading: (pos: number) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ value, children }: { value: EditorContextValue; children: React.ReactNode }) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within EditorProvider");
  }
  return ctx;
}
