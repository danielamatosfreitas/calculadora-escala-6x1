// Parágrafos curtos (menos de 120 caracteres) ficam alinhados à esquerda,
// mesmo onde o CSS da página justifica o texto corrido. Desde 20/10/2026 o texto só é justificado a partir de 600 px,
// então o script só trabalha nessas larguras (abaixo, o CSS já deixa tudo alinhado à esquerda).
(function () {
  var LIMITE = 120;
  var agendado = false;
  function alinhar() {
    agendado = false;
    if (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) return;
    var els = document.querySelectorAll('body *:not(script):not(style)');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.getAttribute('data-curto') === '1') continue;
      var n = (e.textContent || '').replace(/\s+/g, ' ').trim().length;
      if (n > 0 && n < LIMITE && getComputedStyle(e).textAlign === 'justify') {
        e.style.textAlign = 'left';
        e.setAttribute('data-curto', '1');
      }
    }
  }
  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(alinhar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alinhar);
  else alinhar();
  // conteúdo montado depois (relatório dos diagnósticos) e mudança de largura (justificação por media query)
  // (27/10/2026) só reage a elementos novos fora do painel animado de /recrutamento-e-selecao: troca de texto não dispara a varredura
  new MutationObserver(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      var novos = lista[i].addedNodes;
      for (var j = 0; j < novos.length; j++) {
        var n = novos[j];
        if (n.nodeType === 1 && !(n.closest && n.closest('#painel-rs'))) { agendar(); return; }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', agendar);
})();
