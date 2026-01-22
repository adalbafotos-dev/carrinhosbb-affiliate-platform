import Link from "@tiptap/extension-link";

export const EntityLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-entity-type": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => {
          if (!attributes["data-entity-type"]) {
            return {};
          }
          return { "data-entity-type": attributes["data-entity-type"] };
        },
      },
    };
  },
});
