import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faq: {
      insertFaq: () => ReturnType;
    };
  }
}

/**
 * FAQ extension cho Tiptap
 *
 * HTML output:
 * <div class="faq-section" data-faq>
 *   <details class="faq-item">
 *     <summary class="faq-question">Câu hỏi?</summary>
 *     <div class="faq-answer">Câu trả lời...</div>
 *   </details>
 *   ...
 * </div>
 *
 * Frontend tự parse từ HTML này để generate FAQPage schema JSON-LD.
 */

// FAQ Item (single Q+A)
export const FAQItem = Node.create({
  name: 'faqItem',
  group: 'block',
  content: 'faqQuestion faqAnswer',
  defining: true,

  parseHTML() {
    return [{ tag: 'details.faq-item' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { class: 'faq-item', open: 'true' }), 0];
  },
});

export const FAQQuestion = Node.create({
  name: 'faqQuestion',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'summary.faq-question' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes, { class: 'faq-question' }), 0];
  },
});

export const FAQAnswer = Node.create({
  name: 'faqAnswer',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div.faq-answer' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'faq-answer' }), 0];
  },
});

// Wrapper section chứa tất cả FAQ items
export const FAQSection = Node.create({
  name: 'faqSection',
  group: 'block',
  content: 'faqItem+',
  defining: true,

  addAttributes() {
    return {
      'data-faq': {
        default: 'true',
        parseHTML: () => 'true',
        renderHTML: () => ({ 'data-faq': 'true' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.faq-section[data-faq]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'faq-section' }), 0];
  },

  addCommands() {
    return {
      insertFaq:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'faqSection',
            attrs: { 'data-faq': 'true' },
            content: [
              {
                type: 'faqItem',
                content: [
                  {
                    type: 'faqQuestion',
                    content: [{ type: 'text', text: 'Câu hỏi của bạn?' }],
                  },
                  {
                    type: 'faqAnswer',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Câu trả lời chi tiết...' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'faqItem',
                content: [
                  {
                    type: 'faqQuestion',
                    content: [{ type: 'text', text: 'Câu hỏi tiếp theo?' }],
                  },
                  {
                    type: 'faqAnswer',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Câu trả lời...' }],
                      },
                    ],
                  },
                ],
              },
            ],
          });
        },
    };
  },
});
