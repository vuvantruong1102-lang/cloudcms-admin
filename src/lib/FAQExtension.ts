import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faq: {
      insertFaq: () => ReturnType;
      addFaqItem: () => ReturnType;
      removeFaqItem: () => ReturnType;
      removeFaqSection: () => ReturnType;
      moveFaqSectionUp: () => ReturnType;
      moveFaqSectionDown: () => ReturnType;
    };
  }
}

// FAQ Item
export const FAQItem = Node.create({
  name: 'faqItem',
  group: 'block',
  content: 'faqQuestion faqAnswer',

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

  parseHTML() {
    return [{ tag: 'div.faq-answer' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'faq-answer' }), 0];
  },
});

export const FAQSection = Node.create({
  name: 'faqSection',
  group: 'block',
  content: 'faqItem+',
  draggable: true,

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
        { type: 'faqQuestion', content: [{ type: 'text', text: q }] },
        {
          type: 'faqAnswer',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: a }] }],
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
                  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 2)));
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

      moveFaqSectionUp:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'faqSection') {
              const sectionStart = $from.before(depth);
              const sectionEnd = sectionStart + node.nodeSize;

              if (sectionStart === 0) return false;
              const $before = state.doc.resolve(sectionStart);
              if ($before.depth === 0 && $before.index() === 0) return false;

              // Lấy node anh chị trước
              const parent = $before.parent;
              const indexInParent = $before.index();
              if (indexInParent === 0) return false;

              const prevNode = parent.child(indexInParent - 1);
              const prevStart = sectionStart - prevNode.nodeSize;

              const faqJson = node.toJSON();

              if (dispatch) {
                // Xóa FAQ trước, rồi insert vào trước prev
                tr.delete(sectionStart, sectionEnd);
                tr.insert(prevStart, state.schema.nodeFromJSON(faqJson));
                tr.setSelection(TextSelection.near(tr.doc.resolve(prevStart + 1)));
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },

      moveFaqSectionDown:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'faqSection') {
              const sectionStart = $from.before(depth);
              const sectionEnd = sectionStart + node.nodeSize;

              const $before = state.doc.resolve(sectionStart);
              const parent = $before.parent;
              const indexInParent = $before.index();
              if (indexInParent >= parent.childCount - 1) return false;

              const nextNode = parent.child(indexInParent + 1);
              const newInsertPos = sectionStart + nextNode.nodeSize;

              const faqJson = node.toJSON();

              if (dispatch) {
                tr.delete(sectionStart, sectionEnd);
                tr.insert(newInsertPos - node.nodeSize, state.schema.nodeFromJSON(faqJson));
                const finalPos = newInsertPos - node.nodeSize + 1;
                tr.setSelection(TextSelection.near(tr.doc.resolve(finalPos)));
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
