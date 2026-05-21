import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faqBlock: {
      /** Insert/update FAQ block với array data */
      setFaqBlock: (faqs: Array<{ question: string; answer: string }>) => ReturnType;
    };
  }
}

/**
 * FAQ Block - ATOMIC node
 *
 * Khác với version cũ (Section + Item + Question + Answer là 4 node lồng nhau):
 * - Đây là 1 node duy nhất, atomic: true
 * - Data lưu trong attribute `data-faqs` dạng JSON
 * - Render trong editor như 1 block tĩnh (preview)
 * - Edit thông qua modal (gọi setFaqBlock)
 *
 * Lợi ích:
 * - Copy/paste như block thường (image, video)
 * - Select bằng shift+click hoạt động bình thường
 * - Xóa bằng Delete/Backspace dễ dàng
 * - Drag-drop được
 *
 * HTML format (cả admin và frontend dùng chung):
 * <div class="faq-section" data-faq="true" data-faqs='[{"q":"...","a":"..."},...]'>
 *   <details class="faq-item">
 *     <summary class="faq-question">Q1</summary>
 *     <div class="faq-answer"><p>A1</p></div>
 *   </details>
 *   ...
 * </div>
 *
 * Cả data-faqs JSON và HTML rendered đều được lưu - JSON để edit nhanh,
 * HTML để frontend render mà không cần JS parse.
 */

export type FAQData = { question: string; answer: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render FAQ data thành HTML <details> blocks (cho frontend hiển thị) */
export function renderFaqsToHtml(faqs: FAQData[]): string {
  return faqs
    .map((f) => {
      const q = escapeHtml(f.question);
      const paragraphs = f.answer
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
      return `<details class="faq-item"><summary class="faq-question">${q}</summary><div class="faq-answer">${paragraphs}</div></details>`;
    })
    .join('');
}

/** Parse data-faqs attribute từ HTML element */
function parseFaqsFromElement(el: HTMLElement): FAQData[] {
  // Ưu tiên data-faqs JSON nếu có
  const dataAttr = el.getAttribute('data-faqs');
  if (dataAttr) {
    try {
      const parsed = JSON.parse(dataAttr);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((f) => f && typeof f.question === 'string' && typeof f.answer === 'string')
          .map((f) => ({ question: f.question, answer: f.answer }));
      }
    } catch (e) {
      // ignore
    }
  }
  // Fallback: parse từ HTML <details> nếu data-faqs không có (bài cũ)
  const items = el.querySelectorAll('details.faq-item');
  const faqs: FAQData[] = [];
  items.forEach((item) => {
    const qEl = item.querySelector('summary.faq-question');
    const aEl = item.querySelector('div.faq-answer');
    const question = qEl?.textContent?.trim() || '';
    let answer = '';
    if (aEl) {
      const paragraphs = aEl.querySelectorAll('p');
      if (paragraphs.length > 0) {
        answer = Array.from(paragraphs)
          .map((p) => {
            const clone = p.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
            return clone.textContent?.trim() || '';
          })
          .filter(Boolean)
          .join('\n\n');
      } else {
        answer = aEl.textContent?.trim() || '';
      }
    }
    if (question || answer) faqs.push({ question, answer });
  });
  return faqs;
}

export const FAQBlock = Node.create({
  name: 'faqBlock',
  group: 'block',
  atom: true, // atomic - không có content bên trong, dùng attribute để lưu
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      faqs: {
        default: [] as FAQData[],
        parseHTML: (element) => {
          // Khi load HTML từ DB, parse FAQ data
          return parseFaqsFromElement(element as HTMLElement);
        },
        renderHTML: (attributes) => {
          // Lưu cả 2: data-faqs JSON (cho edit) và data-faq (legacy)
          const faqs = (attributes.faqs as FAQData[]) || [];
          return {
            'data-faq': 'true',
            'data-faqs': JSON.stringify(faqs),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.faq-section[data-faq]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Tiptap renderHTML cần DOMOutputSpec: array hoặc DOM element thật
    // Vì cần render full <details> bên trong, mình tạo DOM thật
    const faqs = (node.attrs.faqs as FAQData[]) || [];
    const innerHtml = renderFaqsToHtml(faqs);

    const dom = document.createElement('div');
    dom.className = 'faq-section';
    dom.setAttribute('data-faq', 'true');
    dom.setAttribute('data-faqs', JSON.stringify(faqs));
    dom.innerHTML = innerHtml;

    return dom;
  },

  // NodeView để render preview trong editor
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className = 'faq-section faq-block-preview';
      dom.setAttribute('data-faq', 'true');

      const faqs = (node.attrs.faqs as FAQData[]) || [];

      function render() {
        const currentFaqs = (node.attrs.faqs as FAQData[]) || [];
        const innerHtml = renderFaqsToHtml(currentFaqs);
        dom.innerHTML = `
          <div class="faq-block-header">
            <span class="faq-block-label">❓ FAQ Section · ${currentFaqs.length} câu hỏi</span>
            <span class="faq-block-hint">Click ❓ trên thanh công cụ hoặc double-click để chỉnh sửa</span>
          </div>
          <div class="faq-block-items">${innerHtml || '<p class="faq-block-empty">Chưa có câu hỏi. Click ❓ trên toolbar để thêm.</p>'}</div>
        `;
      }
      render();

      // Double-click → open modal (dispatch custom event để ArticleEditor catch)
      dom.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const event = new CustomEvent('faq-edit-request', {
          bubbles: true,
          detail: { pos: typeof getPos === 'function' ? getPos() : null },
        });
        dom.dispatchEvent(event);
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'faqBlock') return false;
          // Re-render khi attribute thay đổi
          if (JSON.stringify(updatedNode.attrs.faqs) !== JSON.stringify(node.attrs.faqs)) {
            node = updatedNode as typeof node;
          }
          // Lấy faqs mới nhất từ node được pass vào
          const newFaqs = (updatedNode.attrs.faqs as FAQData[]) || [];
          const innerHtml = renderFaqsToHtml(newFaqs);
          dom.innerHTML = `
            <div class="faq-block-header">
              <span class="faq-block-label">❓ FAQ Section · ${newFaqs.length} câu hỏi</span>
              <span class="faq-block-hint">Double-click để chỉnh sửa</span>
            </div>
            <div class="faq-block-items">${innerHtml || '<p class="faq-block-empty">Chưa có câu hỏi.</p>'}</div>
          `;
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setFaqBlock:
        (faqs) =>
        ({ chain, state }) => {
          // Tìm faqBlock hiện có trong document
          let existingPos: number | null = null;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'faqBlock') {
              existingPos = pos;
              return false; // stop iterating
            }
          });

          if (existingPos !== null) {
            // Update node hiện có
            return chain()
              .setNodeSelection(existingPos)
              .updateAttributes('faqBlock', { faqs })
              .run();
          }
          // Insert mới ở cursor
          return chain()
            .focus()
            .insertContent({
              type: 'faqBlock',
              attrs: { faqs },
            })
            .run();
        },
    };
  },
});
