(function() {
  'use strict';

  // Get configuration from script tag
  var script = document.currentScript || document.querySelector('script[data-agent]');
  if (!script) return;

  var agentSlug = script.getAttribute('data-agent');
  if (!agentSlug) return;

  var colour = script.getAttribute('data-colour') || '#16a34a';
  var baseUrl = script.getAttribute('data-url') || 'https://tradgo-production.up.railway.app';
  var position = script.getAttribute('data-position') || 'right';

  var isOpen = false;
  var iframe = null;
  var button = null;
  var container = null;

  // Create styles
  var style = document.createElement('style');
  style.textContent = [
    '.tradgo-widget-btn{',
    '  position:fixed;bottom:20px;' + position + ':20px;z-index:99998;',
    '  width:60px;height:60px;border-radius:30px;border:none;cursor:pointer;',
    '  background:' + colour + ';color:#fff;',
    '  box-shadow:0 4px 12px rgba(0,0,0,0.15);',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:transform 0.2s,box-shadow 0.2s;',
    '  font-family:system-ui,-apple-system,sans-serif;',
    '}',
    '.tradgo-widget-btn:hover{transform:scale(1.05);box-shadow:0 6px 16px rgba(0,0,0,0.2);}',
    '.tradgo-widget-btn svg{width:28px;height:28px;fill:currentColor;}',
    '.tradgo-widget-container{',
    '  position:fixed;bottom:90px;' + position + ':20px;z-index:99999;',
    '  width:380px;max-width:calc(100vw - 40px);',
    '  height:600px;max-height:calc(100vh - 120px);',
    '  border-radius:16px;overflow:hidden;',
    '  box-shadow:0 8px 30px rgba(0,0,0,0.12);',
    '  background:#fff;',
    '  transition:opacity 0.2s,transform 0.2s;',
    '}',
    '.tradgo-widget-container.tradgo-hidden{',
    '  opacity:0;transform:translateY(10px);pointer-events:none;',
    '}',
    '.tradgo-widget-container iframe{',
    '  width:100%;height:100%;border:none;',
    '}',
    '@media(max-width:480px){',
    '  .tradgo-widget-container{',
    '    width:100vw;height:100vh;max-height:100vh;',
    '    bottom:0;' + position + ':0;border-radius:0;',
    '  }',
    '  .tradgo-widget-btn{bottom:16px;' + position + ':16px;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  // Create button
  button = document.createElement('button');
  button.className = 'tradgo-widget-btn';
  button.setAttribute('aria-label', 'Chat with agent');
  button.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  button.addEventListener('click', toggle);
  document.body.appendChild(button);

  // Create container
  container = document.createElement('div');
  container.className = 'tradgo-widget-container tradgo-hidden';
  document.body.appendChild(container);

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.remove('tradgo-hidden');
      // Lazy-load iframe on first open
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.src = baseUrl + '/agent/' + agentSlug + '?embed=true';
        iframe.setAttribute('title', 'Chat with agent');
        iframe.setAttribute('loading', 'lazy');
        container.appendChild(iframe);
      }
      // Change button to X
      button.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    } else {
      container.classList.add('tradgo-hidden');
      // Change button back to chat icon
      button.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    }
  }
})();
