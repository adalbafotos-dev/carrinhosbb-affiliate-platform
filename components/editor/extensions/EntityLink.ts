import Link from "@tiptap/extension-link";

export const EntityLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-link-type": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-type"),
        renderHTML: (attributes) => {
          if (!attributes["data-link-type"]) {
            return {};
          }
          return { "data-link-type": attributes["data-link-type"] };
        },
      },
      "data-post-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-post-id"),
        renderHTML: (attributes) => {
          if (!attributes["data-post-id"]) {
            return {};
          }
          return { "data-post-id": attributes["data-post-id"] };
        },
      },
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
      "data-entity": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity"),
        renderHTML: (attributes) => {
          if (!attributes["data-entity"]) {
            return {};
          }
          return { "data-entity": attributes["data-entity"] };
        },
      },
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute("target"),
        renderHTML: (attributes) => {
          if (!attributes.target) {
            return {};
          }
          return { target: attributes.target };
        },
      },
      rel: {
        default: null,
        parseHTML: (element) => element.getAttribute("rel"),
        renderHTML: (attributes) => {
          if (!attributes.rel) {
            return {};
          }
          return { rel: attributes.rel };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
    };
  },
});
