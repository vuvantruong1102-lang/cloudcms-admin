import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaBlock: {
      /** Chèn/cập nhật khối CTA */
      setCtaBlock: (data: CTAData) => ReturnType;
    };
  }
}

/**
 * CTA Block — ATOMIC node (giống FAQ block).
 *
 * Giao diện: ô nền navy thẫm, chữ trắng, nút đỏ (#dc143b) chữ trắng.
 * 4 trường: eyebrow (nhãn nhỏ phía trên), title, buttonText, buttonHref.
 *
 * HTML render (admin + frontend dùng chung, website đã có CSS .yk-cta/.yk-button):
 *   <div class="yk-cta" data-cta="true"
 *        data-eyebrow="..." data-title="..."
 *        data-button-text="..." data-button-href="...">
 *     <small class="yk-eyebrow">eyebrow</small>
 *     <p><strong>title</strong></p>
 *     <a class="yk-button" href="buttonHref">buttonText</a>
 *   </div>
 */

export type CTAData = {
  eyebrow: string;
  title: string;
  buttonText: string;
  buttonHref: string;
};

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render CTA data thành HTML con (cho preview editor và frontend) */
export function renderCtaToHtml(d: CTAData): string {
  const eyebrow = escapeHtml(d.eyebrow);
  const title = escapeHtml(d.title).replace(/\n/g, '<br>');
  const btnText = escapeHtml(d.buttonText);
  const btnHref = escapeHtml(d.buttonHref);
  const eyebrowHtml = eyebrow ? `<small class="yk-eyebrow">${eyebrow}</small>` : '';
  const titleHtml = title ? `<p><strong>${title}</strong></p>` : '';
  const btnHtml =
    btnText && btnHref ? `<a class="yk-button" href="${btnHref}">${btnText}</a>` : '';
  return `${eyebrowHtml}${titleHtml}${btnHtml}`;
}

function parseCtaFromElement(el: HTMLElement): CTAData {
  if (el.getAttribute('data-title') !== null || el.getAttribute('data-eyebrow') !== null) {
    return {
      eyebrow: el.getAttribute('data-eyebrow') || '',
      title: el.getAttribute('data-title') || '',
      buttonText: el.getAttribute('data-button-text') || '',
      buttonHref: el.getAttribute('data-button-href') || '',
    };
  }
  const eyebrow = el.querySelector('.yk-eyebrow')?.textContent?.trim() || '';
  const title = el.querySelector('p strong')?.textContent?.trim() || '';
  const btn = el.querySelector('a.yk-button') as HTMLAnchorElement | null;
  return {
    eyebrow,
    title,
    buttonText: btn?.textContent?.trim() || '',
    buttonHref: btn?.getAttribute('href') || '',
  };
}

export const CTABlock = Node.create({
  name: 'ctaBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      eyebrow: { default: 'KHÁM PHÁ THÊM' },
      title: { default: '' },
      buttonText: { default: 'Xem sản phẩm →' },
      buttonHref: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div.yk-cta' }, { tag: 'div[data-cta]' }];
  },

  renderHTML({ node }) {
    const data: CTAData = {
      eyebrow: node.attrs.eyebrow || '',
      title: node.attrs.title || '',
      buttonText: node.attrs.buttonText || '',
      buttonHref: node.attrs.buttonHref || '',
    };
    const attrs = mergeAttributes({
      class: 'yk-cta',
      'data-cta': 'true',
      'data-eyebrow': data.eyebrow,
      'data-title': data.title,
      'data-button-text': data.buttonText,
      'data-button-href': data.buttonHref,
    });
    const children: any[] = [];
    if (data.eyebrow) children.push(['small', { class: 'yk-eyebrow' }, data.eyebrow]);
    if (data.title) children.push(['p', {}, ['strong', {}, data.title]]);
    if (data.buttonText && data.buttonHref) {
      children.push(['a', { class: 'yk-button', href: data.buttonHref }, data.buttonText]);
    }
    return ['div', attrs, ...children];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'yk-cta';
      dom.setAttribute('data-cta', 'true');
      dom.innerHTML = renderCtaToHtml({
        eyebrow: node.attrs.eyebrow || '',
        title: node.attrs.title || '',
        buttonText: node.attrs.buttonText || '',
        buttonHref: node.attrs.buttonHref || '',
      });
      dom.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', (e) => e.preventDefault());
      });
      return { dom };
    };
  },

  addCommands() {
    return {
      setCtaBlock:
        (data) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              eyebrow: data.eyebrow,
              title: data.title,
              buttonText: data.buttonText,
              buttonHref: data.buttonHref,
            },
          }),
    };
  },
});

export { parseCtaFromElement };
