import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size (px). Pass `null` to unset.
       */
      setFontSize: (size: string | null) => ReturnType;
      /**
       * Unset font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * FontSize extension cho Tiptap
 * Thêm attribute `fontSize` vào TextStyle mark
 *
 * Usage:
 *   editor.chain().focus().setFontSize('20px').run();
 *   editor.chain().focus().unsetFontSize().run();
 *
 * Output HTML: <span style="font-size: 20px">text</span>
 */
export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const fs = element.style.fontSize;
              return fs || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});
