(() => {
  const ERROR_WORDS = [
    'error', 'failed', 'invalid', 'required', 'mismatch', 'not found', 'try again',
    'त्रुटी', 'चूक', 'अवैध', 'आवश्यक', 'जुळत नाही', 'पुन्हा प्रयत्न',
    'गलत', 'अमान्य', 'आवश्यक', 'विफल'
  ];
  const SUCCESS_WORDS = [
    'success', 'successful', 'submitted', 'completed', 'saved', 'verified',
    'यशस्वी', 'सबमिट', 'पूर्ण', 'जतन', 'पडताळणी', 'सफल', 'सहेजा'
  ];

  let lastUrl = location.href;
  const sentText = new Map();

  function safeText(value, limit = 180) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function cssSelector(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth += 1) {
      let part = node.tagName.toLowerCase();
      if (node.getAttribute('name')) part += `[name="${CSS.escape(node.getAttribute('name'))}"]`;
      else if (node.classList.length) part += `.${[...node.classList].slice(0, 2).map(CSS.escape).join('.')}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ').slice(0, 350);
  }

  function fieldLabel(el) {
    if (!el) return null;
    const aria = el.getAttribute('aria-label');
    if (aria) return safeText(aria);
    if (el.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return safeText(label.innerText || label.textContent);
      } catch {}
    }
    const wrapping = el.closest('label');
    if (wrapping) return safeText(wrapping.innerText || wrapping.textContent);
    return safeText(el.getAttribute('placeholder') || el.getAttribute('name') || '');
  }

  function send(type, details = {}) {
    try {
      chrome.runtime.sendMessage({
        type: 'SHADOW_EVENT',
        event: {
          type,
          at: new Date().toISOString(),
          url: location.href,
          title: document.title,
          ...details
        }
      }).catch(() => {});
    } catch {}
  }

  function classifyMessage(text) {
    const lower = text.toLowerCase();
    if (ERROR_WORDS.some((word) => lower.includes(word))) return 'error';
    if (SUCCESS_WORDS.some((word) => lower.includes(word))) return 'success';
    return null;
  }

  function inspectTextNode(node) {
    if (!node || node.nodeType !== 1) return;
    const text = safeText(node.innerText || node.textContent, 240);
    if (text.length < 4 || text.length > 240) return;
    const type = classifyMessage(text);
    if (!type) return;
    const key = `${type}:${text}`;
    const last = sentText.get(key) || 0;
    if (Date.now() - last < 15000) return;
    sentText.set(key, Date.now());
    send(type, { text, selector: cssSelector(node) });
  }

  send('page_view', { referrer: document.referrer || null });

  document.addEventListener('click', (event) => {
    const el = event.target?.closest?.('button,a,input[type="button"],input[type="submit"],[role="button"]') || event.target;
    if (!el) return;
    send('click', {
      selector: cssSelector(el),
      label: fieldLabel(el),
      text: safeText(el.innerText || el.value || el.getAttribute?.('title') || el.getAttribute?.('aria-label')),
      tag: el.tagName?.toLowerCase() || null
    });
  }, true);

  document.addEventListener('input', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    send('input', {
      selector: cssSelector(el),
      name: el.name || null,
      label: fieldLabel(el),
      placeholder: el.getAttribute('placeholder') || null,
      inputType: el.type || el.tagName.toLowerCase(),
      value: el.type === 'file' ? `[${el.files?.length || 0} file(s)]` : el.value
    });
  }, true);

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    send('change', {
      selector: cssSelector(el),
      name: el.name || null,
      label: fieldLabel(el),
      inputType: el.type || el.tagName.toLowerCase(),
      value: el.type === 'file' ? `[${el.files?.length || 0} file(s)]` : el.value
    });
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    send('submit', {
      selector: cssSelector(form),
      label: form?.getAttribute?.('name') || form?.getAttribute?.('id') || null
    });
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          inspectTextNode(node);
          node.querySelectorAll?.('[role="alert"], .alert, .error, .success, .toast, .notification')
            .forEach(inspectTextNode);
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    setTimeout(checkNavigation, 0);
    return result;
  };
  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    setTimeout(checkNavigation, 0);
    return result;
  };
  window.addEventListener('popstate', checkNavigation);

  function checkNavigation() {
    if (location.href === lastUrl) return;
    const from = lastUrl;
    lastUrl = location.href;
    send('navigation', { from, to: lastUrl });
    setTimeout(() => send('page_view'), 250);
  }

  window.addEventListener('error', (event) => {
    send('page_error', { text: safeText(event.message, 220) });
  });
})();
