"use client";

import Image from "@tiptap/extension-image";

export const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-uploading": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-uploading"),
        renderHTML: (attributes) =>
          attributes["data-uploading"] ? { "data-uploading": attributes["data-uploading"] } : {},
      },
      "data-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) =>
          attributes["data-id"] ? { "data-id": attributes["data-id"] } : {},
      },
      "data-align": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-align"),
        renderHTML: (attributes) =>
          attributes["data-align"] ? { "data-align": attributes["data-align"] } : {},
      },
    };
  },
});
