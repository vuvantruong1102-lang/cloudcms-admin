import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faq: {
      /** Tạo FAQ section mới với 1 câu hỏi rỗng */
      insertFaq: () => ReturnType;
      /** Thêm 1 câu hỏi vào FAQ section gần nhất (con trỏ đang ở trong) */
      addFaqItem: () => ReturnType;
      /** Xóa FAQ item đang chứa con trỏ */
      removeFaqItem: () => ReturnType;
      /** Xóa toàn bộ FAQ section đang chứa con trỏ */
      removeFaqSection: () => ReturnType;
    };
  }
}

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
    return ['details', mergeAttributes(HTMLAttributes, { class: 'faq-item' }), 0];
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
    const makeFaqItem = (q = 'Câu hỏi của bạn?', a = 'Câu trả lời chi tiết...') => ({
      type: 'faqItem',
      content: [
        {
          type: 'faqQuestion',
          content: [{ type: 'text', text: q }],
        },
        {
          type: 'faqAnswer',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: a }],
            },
          ],
        },
      ],
    });

    return {
      insertFaq:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'faqSection',
            attrs: { 'data-faq': 'true' },
            content: [makeFaqItem()],
          });
        },

      addFaqItem:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'faqSection') {
              const sectionStart = $from.before(depth);
              const sectionEnd = sectionStart + node.nodeSize;
              const insertPos = sectionEnd - 1;
              const itemNode = state.schema.nodeFromJSON(makeFaqItem());
              if (dispatch) {
                tr.insert(insertPos, itemNode);
                try {
                  const newPos = insertPos + 2;
                  tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
                } catch (e) { /* ignore */ }
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },

      removeFaqItem:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'faqItem') {
              const itemStart = $from.before(depth);
              const itemEnd = itemStart + node.nodeSize;

              const parentDepth = depth - 1;
              const parentNode = parentDepth >= 0 ? $from.node(parentDepth) : null;
              if (parentNode?.type.name === 'faqSection' && parentNode.childCount === 1) {
                const sectionStart = $from.before(parentDepth);
                const sectionEnd = sectionStart + parentNode.nodeSize;
                if (dispatch) {
                  tr.delete(sectionStart, sectionEnd);
                  dispatch(tr);
                }
                return true;
              }

              if (dispatch) {
                tr.delete(itemStart, itemEnd);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },

      removeFaqSection:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'faqSection') {
              const sectionStart = $from.before(depth);
              const sectionEnd = sectionStart + node.nodeSize;
              if (dispatch) {
                tr.delete(sectionStart, sectionEnd);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
