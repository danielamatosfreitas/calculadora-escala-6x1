// Calculadora "Sua escala cabe na regra nova?" (fim da escala 6x1). Versão de portfólio: nada é gravado nem enviado;
// o PDF é gerado pelo próprio navegador (Imprimir > Salvar como PDF). O cálculo é o mesmo da versão publicada.
(function () {
  'use strict';

  // ───────── cálculo (sem tela; usado também nos testes) ─────────
  // Modelo de 18/10/2026, revisto em 19/10/2026 pelo texto da emenda, por grupo e por etapa
  // (L = 42 na primeira, 40 na segunda). Etapa 1 pela liminar do STF de 12/11/2026 (ainda sujeita a referendo do plenário): as 42 h podem ser
  // distribuídas em 5 dias de até 8h24 quando não há acordo ou convenção coletiva até 15/12/2026 (a calculadora usa essa regra
  // para todos, porque não pergunta sobre o acordo); com menos de 5 dias de trabalho, o teto diário continua 8 h:
  //   diasNovos = mínimo(dias, 5); etapa 1: horasNovas = mínimo(horas da semana, 42, diasNovos × (8,4 com 5 dias; 8 com menos));
  //   etapa 2: horasNovas = mínimo(horas da semana, 40, diasNovos × 8)
  //   muda de escala se dias > 5 ou horas > horasNovas; perda = (horas − horasNovas) × pessoas
  //   equivalente em pessoas = perda total / L (1 casa); custo da hora: horas / horasNovas − 1
  //   cobertura (grupos com pessoas ao mesmo tempo): necessidade = horas abertas × simultâneas;
  //   capacidade = pessoas × horas (hoje) ou × horasNovas (depois); contratar = arredondar para cima(déficit / L)
  function etapa(grupos, empresa, L) {
    var linhas = grupos.map(function (g) {
      var diasNovos = Math.min(g.dias, 5);
      // etapa 1 (liminar do STF de 12/11/2026): teto de 8h24 por dia com 5 dias de trabalho, 8 h com menos; etapa 2: 8 h por dia
      var tetoDiario = L > 40 && diasNovos === 5 ? 8.4 : 8;
      var horasNovas = Math.min(g.horas, L, diasNovos * tetoDiario);
      var perdaPessoa = g.horas - horasNovas;
      var cob = null;
      if (g.simultaneas) {
        var nec = empresa.horas * g.simultaneas, hoje = g.pessoas * g.horas, depois = g.pessoas * horasNovas;
        // dias de presença (19/10/2026): s pessoas em todos os D dias abertos pedem s × D dias; depois da mudança há
        // pessoas × dias de trabalho (no máximo 5). Faltando dias, cada dia vale A / D horas. H = maior entre os dois déficits.
        var D = empresa.dias || 0, necDias = g.simultaneas * D, dispDias = g.pessoas * diasNovos;
        var hDias = D && dispDias < necDias ? (necDias - dispDias) * (empresa.horas / D) : 0;
        var defHoras = Math.max(0, nec - depois);
        // dados impossíveis (19/10/2026): mais pessoas ao mesmo tempo que pessoas no grupo, ou mais de 24 horas por dia aberto
        if (g.simultaneas > g.pessoas || (D && empresa.horas > 24 * D)) cob = { status: 'dados', nec: nec, hoje: hoje, depois: depois, motivo: g.simultaneas > g.pessoas ? 'pessoas' : 'horas' };
        // a equipe de hoje já fica abaixo do horário (em horas ou em dias de presença): a conta usa as horas perdidas com a regra nova
        else if (hoje < nec || g.pessoas * g.dias < necDias) cob = { status: 'abaixo', nec: nec, hoje: hoje, depois: depois, s: g.simultaneas,
          porDias: hoje >= nec, diasHoje: g.pessoas * g.dias, necDias: necDias };
        else if (defHoras <= 0 && hDias <= 0) cob = { status: 'cobre', nec: nec, hoje: hoje, depois: depois };
        else {
          var def = Math.ceil(Math.max(defHoras, hDias) - 1e-9);
          cob = { status: 'falta', nec: nec, hoje: hoje, depois: depois, deficit: def, s: g.simultaneas, faltaDias: hDias > 0 && hDias >= defHoras ? necDias - dispDias : 0,
            contratar: Math.ceil(def / L), reduzir: Math.round(def / g.simultaneas) };
        }
      }
      // contratação em pessoas inteiras: pela cobertura, quando há; senão, pelas horas perdidas
      var porPerda = !cob || cob.status === 'abaixo';
      var contratar = !porPerda ? (cob.status === 'falta' ? cob.contratar : 0) : (perdaPessoa > 0 ? Math.ceil(perdaPessoa * g.pessoas / L) : 0);
      return { nome: g.nome, pessoas: g.pessoas, dias: g.dias, diasSel: g.diasSel || null, horas: g.horas, salario: g.salario, simultaneas: g.simultaneas,
        diasNovos: diasNovos, horasNovas: horasNovas, muda: g.dias > 5 || g.horas > horasNovas,
        perdaPessoa: perdaPessoa, perda: perdaPessoa * g.pessoas, aumento: horasNovas > 0 ? g.horas / horasNovas - 1 : 0,
        cobertura: cob, contratar: contratar };
    });
    var horas = linhas.reduce(function (a, l) { return a + l.perda; }, 0);
    return {
      // jornada integral da data: 42 h na etapa 1 (liminar do STF), 40 h na etapa 2
      limite: L,
      linhas: linhas,
      pessoas: linhas.filter(function (l) { return l.muda; }).reduce(function (a, l) { return a + l.pessoas; }, 0),
      horas: horas,
      equivalente: Math.round(horas / L * 10) / 10
    };
  }
  function calcular(grupos, empresa) {
    var e1 = etapa(grupos, empresa, 42), e2 = etapa(grupos, empresa, 40);
    var folha = grupos.reduce(function (a, g) { return a + (g.salario ? g.salario * g.pessoas : 0); }, 0);
    return { e1: e1, e2: e2, folha: folha,
      revezamento: empresa.dias > 5 && grupos.some(function (g) { return g.dias > 5; }) };
  }
  // ───────── valores em reais (18/10/2026, revisto em 19/10/2026) ─────────
  // Fator de encargos sobre o salário: 13º (8,33%) + férias com o terço (11,11%) + FGTS de 8% sobre salário, 13º e férias (9,56%) = 1,29;
  // fora do Simples (ou no Anexo IV), mais 27,8% sobre salário, 13º e férias (INSS patronal 20%, RAT 2%, terceiros 5,8%) = 33,2%, total 1,62.
  // Não entram benefícios (vale-transporte, alimentação, plano) nem a multa do FGTS. "Não sei" (ou em branco) mostra a faixa.
  var FATORES = { simples: [1.29], geral: [1.62], naosei: [1.29, 1.62] };
  function fatorDe(regime) { return FATORES[regime] || FATORES.naosei; }
  // Todos os caminhos cobrem as mesmas horas H por grupo: com pessoas ao mesmo tempo, H = horas que faltam para a cobertura
  // (0 quando a equipe cobre); sem esse dado, H = horas perdidas por semana. Contratar (CLT, art. 58-A: tempo parcial até 30 h):
  // H até 30 vira 1 pessoa em tempo parcial de H horas (hora inteira), com salário proporcional (salário × H / horas semanais novas do grupo,
  // a mesma base do valor da hora extra; CLT, art. 58-A, § 1º; 11/11/2026);
  // acima de 30, pessoas em tempo integral = parte inteira de H / jornada nova, e a sobra vira 1 parcial (até 30 h) ou mais 1 integral.
  // Hora extra: H × 4,33 × valor da hora (salário / (jornada nova × 5)) × 1,5 × 7/6 (reflexo no descanso semanal remunerado) × fator.
  // Projeção de 12 meses: contratar tem um custo único no mês 1 de 1 salário por pessoa contratada (seleção, admissão e treinamento).
  // Esse custo é fixo e fica inteiro também no tempo parcial (11/11/2026): só o salário mensal é proporcional às horas.
  function custos(r, regime) {
    var f = fatorDe(regime);
    function porEtapa(e) {
      var dados = false;
      var grupos = e.linhas.map(function (l) {
        var H;
        if (l.cobertura && l.cobertura.status !== 'abaixo') { if (l.cobertura.status === 'dados') dados = true; H = l.cobertura.status === 'falta' ? l.cobertura.deficit : 0; }
        else H = l.perda;
        // jornada integral da etapa (42 ou 40) para contar as pessoas em tempo integral; valor da hora e salário do tempo parcial
        // pelas horas novas do grupo na etapa (a mesma base nas duas contas)
        var Hc = H > 0 ? Math.ceil(H - 1e-9) : 0, J = e.limite, jn = l.horasNovas, integrais = 0, parcial = 0, sobraExtra = 0;
        if (Hc > 0) {
          var n = Math.floor(Hc / J), sobra = Hc - n * J;
          if (!n) { if (Hc <= 30) parcial = Hc; else integrais = 1; }
          else { integrais = n; if (sobra > 30) integrais++; else if (sobra >= 12) parcial = sobra; else if (sobra > 0) sobraExtra = sobra; }
        }
        var sal = l.salario, hora = sal ? sal / (jn * 5) : 0;
        var custoExtra = function (horas, x) { return horas * 4.33 * hora * 1.5 * (7 / 6) * x; };
        // falta de dias de trabalho: hora extra não coloca ninguém na empresa no dia de folga
        var porDias = !!(l.cobertura && l.cobertura.status === 'falta' && l.cobertura.faltaDias > 0);
        return {
          nome: l.nome, H: H, Hc: Hc, jornada: jn, integrais: integrais, parcial: parcial, sobraExtra: sobraExtra, pessoasNovas: integrais + (parcial ? 1 : 0), salario: sal,
          porDias: porDias, faltaDias: porDias ? l.cobertura.faltaDias : 0, juntas: l.simultaneas,
          contratar: sal && Hc ? f.map(function (x) { return (integrais * sal + (parcial ? sal * parcial / jn : 0)) * x + (sobraExtra ? custoExtra(sobraExtra, x) : 0); }) : null,
          unico: sal && Hc ? (integrais + (parcial ? 1 : 0)) * sal : null,
          extra: sal && H > 0 ? f.map(function (x) { return custoExtra(H, x); }) : null,
          extrasPorPessoa: H / l.pessoas, excede: H / l.pessoas > 10
        };
      });
      var comH = grupos.filter(function (g) { return g.H > 0; });
      var somar = function (k) { var c = comH.filter(function (g) { return g[k]; }); return c.length ? f.map(function (_, i) { return c.reduce(function (a, g) { return a + g[k][i]; }, 0); }) : null; };
      var semSalario = comH.filter(function (g) { return !g.salario; }).map(function (g) { return g.nome; });
      var res = {
        dados: dados, grupos: grupos, comH: comH,
        H: grupos.reduce(function (a, g) { return a + g.H; }, 0),
        Hc: grupos.reduce(function (a, g) { return a + g.Hc; }, 0),
        integrais: grupos.reduce(function (a, g) { return a + g.integrais; }, 0),
        parciais: grupos.filter(function (g) { return g.parcial; }).map(function (g) { return { nome: g.nome, horas: g.parcial }; }),
        sobraExtra: grupos.reduce(function (a, g) { return a + g.sobraExtra; }, 0),
        semExtra: grupos.filter(function (g) { return g.porDias; })[0] || null,
        pessoasNovas: grupos.reduce(function (a, g) { return a + g.pessoasNovas; }, 0),
        contratar: somar('contratar'), extra: somar('extra'),
        unico: comH.some(function (g) { return g.unico; }) ? comH.reduce(function (a, g) { return a + (g.unico || 0); }, 0) : null,
        semSalario: semSalario, completo: comH.length > 0 && !semSalario.length,
        excede: grupos.filter(function (g) { return g.excede; }).map(function (g) { return g.nome; })
      };
      // regra das 12 horas (19/10/2026): de 1 a 11 horas por semana é pouco para uma contratação; o indicado é ajustar o horário
      res.ajuste = res.Hc > 0 && res.Hc < 12;
      // mês de virada: primeiro mês inteiro em que o acumulado de contratar fica menor ou igual ao da hora extra (um por fator)
      res.virada = res.completo && !res.semExtra ? f.map(function (_, i) {
        for (var m = 1; m <= 12; m++) if (res.contratar[i] * m + res.unico <= res.extra[i] * m + 1e-9) return m;
        return null;
      }) : null;
      return res;
    }
    return { fator: f, e1: porEtapa(r.e1), e2: porEtapa(r.e2) };
  }
  // em Node (testes), o arquivo exporta o cálculo e os textos da recomendação e dos caminhos (13/11/2026); a parte da tela só liga no navegador
  var EM_NODE = typeof module !== 'undefined' && !!module.exports;

  // ───────── formatação ─────────
  var num = function (n) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); };
  var reais = function (n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var reaisInteiros = function (n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  var pessoasTxt = function (n) { return num(n) + (n >= 2 ? '\u00a0pessoas' : '\u00a0pessoa'); };
  // singular abaixo de 2 ("1 hora", "1,5 hora"); zero e de 2 em diante, plural (29/10/2026)
  var umaHora = function (n) { return n > 0 && n < 2; };
  var horasTxt = function (n) { return num(n) + (umaHora(n) ? '\u00a0hora' : '\u00a0horas'); };
  var faltamTxt = function (n) { return (umaHora(n) ? 'falta ' : 'faltam ') + horasTxt(n); };
  var extrasTxt = function (n) { return num(n) + (umaHora(n) ? '\u00a0hora extra' : '\u00a0horas extras'); };
  var afetadasTxt = function (n) { return n === 1 ? 'pessoa que vai trabalhar menos horas ou ganhar uma folga a mais' : 'pessoas que vão trabalhar menos horas ou ganhar uma folga a mais'; };
  function lista(nomes) { return nomes.length <= 1 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Aceita "7,5", "7.5", "2.800", "2.800,50" e "R$ 2800"
  function lerNumero(v) {
    var s = String(v || '').replace(/R\$|\s/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  // medição de uso (Google Analytics) desligada nesta versão de portfólio
  function ev() {}
  var iniciou = false;
  function marcarInicio() { if (!iniciou) { iniciou = true; ev('escala6x1_inicio'); } }

  // ───────── tela (desenho aprovado em 19/10/2026) ─────────
  var $ = function (id) { return document.getElementById(id); };
  var resultado = null;
  var contador = 0;
  var grupoAtivo = null;
  var TITULOS = ['Quem trabalha na sua empresa', 'Que horas a empresa abre e fecha?', 'O resultado da sua empresa'];
  var NOMES_PASSO = ['Equipe', 'Atendimento', 'Resultado'];

  function irPasso(n) {
    [1, 2, 3].forEach(function (i) {
      $('passo-' + i).hidden = i !== n;
      var marca = document.querySelector('.abas li[data-passo="' + i + '"]');
      marca.classList.toggle('atual', i === n);
      marca.classList.toggle('feito', i < n);
      if (i === n) marca.setAttribute('aria-current', 'step'); else marca.removeAttribute('aria-current');
      var seg = document.querySelector('.ct-barra [data-seg="' + i + '"]');
      if (seg) seg.classList.toggle('on', i <= n);
    });
    if ($('ct-passo')) { $('ct-passo').textContent = 'Passo ' + n + ' de 3 · ' + NOMES_PASSO[n - 1]; $('ct-tit').textContent = TITULOS[n - 1]; }
    if ($('calc-form')) $('calc-form').hidden = n === 3;
    atualizarBarra();
    var topo = $('calculadora');
    if (topo && topo.getBoundingClientRect().top < 0) topo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function erro(campo, msg) {
    var box = campo.closest('.campo');
    var e = box.querySelector('.campo-erro');
    if (!e) { e = document.createElement('div'); e.className = 'campo-erro'; e.setAttribute('role', 'alert'); box.appendChild(e); }
    e.textContent = msg || '';
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  // Devolvem o número válido ou null (com a mensagem de erro no campo)
  function validarInteiro(campo, min, max, rotulo) {
    var n = lerNumero(campo.value);
    if (n == null) { erro(campo, 'Informe ' + rotulo + '.'); return null; }
    if (isNaN(n) || n % 1 !== 0 || n < min || n > max) { erro(campo, 'Use um número inteiro de ' + min + ' a ' + max + '.'); return null; }
    erro(campo, ''); return n;
  }


  // ───────── passo 2: que horas a empresa abre e fecha (19/10/2026) ─────────
  // Três linhas (segunda a sexta, sábado, domingo) ou as 7 separadas; o almoço é descontado de cada dia aberto.
  // O total vira os campos ocultos emp-dias e emp-horas, lidos pelo cálculo como antes.
  var HOR_GRUPOS = [{ nome: 'Segunda a sexta', dias: [0, 1, 2, 3, 4], abre: '08:00', fecha: '18:00' }, { nome: 'Sábado', dias: [5], abre: '08:00', fecha: '12:00' }, { nome: 'Domingo', dias: [6], abre: '', fecha: '', fechado: true }];
  var horValido = true;
  function linhaHorario(id, nome, dias, abre, fecha, fechado) {
    return '<div class="hor-linha" data-dias="' + dias.join(',') + '"><p class="hor-nome" id="' + id + '-nome">' + nome + '</p>' +
      '<label class="hor-campo"><span>Abre</span><input type="time" class="hor-abre" value="' + abre + '" step="900" aria-label="' + nome + ': abre"' + (fechado ? ' disabled' : '') + '></label>' +
      '<label class="hor-campo"><span>Fecha</span><input type="time" class="hor-fecha" value="' + fecha + '" step="900" aria-label="' + nome + ': fecha"' + (fechado ? ' disabled' : '') + '></label>' +
      '<label class="hor-x"><input type="checkbox" class="hor-fechado"' + (fechado ? ' checked' : '') + ' aria-label="' + nome + ': fechado"><span>Fechado</span></label>' +
      '<p class="hor-erro" role="alert"></p></div>';
  }
  function montarHorarios() {
    var ag = $('hor-agrupado'), sep = $('hor-separado'); if (!ag) return;
    ag.innerHTML = HOR_GRUPOS.map(function (g, i) { return linhaHorario('hg' + i, g.nome, g.dias, g.abre, g.fecha, g.fechado); }).join('');
    sep.innerHTML = DIAS_NOMES.map(function (n, d) { var g = HOR_GRUPOS.filter(function (x) { return x.dias.indexOf(d) >= 0; })[0]; return linhaHorario('hs' + d, n, [d], g.abre, g.fecha, g.fechado); }).join('');
    calcularHorarios();
  }
  var minutos = function (v) { var m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  function calcularHorarios() {
    var separado = !$('hor-separado').hidden, linhas = (separado ? $('hor-separado') : $('hor-agrupado')).querySelectorAll('.hor-linha');
    var almoco = $('hor-almoco').checked ? Number($('hor-almoco-dur').value) : 0;
    var total = 0, sel = [], ok = true;
    linhas.forEach(function (l) {
      var fechado = l.querySelector('.hor-fechado').checked, msg = '';
      l.querySelector('.hor-abre').disabled = fechado; l.querySelector('.hor-fecha').disabled = fechado;
      if (!fechado) {
        var a = minutos(l.querySelector('.hor-abre').value), f = minutos(l.querySelector('.hor-fecha').value);
        if (a == null || f == null) msg = 'Informe o horário de abrir e o de fechar.';
        else if (f <= a) msg = 'O horário de fechar precisa ser depois do de abrir.';
        else if ((f - a) / 60 > 24) msg = 'Um dia não pode passar de 24 horas.';
        else {
          var h = (f - a) / 60; if (almoco && h > almoco) h -= almoco;
          l.getAttribute('data-dias').split(',').forEach(function (d) { total += h; sel.push(Number(d)); });
        }
      }
      l.querySelector('.hor-erro').textContent = msg;
      l.classList.toggle('com-erro', !!msg);
      if (msg) ok = false;
    });
    horValido = ok && sel.length > 0;
    total = Math.round(total * 100) / 100;
    sel.sort(function (a, b) { return a - b; });
    $('emp-dias').value = sel.length ? String(sel.length) : ''; $('emp-dias').dataset.sel = sel.join(',');
    $('emp-horas').value = total ? num(total) : '';
    $('hor-total').textContent = !ok ? 'Confira os horários marcados em destaque.' : !sel.length ? 'Marque pelo menos um dia aberto.'
      : 'Total: ' + horasTxt(total) + ' abertas por semana, em ' + diasTxt(sel.length) + '.';
    erro($('emp-dias'), '');
  }
  // "Os dias da semana têm horários diferentes": abre as 7 linhas, com os horários das linhas agrupadas
  function alternarDias() {
    var bt = $('hor-alternar'), sep = $('hor-separado'), abrir = sep.hidden;
    if (abrir) {
      $('hor-agrupado').querySelectorAll('.hor-linha').forEach(function (g) {
        g.getAttribute('data-dias').split(',').forEach(function (d) {
          var l = sep.querySelector('.hor-linha[data-dias="' + d + '"]');
          l.querySelector('.hor-abre').value = g.querySelector('.hor-abre').value; l.querySelector('.hor-fecha').value = g.querySelector('.hor-fecha').value;
          l.querySelector('.hor-fechado').checked = g.querySelector('.hor-fechado').checked;
        });
      });
    }
    sep.hidden = !abrir; $('hor-agrupado').hidden = abrir;
    bt.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    bt.textContent = abrir ? 'Usar o mesmo horário de segunda a sexta' : 'Os dias da semana têm horários diferentes';
    calcularHorarios();
  }

  // Passo 2: quando a empresa atende (dias e horas abertas na semana, somados pelos horários)
  function lerFuncionamento() {
    if (!horValido) { var e = document.querySelector('#passo-2 .hor-linha.com-erro input:not([disabled])') || document.querySelector('#passo-2 .hor-linha input'); if (e) e.focus(); return null; }
    var dCampo = $('emp-dias');
    var d = validarInteiro(dCampo, 1, 7, 'os dias em que a empresa abre');
    var h = validarFaixa($('emp-horas'), 1, 168, 'as horas em que a empresa fica aberta na semana');
    return d != null && h != null ? { dias: d, horas: h, diasSel: diasMarcados(dCampo, d) } : null;
  }
  // número entre min e max (aceita decimal)
  function validarFaixa(campo, min, max, rotulo) {
    var n = lerNumero(campo.value);
    if (n == null) { erro(campo, 'Informe ' + rotulo + '.'); return null; }
    if (isNaN(n) || n < min || n > max) { erro(campo, 'Use um número de ' + min + ' a ' + max + '.'); return null; }
    erro(campo, ''); return n;
  }
  // dias marcados nos botões (índices de 0 = segunda a 6 = domingo); null quando o número veio digitado sem os botões
  function diasMarcados(campo, n) {
    var sel = (campo.dataset.sel || '').split(',').filter(Boolean).map(Number);
    return sel.length === n ? sel : null;
  }
  // foca o primeiro campo com erro (num campo de dias, o primeiro botão de dia)
  function focarErro(passo) {
    var e = document.querySelector('#' + passo + ' [aria-invalid="true"]');
    if (!e) return;
    if (e.type === 'hidden') { var b = e.closest('.campo').querySelector('.dia-bt'); if (b) b.focus(); } else e.focus();
  }

  // ───────── blocos do formulário ─────────
  var DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var DIAS_NOMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  // orientação de cada campo (19/10/2026): aparece logo abaixo dele ao tocar ou clicar no campo ou num dos seus botões, e some ao passar
  // para outro campo; no computador, passar o mouse no "?" mostra a mesma orientação; no celular, tocar no "?" abre e fecha
  function ajudaBt(id, rotulo) {
    return '<button type="button" class="ajuda-bt" data-controle aria-expanded="false" aria-controls="' + id + '-ori" aria-label="Como preencher: ' + rotulo + '">?</button>';
  }
  function orientaP(id, texto) { return '<p class="orienta" id="' + id + '-ori" hidden>' + texto + '</p>'; }
  // número grande no centro, menos e mais de 44 px dos lados; a digitação continua valendo
  function blocoNumero(id, cls, rotulo, sufixo, o) {
    var desc = ' aria-describedby="' + id + '-ori"';
    return '<div class="bloco-b campo"><div class="bb-cab"><span class="bb-rot-l"><label class="bb-rot" for="' + id + '">' + rotulo + '</label>' + ajudaBt(id, rotulo) + '</span></div>' +
      '<div class="num-ctl"><button type="button" class="st-bt" data-controle data-passo="-1" aria-label="Diminuir"' + desc + '>−</button>' +
      '<span class="num-val"><input id="' + id + '" type="text" class="num ' + cls + '" inputmode="numeric" autocomplete="off" placeholder="' + o.ph + '" data-min="' + o.min + '" data-max="' + o.max + '"' + (o.opcional ? ' data-opcional="1"' : '') + desc + '>' +
      '<span class="num-suf">' + sufixo + '</span></span>' +
      '<button type="button" class="st-bt mais" data-controle data-passo="1" aria-label="Aumentar"' + desc + '>+</button></div>' +
      orientaP(id, o.ori) + '</div>';
  }
  // dias em uma linha de 7 botões; o número de dias é a quantidade marcada (campo oculto, lido como antes)
  function blocoDias(id, cls, rotulo, ori) {
    return '<div class="bloco-b largo campo"><div class="bb-cab"><span class="bb-rot-l"><p class="bb-rot" id="' + id + '-rot">' + rotulo + '</p>' + ajudaBt(id, rotulo) + '</span>' +
      '<p class="bb-total" aria-live="polite">nenhum dia marcado</p></div>' +
      '<div class="dias-sel" role="group" aria-labelledby="' + id + '-rot" aria-describedby="' + id + '-ori">' +
      DIAS_CURTOS.map(function (d, i) { return '<button type="button" class="dia-bt" data-controle data-dia="' + i + '" aria-pressed="false" aria-label="' + DIAS_NOMES[i] + '">' + d + '</button>'; }).join('') +
      '</div><input type="hidden" id="' + id + '" class="' + cls + '">' + orientaP(id, ori) + '</div>';
  }
  // horas: valor grande à direita com menos e mais pequenos, régua de 20 a 60 com as duas marcas (42\u00a0h e 40\u00a0h)
  function blocoHoras(id, rotulo, ori) {
    var desc = ' aria-describedby="' + id + '-ori"';
    return '<div class="bloco-b largo campo"><div class="bb-cab"><span class="bb-rot-l"><label class="bb-rot" for="' + id + '">' + rotulo + '</label>' + ajudaBt(id, rotulo) + '</span>' +
      '<span class="horas-val"><button type="button" class="st-bt" data-controle data-passo="-1" aria-label="Diminuir"' + desc + '>−</button>' +
      '<input id="' + id + '" type="text" class="num f-horas" inputmode="decimal" autocomplete="off" placeholder="44" data-base="44" data-min="1" data-max="60"' + desc + '><span class="num-suf">h</span>' +
      '<button type="button" class="st-bt mais" data-controle data-passo="1" aria-label="Aumentar"' + desc + '>+</button></span></div>' +
      '<div class="regua-caixa"><input type="range" class="regua" min="20" max="60" step="1" value="44" aria-label="Régua de horas por semana, de 20 a 60"' + desc + '>' +
      '<span class="regua-marca m42" aria-hidden="true"></span><span class="regua-marca m40" aria-hidden="true"></span></div>' +
      '<div class="regua-esc" aria-hidden="true"><span>20\u00a0h</span><span class="lim">42\u00a0h em dez. 2026 · 40\u00a0h em dez. 2027</span><span>60\u00a0h</span></div>' +
      '<p class="regua-nota">Dez. 2026: até 42\u00a0h; sem acordo coletivo, em 5\u00a0dias de até 8h24 (liminar do STF).</p>' +
      orientaP(id, ori) + '</div>';
  }
  // mostra a orientação de um campo e esconde as dos outros (null esconde todas)
  var podeHover = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function orientar(campo) {
    document.querySelectorAll('#calculadora .orienta').forEach(function (o) {
      var c = o.closest('.campo'), on = c === campo;
      o.hidden = !on;
      var bt = c.querySelector('.ajuda-bt'); if (bt) bt.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }
  function campoComOrientacao(el) { var c = el && el.closest && el.closest('.campo'); return c && c.querySelector('.orienta') ? c : null; }
  function ligarOrientacoes(raiz) {
    raiz.addEventListener('focusin', function (e) { orientar(campoComOrientacao(e.target)); });
    raiz.addEventListener('click', function (e) {
      var bt = e.target.closest('.ajuda-bt'), c = campoComOrientacao(e.target);
      // no celular, tocar no "?" abre e fecha; no computador, o clique deixa aberta
      if (bt && !podeHover) { var aberta = !c.querySelector('.orienta').hidden && bt.getAttribute('data-tocado') === '1'; bt.setAttribute('data-tocado', aberta ? '0' : '1'); orientar(aberta ? null : c); return; }
      orientar(c);
    });
    if (podeHover) {
      raiz.addEventListener('mouseover', function (e) { var bt = e.target.closest('.ajuda-bt'); if (bt) orientar(bt.closest('.campo')); });
      raiz.addEventListener('mouseout', function (e) {
        var bt = e.target.closest('.ajuda-bt'); if (!bt || bt.contains(e.relatedTarget)) return;
        orientar(campoComOrientacao(document.activeElement));
      });
    }
    // clique ou toque fora da calculadora fecha a orientação
    document.addEventListener('click', function (e) { if (!e.target.closest('#calculadora')) orientar(null); });
  }
    function diasTotalTxt(n) { return n ? n + (n === 1 ? '\u00a0dia' : '\u00a0dias') + ' por semana' : 'nenhum dia marcado'; }
  function avisar(input) { input.dispatchEvent(new Event('input', { bubbles: true })); }
  function marcarChips(f) {
    var nome = f.querySelector('.f-nome').value.trim();
    f.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-nome') === nome ? 'true' : 'false'); });
  }
  // cliques e digitação nos controles (delegação: vale para os grupos criados depois)
  function ligarControles(raiz) {
    raiz.addEventListener('click', function (e) {
      var f = e.target.closest('.funcao'); if (f) grupoAtivo = f;
      var dia = e.target.closest('.dia-bt');
      if (dia) {
        var on = dia.getAttribute('aria-pressed') !== 'true';
        dia.setAttribute('aria-pressed', on ? 'true' : 'false');
        var box = dia.closest('.campo'), inp = box.querySelector('input[type=hidden]');
        var sel = [].slice.call(box.querySelectorAll('.dia-bt[aria-pressed="true"]')).map(function (b) { return b.getAttribute('data-dia'); });
        inp.value = sel.length ? String(sel.length) : '';
        inp.dataset.sel = sel.join(',');
        box.querySelector('.bb-total').textContent = diasTotalTxt(sel.length);
        if (sel.length) erro(inp, '');
        avisar(inp);
        return;
      }
      var st = e.target.closest('.st-bt');
      if (st) {
        var input = st.closest('.campo').querySelector('input.num'), passo = Number(st.getAttribute('data-passo'));
        var min = Number(input.dataset.min), max = Number(input.dataset.max), v = lerNumero(input.value);
        // campo vazio: nas horas, o primeiro clique parte do exemplo (44 e 54); nos demais, do mínimo
        if (v == null || isNaN(v)) v = input.dataset.base ? Number(input.dataset.base) : (passo > 0 ? min - 1 : min);
        var novo = Math.round((v + passo) * 10) / 10;
        if (novo < min) input.value = input.dataset.opcional ? '' : String(min);
        else input.value = num(Math.min(novo, max));
        avisar(input);
        return;
      }
      var chip = e.target.closest('.chip');
      if (chip) {
        var nome = chip.closest('.funcao').querySelector('.f-nome');
        nome.value = chip.getAttribute('data-nome');
        avisar(nome);
        return;
      }
    });
    raiz.addEventListener('input', function (e) {
      var t = e.target, f = t.closest('.funcao');
      if (f) grupoAtivo = f;
      if (t.classList.contains('regua')) { var h = f.querySelector('.f-horas'); h.value = t.value; avisar(h); return; }
      if (t.classList.contains('f-horas')) { var n = lerNumero(t.value); if (n != null && !isNaN(n)) f.querySelector('.regua').value = Math.min(60, Math.max(20, n)); }
      if (t.classList.contains('f-nome')) marcarChips(f);
    });
  }

  // Passo 1: quem trabalha na empresa (um grupo por escala)
  function novaFuncao() {
    contador++;
    var id = 'f' + contador;
    var div = document.createElement('fieldset');
    div.className = 'funcao';
    div.innerHTML =
      '<legend class="funcao-titulo sr-only">Grupo</legend>' +
      '<div class="g-cab campo"><label class="g-rot" for="' + id + '-nome">Grupo</label>' +
      '<input id="' + id + '-nome" type="text" class="f-nome" autocomplete="off" maxlength="60" aria-describedby="' + id + '-nome-ori">' + ajudaBt(id + '-nome', 'Nome do grupo') +
      '<div class="chips" role="group" aria-label="Atalhos de nome">' + ['Vendas', 'Caixa', 'Estoque', 'Produção'].map(function (n) { return '<button type="button" class="chip" data-controle data-nome="' + n + '" aria-pressed="false" aria-describedby="' + id + '-nome-ori">' + n + '</button>'; }).join('') + '</div>' +
      orientaP(id + '-nome', 'Use o nome da função. Ex.: Vendas, Caixa, Estoque.') + '</div>' +
      '<div class="g-grade">' +
      blocoNumero(id + '-pessoas', 'f-pessoas', 'Pessoas no grupo', 'pessoas', { min: 1, max: 9999, ph: '0', ori: 'Quantas pessoas têm exatamente essa escala.' }) +
      blocoNumero(id + '-simult', 'f-simult', 'Quantas precisam trabalhar juntas? (opcional)', 'juntas, no mínimo', { min: 1, max: 9999, ph: '0', opcional: true,
        ori: 'Ex.: a loja nunca fica com menos de 2 vendedoras. Se não souber, deixe em branco.' }) +
      blocoDias(id + '-dias', 'f-dias', 'Dias de trabalho de cada pessoa', 'Toque nos dias em que cada pessoa trabalha. O sábado conta mesmo sendo meio período.') +
      blocoHoras(id + '-horas', 'Horas por semana no contrato, sem o almoço', 'Está no contrato de trabalho. Ex.: segunda a sexta das 8h às 17h, com 1\u00a0hora de almoço, e sábado até 12h dão 44\u00a0horas.') +
      '<div class="linha-discreta campo"><span class="bb-rot-l"><label class="ld-rot" for="' + id + '-custo">Salário médio <span class="ld-obs">(opcional, não fica gravado)</span></label>' + ajudaBt(id + '-custo', 'Salário médio') + '</span>' +
      '<input id="' + id + '-custo" type="text" class="f-custo" inputmode="decimal" autocomplete="off" placeholder="R$ 2.500,00" aria-describedby="' + id + '-custo-ori">' +
      orientaP(id + '-custo', 'Só para mostrar os valores em reais. Não é enviado nem gravado.') + '</div>' +
      '</div>' +
      '<button type="button" class="link-acao remover">Remover este grupo</button>';
    div.querySelector('.remover').addEventListener('click', function () { if (grupoAtivo === div) grupoAtivo = null; div.remove(); atualizarFuncoes(); atualizarPrevia(); });
    $('funcoes').appendChild(div);
    atualizarFuncoes();
    return div;
  }
  // numera os grupos e preenche o nome padrão ("Grupo 1"...) enquanto a pessoa não escreveu outro
  function atualizarFuncoes() {
    var todas = document.querySelectorAll('#funcoes .funcao');
    todas.forEach(function (f, i) {
      var padrao = 'Grupo ' + (i + 1), nome = f.querySelector('.f-nome');
      f.querySelector('.funcao-titulo').textContent = padrao;
      if (!nome.value || /^Grupo \d+$/.test(nome.value)) nome.value = padrao;
      f.querySelector('.remover').hidden = todas.length === 1;
      marcarChips(f);
    });
  }
  function lerEquipe() {
    var ok = true, grupos = [];
    document.querySelectorAll('#funcoes .funcao').forEach(function (f, i) {
      var p = validarInteiro(f.querySelector('.f-pessoas'), 1, 9999, 'quantas pessoas');
      var dCampo = f.querySelector('.f-dias');
      var d = validarInteiro(dCampo, 1, 7, 'os dias de trabalho');
      var h = validarFaixa(f.querySelector('.f-horas'), 1, 60, 'as horas de trabalho na semana');
      var sCampo = f.querySelector('.f-simult'), s = null;
      if (sCampo.value.trim()) { s = validarInteiro(sCampo, 1, 9999, 'quantas pessoas ao mesmo tempo'); if (s == null) s = undefined; } else erro(sCampo, '');
      var cCampo = f.querySelector('.f-custo'), c = lerNumero(cCampo.value);
      if (c != null && (isNaN(c) || c < 0)) { erro(cCampo, 'Use só números, como 2.800.'); c = undefined; } else erro(cCampo, '');
      if (p == null || d == null || h == null || s === undefined || c === undefined) { ok = false; return; }
      grupos.push({ nome: f.querySelector('.f-nome').value.trim() || 'Grupo ' + (i + 1), pessoas: p, dias: d, horas: h, simultaneas: s, salario: c && c > 0 ? c : null, diasSel: diasMarcados(dCampo, d) });
    });
    if (!ok) { focarErro('passo-1'); return null; }
    return grupos;
  }

  // ───────── prévia ao vivo: a mesma função de cálculo do resultado, só com os grupos já preenchidos ─────────
  function lerGrupoPrevia(f) {
    var p = lerNumero(f.querySelector('.f-pessoas').value), dC = f.querySelector('.f-dias'), d = lerNumero(dC.value), h = lerNumero(f.querySelector('.f-horas').value);
    if (!(p >= 1 && p % 1 === 0 && d >= 1 && d <= 7 && h >= 1 && h <= 60)) return null;
    return { nome: f.querySelector('.f-nome').value.trim(), pessoas: p, dias: d, horas: h, diasSel: diasMarcados(dC, d) };
  }
  // semana de uma pessoa: hoje, os dias marcados; depois, os primeiros 5 deles, e o dia que sobra vira folga em revezamento
  function celulasSemana(l, novos, depois) {
    var seq = function (n) { return [0, 1, 2, 3, 4, 5, 6].slice(0, n); };
    var trab = l.diasSel || seq(l.dias), fica = trab.slice(0, novos);
    return DIAS_CURTOS.map(function (dc, i) {
      var cls, rot;
      if (!depois) { cls = trab.indexOf(i) >= 0 ? 't' : 'f'; rot = cls === 't' ? 'trabalho' : 'folga'; }
      else if (fica.indexOf(i) >= 0) { cls = 't'; rot = 'trabalho'; }
      else if (trab.indexOf(i) >= 0) { cls = 'r'; rot = 'vira folga, alternada entre as pessoas'; }
      else { cls = 'f'; rot = 'folga'; }
      return '<span class="sem-d ' + cls + '" role="img" aria-label="' + DIAS_NOMES[i] + ': ' + rot + '">' + dc.charAt(0) + '</span>';
    }).join('');
  }
  function semanaGrade(l, novos) {
    return '<span class="sem-rot">Hoje</span>' + celulasSemana(l, novos, false) + '<span class="sem-rot">Depois</span>' + celulasSemana(l, novos, true);
  }
  function atualizarPrevia() {
    var pv = $('previa'); if (!pv) return;
    var fs = [].slice.call(document.querySelectorAll('#funcoes .funcao')), g = [], ativo = null;
    fs.forEach(function (f) { var x = lerGrupoPrevia(f); if (x) { g.push(x); if (f === grupoAtivo) ativo = x; } });
    pv.classList.toggle('vazia', !g.length);
    if (!g.length) return;
    ativo = ativo || g[0];
    var r = calcular(g, { dias: 0, horas: 0 });
    $('pv-pessoas').textContent = num(r.e1.pessoas); $('pvm-pessoas').textContent = num(r.e1.pessoas);
    $('pv-horas').textContent = num(r.e1.horas); $('pvm-horas').textContent = num(r.e1.horas); $('pvm-horas2').textContent = num(r.e2.horas);
    $('pv-pessoas-leg').textContent = afetadasTxt(r.e1.pessoas);
    $('pv-horas-leg').textContent = (r.e1.horas === 1 ? 'hora' : 'horas') + ' de trabalho a menos por semana, somando a equipe';
    $('pv-depois').textContent = 'Em dezembro de 2026: ' + horasTxt(r.e1.horas) + ' a menos. Em dezembro de 2027: ' + horasTxt(r.e2.horas) + ' a menos.';
    var l = etapa([ativo], { dias: 0, horas: 0 }, 42).linhas[0], l2 = etapa([ativo], { dias: 0, horas: 0 }, 40).linhas[0];
    $('pv-nome').textContent = ativo.nome || 'Grupo';
    $('pv-semana').innerHTML = semanaGrade(l, l.diasNovos);
    var barra = function (rot, h, cls) { return '<div><div class="pvb-lin"><span>' + rot + '</span><span>' + hTxt(h) + '</span></div><div class="pvb-tri"><span class="pvb-val ' + cls + '" style="width:' + Math.round(Math.min(h, 60) / 60 * 100) + '%"></span></div></div>'; };
    $('pv-barras').innerHTML = barra('Hoje', l.horas, 'hoje') + (l.horasNovas === l2.horasNovas ? barra('Dez. 2026 e dez. 2027', l.horasNovas, 'depois')
      : barra('Dez. 2026', l.horasNovas, 'depois') + barra('Dez. 2027', l2.horasNovas, 'depois'));
    var jornada = l.horasNovas === l2.horasNovas ? 'para ' + hTxt(l.horasNovas) + ' por semana' : 'para ' + hTxt(l.horasNovas) + ' em dezembro de 2026 e para ' + hTxt(l2.horasNovas) + ' em dezembro de 2027';
    $('pv-leitura').textContent = !l.muda && !l2.muda ? 'A escala deste grupo já cabe na regra nova.'
      : l.dias > 5 ? 'Hoje cada pessoa trabalha ' + l.dias + '\u00a0dias. Com a regra nova são 5, e o dia que sobra (em terracota) vira folga. As folgas ficam alternadas (cada pessoa folga num dia diferente). As horas de cada pessoa caem ' + jornada + '.'
      : 'Os dias continuam os mesmos. As horas de cada pessoa caem de ' + hTxt(l.horas) + ' ' + jornada + '.';
  }
  // barra da prévia no celular: some no resultado, com o teclado aberto e com o aviso de cookies na tela.
  // Ela traz o próprio botão de continuar, e o fim da página tem espaço livre para o botão do cartão não ficar por baixo dela.
  var tecladoAberto = false;
  function atualizarBarra() {
    var pv = $('previa'); if (!pv) return;
    var aviso = document.querySelector('.ck-aviso');
    var avisoNaTela = aviso && !aviso.hidden && aviso.getBoundingClientRect().height > 0 && getComputedStyle(aviso).display !== 'none';
    var noResultado = !$('passo-3').hidden;
    var foco = document.activeElement;
    tecladoAberto = window.innerWidth < 1024 && !!foco && !!foco.closest && !!foco.closest('#calculadora') && foco.matches('input[type=text], input[type=tel], input[type=email]');
    pv.classList.toggle('escondida', noResultado || tecladoAberto || !!avisoNaTela);
  }

  // datas das etapas: EC 141/2026, publicada em 16/10/2026; art. 6º, I, e art. 10, I: 16/12/2026; art. 6º, II: 16/12/2027 (prazo contado
  // do dia inicial ao dia correspondente do mês, Lei 810/1949). A contagem vai até 00h de cada data no horário de Brasília (UTC-3).
  var ETAPA_DATA = { e1: Date.UTC(2026, 11, 16, 3), e2: Date.UTC(2027, 11, 16, 3) };
  function diasAteEtapa(k) { return Math.ceil((ETAPA_DATA[k || 'e1'] - Date.now()) / 86400000); }

  // ───────── resultado ─────────
  var diasTxt = function (n) { return n + (n === 1 ? '\u00a0dia' : '\u00a0dias'); };
  // número e unidade nunca se separam na quebra de linha (espaço inseparável)
  var hTxt = function (n) { return num(n) + '\u00a0h'; };
  var pct = function (x) { return num(Math.round(x * 1000) / 10) + '%'; };
  var gente = function (n) { return n + (n === 1 ? '\u00a0pessoa' : '\u00a0pessoas'); };
  // faixa de valores: um número só quando o regime é conhecido; "R$ A a R$ B" quando não é
  var faixa = function (v) { return v.length === 1 || Math.round(v[0] * 100) === Math.round(v[1] * 100) ? reais(v[0]) : reais(v[0]) + ' a ' + reais(v[1]); };
  // texto único quando as duas etapas dão o mesmo resultado; senão, uma linha por etapa
  function porEtapa(t1, t2) {
    if (t1 === t2) return '<li><span class="etq">Nas duas datas:</span> ' + t1 + '</li>';
    return '<li><span class="etq">Em dezembro de 2026:</span> ' + t1 + '</li><li><span class="etq">Em dezembro de 2027:</span> ' + t2 + '</li>';
  }

  // quatro números em cartões brancos; "a mais por mês" mostra o custo do caminho indicado
  function blocoResumo(r, c, k) {
    var e = c.e1, custo;
    if (e.dados) custo = { n: '', l: 'Confira os números da equipe e do horário' };
    else if (e.ajuste) custo = { n: reais(0), l: 'a mais por mês, reorganizando a escala' };
    else if (!e.H) custo = { n: reais(0), l: r.e1.pessoas ? 'a mais por mês, com folgas alternadas' : 'a mais por mês' };
    else if (e.contratar) custo = { n: faixa(e.contratar), l: 'a mais por mês no caminho indicado' + (e.semSalario.length ? ', sem contar ' + esc(lista(e.semSalario)) : '') };
    else custo = { n: '', l: 'Informe o salário para ver o custo' };
    var faltam = diasAteEtapa(k);
    var itens = [
      { n: num(r.e1.pessoas), l: afetadasTxt(r.e1.pessoas) },
      { n: num(r.e1.horas), l: r.e1.horas === 1 ? 'hora de trabalho a menos por semana, somando a equipe' : 'horas de trabalho a menos por semana, somando a equipe', terra: true },
      { n: custo.n, l: custo.l, sem: !custo.n },
      faltam > 0 ? { n: diasTxt(faltam), l: k === 'e2' ? 'até a segunda etapa da nova jornada, em 16/12/2027' : 'até a primeira etapa da nova jornada, em 16/12/2026' } : { n: 'já valendo', l: k === 'e2' ? 'segunda etapa da nova jornada, desde 16/12/2027' : 'primeira etapa da nova jornada, desde 16/12/2026' }
    ];
    return itens.map(function (x) {
      return '<div class="res-num-card' + (x.sem ? ' sem-valor' : '') + '">' + (x.n ? '<span class="res-num-val' + (x.terra ? ' terra' : '') + '">' + x.n + '</span>' : '') + '<span class="res-num-leg">' + x.l + '</span></div>';
    }).join('');
  }

  // texto da contratação: "1 pessoa por 20\u00a0horas semanais", "1 pessoa em tempo integral e 1 pessoa por 24\u00a0horas semanais"
  function textoContratacao(e) {
    var partes = [];
    if (e.integrais) partes.push(gente(e.integrais) + ' em tempo integral');
    e.parciais.forEach(function (p) { partes.push('1\u00a0pessoa por ' + p.horas + '\u00a0horas semanais' + (e.comH.length > 1 ? ' (' + esc(p.nome) + ')' : '')); });
    return partes.join(' e ');
  }
  function fraseVirada(c) {
    var v = c.e1.virada;
    if (!v) return '';
    var t = function (m) { return m === 1 ? 'Desde o primeiro mês, contratar sai mais barato que pagar hora extra.' : m ? 'A partir do ' + m + 'º mês, contratar sai mais barato que pagar hora extra.' : 'Em 12 meses, a hora extra continua mais barata. Confira se a necessidade é mesmo permanente.'; };
    if (v.length === 1 || v[0] === v[1]) return t(v[0]);
    return t(v[0]) + ' Com o fator 1,62, ' + (v[1] ? 'contratar sai mais barato a partir do ' + v[1] + 'º mês.' : 'a hora extra continua mais barata em 12 meses.');
  }
  // títulos: palavra curta (artigo, preposição, número) fica presa à palavra seguinte, como no resto do site
  // (duas passadas, para pegar palavras curtas seguidas, como "por 20")
  function prender(t) {
    var re = /(^|\s)(a|o|e|ou|as|os|ao|de|da|do|em|na|no|por|já|com|um|\d+) /gi;
    var f = function (m, a, p) { return a + p + ' '; };
    return t.replace(re, f).replace(re, f);
  }
  // cartão "Recomendação" no topo do resultado: botão principal em creme e, quando há, o secundário com contorno
  var WA_ESCALA = 'https://wa.me/5577981640599?text=' + encodeURIComponent('Olá, Daniela! Usei a calculadora da escala 6x1 e quero conversar sobre a nova escala da minha empresa.');
  // Poucas horas a cobrir (13/11/2026): de 1 a 11 horas por semana (e.ajuste), a recomendação deixa de
  // indicar o corte de horário pelo custo zero, que ignora a venda perdida. Custo por hora coberta = custo mensal do caminho ÷ (horas a
  // cobrir por semana × 4,33), sem o custo único; arredondamento só no fim, em centavos, com meio centavo para cima.
  var arred = function (v) { return Math.round(v * 100 + 1e-6) / 100; };
  function custoPorHora(e) {
    return {
      contratar: e.contratar && e.Hc ? e.contratar.map(function (v) { return arred(v / (e.Hc * 4.33)); }) : null,
      extra: e.extra && e.H ? e.extra.map(function (v) { return arred(v / (e.H * 4.33)); }) : null
    };
  }
  // um valor quando o regime é conhecido; "entre R$ X e R$ Y" com os fatores 1,29 e 1,62
  var faixaHora = function (v) { return v.length === 1 || v[0] === v[1] ? reais(v[0]) : 'entre ' + reais(v[0]) + ' e ' + reais(v[1]); };
  // contratar sai mais barato que a hora extra em 12 meses (com o custo único), em todos os fatores mostrados
  function contratarCompensa(e) {
    return !!(e.contratar && e.extra && e.unico != null && !e.semExtra && e.contratar.every(function (v, i) { return v * 12 + e.unico < e.extra[i] * 12; }));
  }
  // frase da segunda etapa, quando ela tem mais horas a cobrir (só na aba de dez. 2026)
  function segundaEtapa(c) {
    if (!(c.e1.ajuste && !c.e2.dados && c.e2.Hc > c.e1.Hc)) return '';
    return 'Em 16/12/2027 ' + (umaHora(c.e2.Hc) ? 'vai faltar ' : 'vão faltar ') + horasTxt(c.e2.Hc) + ' por semana: contratar antes evita disputar gente com todas as empresas ao mesmo tempo.';
  }
  function textoAjuste(e, depois) {
    var h = horasTxt(e.Hc), p = custoPorHora(e);
    var t = (umaHora(e.Hc) ? 'Falta ' : 'Faltam ') + h + ' por semana. Antes de fechar mais cedo, organize as entradas e as folgas pelo movimento da loja: muitas vezes isso cobre o horário sem custo.';
    if (e.completo && p.contratar) return t + ' Se ainda faltar gente, contratar alguém por ' + h + ' custa cerca de ' + faixaHora(p.contratar) + ' por hora coberta' +
      (p.extra && !e.semExtra ? ', e a hora extra, ' + faixaHora(p.extra) : '') + '. Feche só os horários que dão menos lucro do que isso.' + (depois ? ' ' + depois : '');
    return t + (depois ? ' ' + depois : '') + ' Informe o salário médio no primeiro passo para ver quanto custa cada hora coberta.';
  }
  function tituloRecomendacao(r, c) {
    var e = c.e1;
    if (e.dados) return 'Confira os números da equipe e do horário';
    if (!e.H && !r.e1.pessoas) return 'O horário de hoje já cabe na regra nova';
    if (!e.H) return 'Organize folgas alternadas';
    if (e.ajuste) return 'Reorganize a escala antes de cortar horário';
    return 'Contrate ' + textoContratacao(e) + (e.sobraExtra ? '. ' + textoSobra(e) : '');
  }
  function blocoRecomendacao(r, c, extra) {
    var e = c.e1, txt, botoes;
    var wa = function (cls) { return '<a class="' + cls + '" href="' + WA_ESCALA + '" target="_blank" rel="noopener" data-evento="escala6x1_cta_whatsapp"' + (cls === 'rec-bt2' ? ' data-contorno-aprovado' : '') + '>Conversar sobre a escala</a>'; };
    var eti = '<p class="rec-eti">Recomendação para a sua empresa</p>';
    if (e.dados) return '<div class="rec-corpo">' + eti + '<h3 class="rec-tit">' + prender(tituloRecomendacao(r, c)) + '</h3></div>';
    if (!e.H && !r.e1.pessoas) { txt = 'Pelos dados informados, ninguém precisa mudar de horário. Confira os contratos e a convenção coletiva da sua categoria.'; botoes = wa('rec-bt'); }
    else if (!e.H) {
      // sem o número de pessoas ao mesmo tempo em algum grupo, não dá para afirmar que a equipe cobre o horário (19/10/2026)
      txt = r.e1.linhas.some(function (l) { return !l.simultaneas; })
        ? 'Organize folgas alternadas (cada pessoa folga num dia diferente). Para conferir se a equipe cobre todo o horário, informe quantas pessoas precisam trabalhar juntas.'
        : 'A equipe de hoje dá conta do horário. Basta alternar as folgas (cada pessoa folga num dia diferente), sem contratar.';
      botoes = wa('rec-bt');
    }
    else if (e.ajuste) { txt = textoAjuste(e, extra); botoes = wa('rec-bt'); }
    else {
      txt = e.semExtra ? textoNaoResolve(e.semExtra)
        : e.completo ? fraseVirada(c) + ' Enquanto a seleção acontece, a hora extra cobre as horas que faltam.'
        : 'Informe o salário médio no primeiro passo para ver o custo e em que mês contratar sai mais barato que a hora extra. Enquanto a seleção acontece, a hora extra cobre as horas que faltam.';
      if (e.sobraExtra) txt = textoSobra(e) + ' ' + txt;
      botoes = '<a class="rec-bt" href="https://capitalhumanointelligence.com/recrutamento-e-selecao?utm_source=github&amp;utm_medium=referral&amp;utm_campaign=calculadora-publica" data-evento="escala6x1_cta_recrutamento">Precisa contratar? Conduzimos a seleção</a>' + wa('rec-bt2');
    }
    var tit = e.H && !e.ajuste ? 'Contrate ' + textoContratacao(e) : tituloRecomendacao(r, c);
    return '<div class="rec-corpo">' + eti + '<h3 class="rec-tit">' + prender(tit) + '</h3><p class="rec-txt">' + txt + '</p></div><div class="rec-botoes">' + botoes + '</div>';
  }

  // "Os caminhos, lado a lado": todos cobrem as mesmas horas H
  var REGIME_CURTO = { simples: 'Simples Nacional', geral: 'Lucro Presumido, Lucro Real ou Anexo IV' };
  function subCaminhos(c, regime) {
    var e = c.e1;
    if (e.dados) return '';
    if (!e.H) return 'Pelos dados, não há horas a cobrir';
    return 'Todas as opções resolvem as mesmas ' + horasTxt(e.Hc) + ' por semana · ' + (REGIME_CURTO[regime] || 'regime não informado');
  }
  function blocoCaminhos(r, c, k) {
    var e = c.e1, falta = r.e1.linhas.filter(function (l) { return l.cobertura && l.cobertura.status === 'falta'; });
    if (e.dados) return '<p class="res-txt">Os caminhos aparecem quando os números da equipe e do horário estiverem coerentes. Confira, no primeiro passo, quantas pessoas trabalham ao mesmo tempo e, no segundo, as horas em que a empresa fica aberta.</p>';
    var valor = function (v) { return v ? '<p class="cam-val">' + faixa(v) + '<small> por mês</small></p>' : '<p class="cam-val sem">Informe o salário para ver o valor</p>'; };
    var contratar, extra, revez;
    if (!e.H) contratar = { t: 'Contratar', tag: '', v: '', txt: 'Pelos dados, não é preciso contratar.' };
    else contratar = {
      t: !e.integrais ? 'Contratar alguém em tempo parcial' : !e.parciais.length ? 'Contratar em tempo integral' : 'Contratar',
      v: valor(e.contratar),
      txt: textoContratacao(e).replace(/^./, function (x) { return x.toUpperCase(); }) + (e.parciais.length ? ', com salário proporcional e encargos. Respeite o piso da categoria.' : ', com encargos.') +
        (e.sobraExtra ? (umaHora(e.sobraExtra) ? ' Sobra ' + horasTxt(e.sobraExtra) + ', que fica' : ' Sobram ' + horasTxt(e.sobraExtra) + ', que ficam') + ' com ajuste de horário ou hora extra' + (e.contratar ? ', já somada no valor.' : '.') : '') +
        (e.contratar && e.semSalario.length ? ' O valor não inclui ' + esc(lista(e.semSalario)) + ', sem salário informado.' : '') +
        (falta.length ? ' Outra opção: reduzir em cerca de ' + falta.map(function (l) { return horasTxt(l.cobertura.reduzir) + ' por semana o atendimento de ' + esc(l.nome); }).join(' e em cerca de ') + '.' : '')
    };
    if (!e.H) extra = { t: 'Hora extra', v: '', txt: 'Não há horas a cobrir.' };
    else if (e.semExtra) extra = { t: 'Hora extra', v: '', txt: textoNaoResolve(e.semExtra), naoResolve: true };
    else {
      var porPessoa = e.grupos.filter(function (g) { return g.H > 0; }).map(function (g) { var x = Math.round(g.extrasPorPessoa * 10) / 10; return (e.comH.length > 1 ? esc(g.nome) + ': ' : '') + extrasTxt(x) + ' por pessoa por semana'; }).join('; ');
      extra = { t: 'Hora extra', v: valor(e.extra),
        txt: porPessoa + '. O valor já inclui o reflexo no descanso semanal remunerado. Todo mês, vira custo fixo e risco trabalhista.' +
          (e.excede.length ? ' No grupo ' + esc(lista(e.excede)) + ', passa de 10\u00a0horas por pessoa na semana, acima do limite de 2\u00a0horas extras por dia em 5\u00a0dias: a hora extra sozinha não cobre tudo.' : '') };
    }
    // sempre que faltam horas (de 1 a 11 ou mais), o mesmo cartão e o mesmo texto (20/10/2026)
    if (e.H) revez = { t: 'Ajustar o horário', txt: 'Reduzir ' + horasTxt(e.Hc) + ' de atendimento por semana nos horários de menor movimento. Não aumenta a folha, mas a empresa deixa de vender nesses horários.' };
    else revez = { t: 'Folgas alternadas', txt: 'Alternar as folgas (cada pessoa folga num dia diferente) entre os dias de atendimento e, se preciso, ajustar o horário nos períodos de menos movimento.' };
    revez.v = '<p class="cam-val">' + reais(0) + '<small> por mês</small></p>';
    var indicaContratar = e.H > 0 && !e.ajuste;
    // poucas horas (13/11/2026): o selo vai para contratar só quando sai mais barato que a hora extra em 12 meses; senão, nenhum selo
    var poucas = e.H > 0 && e.ajuste, seloContratar = indicaContratar || (poucas && contratarCompensa(e));
    contratar.tag = seloContratar ? 'ind' : '';
    extra.tag = extra.naoResolve ? 'nao' : e.H > 0 ? (k === 'e2' ? 'mensal' : 'trans') : '';
    revez.tag = indicaContratar || poucas ? 'sem' : (r.e1.pessoas > 0 || e.H > 0 ? 'ind' : 'sem');
    var ETQ = { ind: 'Indicado para o seu caso', trans: 'Serve para a transição', mensal: 'Vira custo fixo', nao: 'Não cobre o horário', sem: 'Não aumenta a folha' };
    var ordem = seloContratar ? [contratar, extra, revez] : [revez, contratar, extra];
    return '<div class="caminhos-cards">' + ordem.map(function (x) {
      return '<div class="cam-card' + (x.tag === 'ind' ? ' indicado' : '') + '">' + (x.tag ? '<span class="cam-tag ' + x.tag + '">' + ETQ[x.tag] + '</span>' : '') +
        '<h4 class="cam-tit">' + x.t + '</h4>' + (x.v || '') + '<p class="cam-txt">' + x.txt + '</p></div>';
    }).join('') + '</div>';
  }

  // gráfico de 12 meses: hora extra (terracota) e contratar (verde), com a virada marcada e a economia em 12 meses abaixo
  function grafico(c) {
    var e = c.e1, cel = window.innerWidth < 600;
    var W = cel ? 360 : 760, Hh = cel ? 240 : 250, L = cel ? 46 : 52, R = cel ? 12 : 40, T = 26, B = 30;
    var he = [], ct = [];
    for (var m = 1; m <= 12; m++) { he.push(e.extra[0] * m); ct.push(e.contratar[0] * m + e.unico); }
    var max = Math.max.apply(null, he.concat(ct));
    var passo = Math.pow(10, Math.floor(Math.log10(max / 3))), deg = Math.ceil(max / 3 / passo) * passo, topo = deg * 3;
    var x = function (m) { return L + (m - 1) * (W - L - R) / 11; }, y = function (v) { return T + (Hh - T - B) * (1 - v / topo); };
    var rotY = function (v) { return !v ? '0' : v >= 1000 ? num(Math.round(v / 100) / 10) + ' mil' : reaisInteiros(v); };
    var s = '';
    for (var g = 0; g <= 3; g++) { var v = deg * g; s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="' + (g ? '#EEE9DF' : '#D9D2C4') + '" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="12" fill="#5B6660">' + rotY(v) + '</text>'; }
    [1, 4, 7, 10, 12].forEach(function (mm) { s += '<text x="' + x(mm).toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="' + (mm === 1 ? 'start' : mm === 12 ? 'end' : 'middle') + '" font-size="12" fill="#5B6660">' + (mm === 1 ? 'mês 1' : mm) + '</text>'; });
    var vir = e.virada && e.virada[0];
    // rótulo da virada sempre inteiro dentro do gráfico: à direita da linha, à esquerda ou, se não couber, em duas linhas (28/10/2026)
    if (vir) {
      var larg = function (t) { return t.length * 6.2; }, xv = x(vir), rot = vir + 'º mês: contratar sai mais barato', yr = cel ? y(0) - 8 : T + 12;
      var lado = function (t) { return xv + 6 + larg(t) <= W - R ? ['start', xv + 6] : xv - 6 - larg(t) >= 4 ? ['end', xv - 6] : null; };
      var um = lado(rot), dois = um ? null : lado('contratar sai mais barato') || ['start', Math.max(4, Math.min(xv + 6, W - R - larg('contratar sai mais barato')))];
      s += '<line x1="' + xv.toFixed(1) + '" x2="' + xv.toFixed(1) + '" y1="' + T + '" y2="' + y(0).toFixed(1) + '" stroke="#A55028" stroke-width="1" stroke-dasharray="4 4"/>' +
        (um ? '<text x="' + um[1].toFixed(1) + '" y="' + yr + '" text-anchor="' + um[0] + '" font-size="12" font-weight="600" fill="#7E3415">' + rot + '</text>'
          : '<text x="' + dois[1].toFixed(1) + '" y="' + (cel ? yr - 15 : yr) + '" text-anchor="' + dois[0] + '" font-size="12" font-weight="600" fill="#7E3415"><tspan>' + vir + 'º mês:</tspan><tspan x="' + dois[1].toFixed(1) + '" dy="15">contratar sai mais barato</tspan></text>');
    }
    var linha = function (pts, cor) { return '<polyline fill="none" stroke="' + cor + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + pts.map(function (v, i) { return x(i + 1).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ') + '"/>'; };
    s += linha(he, '#A55028') + linha(ct, '#223A2E');
    var cima = he[11] >= ct[11];
    // o valor da linha de baixo fica abaixo dela em toda a largura do rótulo (a linha sobe da esquerda para a direita)
    var abaixo = function (vals, txt) {
      var m = 12 - (8 + txt.length * 6.6) / ((W - L - R) / 11), i = Math.max(0, Math.floor(m) - 1), v = vals[i] + (vals[Math.min(11, i + 1)] - vals[i]) * (m - 1 - i);
      return Math.min(y(0) - 4, Math.max(y(vals[11]) + 19, y(v) + 15));
    };
    var rHe = reaisInteiros(he[11]), rCt = reaisInteiros(ct[11]);
    s += '<g class="fim"><circle cx="' + x(12).toFixed(1) + '" cy="' + y(he[11]).toFixed(1) + '" r="5" fill="#A55028"/><circle cx="' + x(12).toFixed(1) + '" cy="' + y(ct[11]).toFixed(1) + '" r="5" fill="#223A2E"/>' +
      '<text x="' + (x(12) - 8).toFixed(1) + '" y="' + (cima ? y(he[11]) - 9 : abaixo(he, rHe)).toFixed(1) + '" text-anchor="end" font-size="12" font-weight="600" fill="#7E3415">' + rHe + '</text>' +
      '<text x="' + (x(12) - 8).toFixed(1) + '" y="' + (cima ? abaixo(ct, rCt) : y(ct[11]) - 9).toFixed(1) + '" text-anchor="end" font-size="12" font-weight="600" fill="#223A2E">' + rCt + '</text></g>';
    var dif = he[11] - ct[11];
    var desc = 'Custo acumulado em 12 meses. Hora extra: ' + reais(he[11]) + '. Contratar: ' + reais(ct[11]) + '.' + (vir ? ' Contratar sai mais barato a partir do ' + vir + 'º mês.' : '');
    return '<h3>Custo acumulado em 12 meses' + (c.fator.length > 1 ? ' (com o fator 1,29)' : '') + '</h3>' +
      '<div class="proj-leg"><span><i style="background:#A55028"></i>Hora extra</span><span><i style="background:#223A2E"></i>Contratar (inclui ' + reaisInteiros(e.unico) + ' de contratação)</span></div>' +
      '<svg class="proj-svg" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + desc + '">' + s + '</svg>' +
      '<p class="proj-txt">' + (dif > 0 ? 'Em 12 meses, contratar economiza cerca de <strong>' + reaisInteiros(Math.round(dif)) + '</strong> em relação à hora extra.' : 'Em 12 meses, a hora extra continua mais barata. Confira se a necessidade é mesmo permanente.') + '</p>';
  }

  // cartão de cada grupo: semana de hoje e de depois, barras de horas e o custo da hora
  function blocoGrupos(r, k) {
    return r[k].linhas.map(function (l) {
      var sobra = (l.diasSel || [0, 1, 2, 3, 4, 5, 6].slice(0, l.dias)).length > l.diasNovos;
      var max = 60;
      var b = function (rot, h, cls) { return '<div><div class="gb-lin"><span>' + rot + '</span><strong>' + hTxt(h) + '</strong></div><div class="gb-tri"><span class="gb-val ' + cls + '" style="width:' + Math.round(Math.min(h, max) / max * 100) + '%"></span></div></div>'; };
      var barrasHtml = b('Hoje', l.horas, '') + b(k === 'e2' ? 'Dez. 2027' : 'Dez. 2026', l.horasNovas, 'depois');
      return '<section class="r-card g-card"><h3>' + esc(l.nome) + ' · ' + gente(l.pessoas) + '</h3>' +
        '<div class="r-semana" role="group" aria-label="Semana de cada pessoa do grupo ' + esc(l.nome) + ', hoje e depois">' + semanaGrade(l, l.diasNovos) + '</div>' +
        (sobra ? '<p class="g-nota">Em terracota, o dia que vira folga. As folgas ficam alternadas (cada pessoa folga num dia diferente).</p>' : '') +
        '<div class="g-barras" aria-label="Horas por semana de cada pessoa">' + barrasHtml + '</div>' +
        (l.muda && l.aumento > 0.0005 ? '<div class="g-rodape"><p>Você paga o mesmo salário por menos horas: cada hora trabalhada sai <strong>' + pct(l.aumento) + ' mais cara</strong>.</p></div>' : '') +
        '</section>';
    }).join('');
  }

  // "O que muda", "Onde olhar" e "Quanto custa", em três colunas
  function textoMuda(l) {
    if (!l.muda) return 'Nada muda: o horário de hoje já cabe na regra nova.';
    var um = l.pessoas === 1;
    if (l.dias > 5) return gente(l.pessoas) + (um ? ' passa' : ' passam') + ' de ' + l.dias + ' para 5\u00a0dias por semana, com ' + hTxt(l.horasNovas) + ' por semana.';
    return gente(l.pessoas) + (um ? ' passa' : ' passam') + ' de ' + hTxt(l.horas) + ' para ' + hTxt(l.horasNovas) + ' por semana, nos mesmos dias.';
  }
  // as frases de "O que muda" já têm dois-pontos: a etapa entra como frase curta antes delas
  function mudaPorEtapa(t1, t2) {
    if (t1 === t2) return '<li><span class="etq">Nas duas datas:</span> ' + t1 + '</li>';
    return '<li><span class="etq">Em dezembro de 2026:</span> ' + t1 + '</li><li><span class="etq">Em dezembro de 2027:</span> ' + t2 + '</li>';
  }
  function blocoMuda(r) {
    var p1 = r.e1.pessoas, p2 = r.e2.pessoas;
    var afet = function (n) { return gente(n) + (n === 1 ? ' vai trabalhar menos horas ou ganhar uma folga a mais' : ' vão trabalhar menos horas ou ganhar uma folga a mais'); };
    var html = '<p class="res-txt">' + (!p1 && !p2 ? 'Pelas informações preenchidas, nada muda para a equipe nas duas datas.'
      : p1 === p2 ? 'Nas duas datas, ' + afet(p1) + '.'
      : 'Em dezembro de 2026, ' + afet(p1) + '. Em dezembro de 2027, ' + gente(p2) + '.') + '</p>';
    html += r.e1.linhas.map(function (l, i) {
      var l2 = r.e2.linhas[i];
      return '<div class="cob"><p class="cob-nome">' + esc(l.nome) + '</p><ul><li><span class="etq">Hoje:</span> ' + diasTxt(l.dias) + ', ' + hTxt(l.horas) + ' por semana.</li>' + mudaPorEtapa(textoMuda(l), textoMuda(l2)) + '</ul></div>';
    }).join('');
    return html;
  }
  function textoCobertura(c) {
    if (c.status === 'dados') return c.motivo === 'pessoas' ? 'O número de pessoas que precisam trabalhar juntas é maior que o número de pessoas do grupo. Confira os números.'
      : 'As horas abertas passam de 24 por dia aberto. Confira os números.';
    if (c.status === 'abaixo') return (c.porDias ? 'Hoje a equipe soma ' + diasTxt(c.diasHoje) + ' de trabalho por semana, e o horário pede ' + diasTxt(c.necDias) + ' para ter ' + gente(c.s) + ' juntas.'
      : 'Hoje a equipe soma ' + horasTxt(c.hoje) + ' por semana, e o horário pede ' + horasTxt(c.nec) + ' para ter ' + gente(c.s) + ' juntas.') +
      ' Na prática, a empresa já funciona com menos gente em parte do horário. Por isso, comparamos com o que a equipe faz hoje.';
    if (c.status === 'cobre') return 'A equipe ainda dá conta do horário, desde que as folgas sejam alternadas (cada pessoa folga num dia diferente).';
    if (c.faltaDias) return 'Com 5\u00a0dias por pessoa, ' + (c.faltaDias === 1 ? 'falta ' : 'faltam ') + diasTxt(c.faltaDias) + ' de trabalho por semana para ter ' + gente(c.s) + ' juntas em todos os dias abertos.';
    return (umaHora(c.deficit) ? 'Falta cerca de ' : 'Faltam cerca de ') + horasTxt(c.deficit) + ' por semana para ter gente em todo o horário. Seria preciso contratar ' + gente(c.contratar) + ' ou reduzir o atendimento em cerca de ' + horasTxt(c.reduzir) + ' por semana.';
  }
  function blocoOlhar(r, empresa) {
    var html = '';
    if (r.revezamento) html += '<p class="res-txt alerta-txt">A empresa abre ' + empresa.dias + '\u00a0dias e cada pessoa trabalha no máximo 5: será preciso alternar as folgas (cada pessoa folga num dia diferente).</p>';
    var comCob = r.e1.linhas.filter(function (l) { return l.cobertura; });
    html += comCob.map(function (l) {
      var l2 = r.e2.linhas.filter(function (x) { return x.nome === l.nome && x.pessoas === l.pessoas && x.horas === l.horas; })[0] || l;
      var c = l.cobertura;
      return '<div class="cob"><p class="cob-nome">' + esc(l.nome) + ' · gente para atender</p>' +
        (c.status === 'abaixo' || c.status === 'dados' ? '<p class="res-txt">' + textoCobertura(c) + '</p>'
        : '<ul><li><span class="etq">Para ter ' + gente(l.simultaneas) + ' juntas:</span> ' + hTxt(c.nec) + ' por semana (' + num(empresa.horas) + '\u00a0h abertas × ' + l.simultaneas + '). Hoje a equipe soma ' + hTxt(c.hoje) + '.</li>' +
          porEtapa(textoCobertura(c), textoCobertura(l2.cobertura)) + '</ul>') + '</div>';
    }).join('');
    var fora = r.e1.linhas.filter(function (l) { return !l.simultaneas; }).map(function (l) { return l.nome; });
    if (fora.length && comCob.length) html += '<p class="res-txt">Ficaram fora desta conta, porque não têm o número de pessoas que precisam trabalhar juntas: ' + esc(lista(fora)) + '.</p>';
    if (!comCob.length) html += '<p class="res-txt">Para saber se vai ter gente para atender, informe no primeiro passo quantas pessoas de cada grupo precisam trabalhar juntas.</p>';
    return html;
  }
  function linhaPerda(e) {
    return e.horas ? hTxt(e.horas) + ' de trabalho por semana deixam de existir, somando a equipe.' : 'nenhuma hora de trabalho deixa de existir.';
  }
  function blocoCusto(r, c, regime) {
    var e = c.e1, temSalario = r.e1.linhas.some(function (l) { return l.salario; });
    var html = '<ul>' + (r.e1.horas === r.e2.horas
      ? '<li><span class="etq">Nas duas datas:</span> ' + (r.e1.horas ? hTxt(r.e1.horas) + ' de trabalho por semana deixam de existir, somando a equipe.' : 'nenhuma hora de trabalho deixa de existir.') + '</li>'
      : porEtapa(linhaPerda(r.e1), linhaPerda(r.e2))) + '</ul>';
    if (r.e1.pessoas) html += '<p class="res-txt">Com convenção ou acordo coletivo, as folgas podem ser compensadas em prazo maior que a semana ou o mês, desde que se preservem dois descansos por semana no total, um deles de preferência no domingo. A calculadora não considera essa compensação. Confirme com o seu contador ou sindicato.</p>';
    if (!e.dados && temSalario && e.H > 0) {
      var reg = regime === 'simples' ? 'no Simples Nacional (exceto Anexo IV), com fator 1,29' : regime === 'geral' ? 'no Simples Nacional Anexo IV, no Lucro Presumido ou no Lucro Real, com fator 1,62' : 'entre o fator 1,29 (Simples Nacional, exceto Anexo IV) e o fator 1,62 (Anexo IV, Lucro Presumido ou Lucro Real), porque o regime não foi informado';
      html += '<p class="res-txt">Os valores em reais incluem os encargos estimados ' + reg + ': 13º, férias com o terço e FGTS' + (regime === 'simples' ? '' : (regime === 'geral' ? ', mais INSS patronal, RAT e terceiros' : '; fora do Simples, também INSS patronal, RAT e terceiros')) + '. Não incluem benefícios, como vale-transporte, alimentação e plano de saúde, nem a multa do FGTS. ' + (e.parciais.length ? 'Para contratar (seleção, admissão e treinamento), a conta soma 1 salário inteiro no primeiro mês, também no tempo parcial. No tempo parcial, o salário de cada mês é proporcional às horas contratadas.' : 'Para contratar (seleção, admissão e treinamento), a conta soma 1 salário inteiro por pessoa no primeiro mês.') + ' Confirme os valores com o seu contador.</p>';
    } else if (!e.dados && !temSalario && e.H > 0) {
      html += '<p class="res-txt">Informe o salário médio no primeiro passo para ver os valores em reais de cada caminho e a projeção de 12 meses.</p>';
    }
    return html;
  }

  var semMovimento = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var animacoes = [];
  // sobe cada número do texto de 0 até o valor final, mantendo o formato (R$, pontos de milhar, casas decimais)
  function contar(el) {
    var final = el.textContent, partes = final.split(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/);
    if (partes.length < 2) return;
    var valores = partes.map(function (p, i) { return i % 2 ? { v: parseFloat(p.replace(/\./g, '').replace(',', '.')), dec: (p.split(',')[1] || '').length, mil: p.indexOf('.') >= 0 } : null; });
    var fmt = function (x, k) { var n = x.v * k; return x.dec ? n.toLocaleString('pt-BR', { minimumFractionDigits: x.dec, maximumFractionDigits: x.dec }) : (x.mil ? Math.round(n).toLocaleString('pt-BR') : String(Math.round(n))); };
    var ini = null, dur = 800, a = { el: el, final: final, id: 0 };
    var passo = function (t) {
      if (ini == null) ini = t;
      var k = Math.min(1, (t - ini) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k >= 1 ? final : partes.map(function (p, i) { return i % 2 ? fmt(valores[i], e) : p; }).join('');
      if (k < 1) a.id = requestAnimationFrame(passo);
    };
    a.id = requestAnimationFrame(passo);
    animacoes.push(a);
  }
  // termina as animações na hora (antes de imprimir e ao montar outro resultado)
  function terminarAnimacoes() { animacoes.forEach(function (a) { cancelAnimationFrame(a.id); a.el.textContent = a.final; }); animacoes = []; }
  function animarResultado() {
    // (o painel da aba aberta; a outra aba anima quando for aberta)
    terminarAnimacoes();
    if (semMovimento()) return;
    var p = document.querySelector('.etapa-pane:not([hidden])'); if (!p) return;
    p.querySelectorAll('.res-num-val').forEach(contar);
    var g = p.querySelector('.proj-svg');
    if (g) {
      g.querySelectorAll('polyline').forEach(function (p) { var n = Math.ceil(p.getTotalLength()); p.style.strokeDasharray = n; p.style.strokeDashoffset = n; });
      g.classList.add('anima');
    }
  }


  // ───────── respostas rápidas (19/10/2026): 4 perguntas do dono, antes das abas ─────────
  // reais inteiros, arredondados ao real mais próximo ("cerca de R$ 1.613")
  var reaisCerca = function (v) { var a = Math.round(v[0] + 1e-9), b = v.length > 1 ? Math.round(v[1] + 1e-9) : a; return a === b ? reaisInteiros(a) : reaisInteiros(a) + ' a ' + reaisInteiros(b); };
  // nas respostas rápidas, cada etapa pela data exata (29/10/2026)
  var DESDE = { e1: 'A partir de 16/12/2026', e2: 'A partir de 16/12/2027' };
  function textoNaoResolve(g) { return 'Hora extra não resolve: ' + (g.faltaDias === 1 ? 'falta ' : 'faltam ') + diasTxt(g.faltaDias) + ' de trabalho por semana para ter ' + gente(g.juntas) + ' juntas em todos os dias abertos. Só contratando ou fechando nesses dias.'; }
  function textoSobra(e) { return e.sobraExtra ? (umaHora(e.sobraExtra) ? 'Sobra ' + horasTxt(e.sobraExtra) + ', que fica' : 'Sobram ' + horasTxt(e.sobraExtra) + ', que ficam') + ' com ajuste de horário ou hora extra.' : ''; }
  function respostaContratar(r, c, k) {
    var e = c[k], tit = DESDE[k] + ', ';
    if (e.dados) return tit + 'confira os números da equipe e do horário.';
    if (!e.H && !r[k].pessoas) return tit + 'não: o horário de hoje já cabe na regra nova.';
    if (!e.H) return tit + 'não: alternando as folgas, a equipe continua cobrindo o atendimento.';
    // poucas horas (15/11/2026): coerente com a recomendação "Reorganize a escala antes de cortar horário"
    if (e.ajuste) return tit + 'ainda não: reorganize a escala antes de cortar horário.' +
      (e.completo && e.contratar ? ' Se ainda faltar gente, 1 pessoa por ' + horasTxt(e.Hc) + ' por semana custa cerca de ' + reaisCerca(e.contratar) + ' por mês.' : '');
    var partes = [];
    if (e.integrais) partes.push(gente(e.integrais) + ' em tempo integral');
    e.parciais.forEach(function (p) { partes.push('1\u00a0pessoa em tempo parcial, ' + horasTxt(p.horas) + ' por semana' + (e.comH.length > 1 ? ' (' + esc(p.nome) + ')' : '')); });
    return tit + 'sim: ' + partes.join(' e ') + (e.contratar ? ', cerca de ' + reaisCerca(e.contratar) + ' por mês' : '') + '.' + (e.sobraExtra ? ' ' + textoSobra(e) : '');
  }
  // mesma resposta nas duas etapas, numa frase só (29/10/2026)
  function contratarDuas(e, pessoas) {
    if (e.dados) return 'Confira os números da equipe e do horário.';
    if (!e.H && !pessoas) return 'Não, nas duas etapas: o horário de hoje já cabe na regra nova.';
    if (!e.H) return 'Não, nas duas etapas. Alternando as folgas, a equipe continua cobrindo o atendimento.';
    if (e.ajuste) return 'Ainda não, nas duas etapas: reorganize a escala antes de cortar horário.';
    var partes = [], n = e.integrais + e.parciais.length;
    if (e.integrais) partes.push((e.integrais === 1 ? 'uma pessoa' : gente(e.integrais)) + ' em tempo integral');
    e.parciais.forEach(function (q) { partes.push('uma pessoa em tempo parcial (' + horasTxt(q.horas) + ' por semana' + (e.comH.length > 1 ? ', ' + esc(q.nome) : '') + ')'); });
    var t = partes.join(' e ');
    return t.charAt(0).toUpperCase() + t.slice(1) + (n === 1 ? ' cobre' : ' cobrem') + ' as duas etapas' + (e.contratar ? ', por cerca de ' + reaisCerca(e.contratar) + ' por mês' : '') + '.' + (e.sobraExtra ? ' ' + textoSobra(e) : '');
  }
  function respostasRapidas(r, c, empresa) {
    var Y1 = r.e1.horas, Y2 = r.e2.horas, p = r.e1.pessoas;
    // a) uma frase por etapa, cada uma comparando com hoje; com zero, a frase diz que as horas cabem (29/10/2026)
    var a = !Y1 && !Y2 ? (p ? 'Não. As horas cabem na regra nova. Muda a folga: ' + gente(p) + (p === 1 ? ' passa' : ' passam') + ' a ter 2 folgas por semana.' : 'Não. O horário de hoje já cabe na regra nova.')
      : 'Sim. ' + DESDE.e1 + ', ' + (Y1 ? 'a equipe trabalha, no total, ' + horasTxt(Y1) + ' a menos por semana' : 'as horas da equipe cabem na regra nova' + (p ? ' e muda só a folga' : '')) + '. ' +
        DESDE.e2 + ', ' + (Y2 ? horasTxt(Y2) + ' a menos' + (Y1 ? '' : ' por semana, no total') : 'nada mais muda') + '.';
    // b) gente para atender
    var comCob = r.e1.linhas.filter(function (l) { return l.cobertura; }), b;
    if (!comCob.length) b = '';
    else if (c.e1.dados || c.e2.dados) b = 'Confira os números: ' + textoCobertura(comCob.filter(function (l) { return l.cobertura.status === 'dados'; })[0].cobertura).replace(' Confira os números.', '');
    else {
      var abaixo = comCob.filter(function (l) { return l.cobertura.status === 'abaixo'; })[0];
      var h1 = c.e1.Hc, h2 = c.e2.Hc;
      var falta = !h1 && !h2 ? 'Sim, se as folgas forem alternadas (cada pessoa folga num dia diferente).'
        : h1 && h2 ? DESDE.e1 + ', ' + faltamTxt(h1) + ' por semana. ' + DESDE.e2 + ', ' + horasTxt(h2) + '.'
        : h1 ? DESDE.e1 + ', ' + faltamTxt(h1) + ' por semana. ' + DESDE.e2 + ', nenhuma hora falta.'
        : DESDE.e1 + ', sim. ' + DESDE.e2 + ', ' + faltamTxt(h2) + ' por semana.';
      b = (abaixo ? 'Hoje a equipe já não preenche todo o horário com ' + gente(abaixo.cobertura.s) + ' juntas, então a conta compara com o que ela faz hoje. ' : '') + falta;
    }
    // c) contratar
    var sem = function (t) { return t.replace(/^A partir de 16\/12\/202[67], /, ''); };
    var cc = sem(respostaContratar(r, c, 'e1')) === sem(respostaContratar(r, c, 'e2')) ? contratarDuas(c.e1, r.e1.pessoas) : respostaContratar(r, c, 'e1') + ' ' + respostaContratar(r, c, 'e2');
    // d) hora extra: uma frase quando as duas etapas dão a mesma resposta; senão, uma por etapa (29/10/2026)
    var extra = function (k) {
      var e = c[k];
      if (!e.H) return 'não vai precisar.';
      if (e.dados) return 'confira os números da equipe e do horário.';
      if (e.semExtra) { var t = textoNaoResolve(e.semExtra); return t.charAt(0).toLowerCase() + t.slice(1); }
      var x = Math.max.apply(null, e.grupos.filter(function (g) { return g.H > 0; }).map(function (g) { return Math.round(g.extrasPorPessoa * 10) / 10; }));
      return 'cada pessoa faria ' + extrasTxt(x) + ' por semana' + (e.extra ? ', cerca de ' + reaisCerca(e.extra) + ' por mês' : '') + '.' +
        (e.excede.length ? ' Só com hora extra não dá: o limite é de 2\u00a0horas extras por dia.' : '') +
        (e.completo && e.virada ? ' ' + fraseVirada(vista(c, k)) : '');
    };
    var d;
    if (!c.e1.H && !c.e2.H) d = 'Não vai precisar em nenhuma das duas etapas.';
    else if (extra('e1') === extra('e2')) d = 'Nas duas etapas, ' + extra('e1');
    else d = DESDE.e1 + ', ' + extra('e1') + ' ' + DESDE.e2 + ', ' + extra('e2');
    var q = function (pergunta, resposta) { return '<div class="resp-item"><dt>' + pergunta + '</dt><dd>' + resposta + '</dd></div>'; };
    return '<h3 id="resp-tit">Respostas rápidas</h3><dl class="resp-lista">' +
      q('Minha equipe vai trabalhar menos?', a) + (b ? q('Vou ter gente para atender?', b) : '') + q('Preciso contratar? Quantas pessoas?', cc) + q('E se eu pagar hora extra?', d) + '</dl>';
  }
  var vista = function (o, k) { var v = {}; for (var x in o) v[x] = o[x]; v.e1 = o[k]; return v; };
  var ETAPA_TIT = { e1: 'Em dezembro de 2026 (até 42 horas por semana)', e2: 'Em dezembro de 2027 (até 40 horas por semana)' };
  function painel(r, c, k, regime, extra) {
    var rv = vista(r, k), cv = vista(c, k);
    var temGraf = !cv.e1.dados && cv.e1.H > 0 && cv.e1.completo && !cv.e1.semExtra;
    var tit = ETAPA_TIT[k];
    // a regra de cada etapa já está na premissa acima das abas (sem a nota do cenário, que existia por causa da convenção)
    return '<h3 class="pane-tit">' + tit + '</h3>' +
      '<section class="rec" aria-label="Recomendação">' + blocoRecomendacao(rv, cv, extra) + '</section>' +
      '<div class="res-resumo" aria-label="Resumo">' + blocoResumo(rv, cv, k) + '</div>' +
      '<section class="r-card"><div class="r-cab"><h3>Os caminhos, lado a lado</h3><p class="r-sub">' + subCaminhos(cv, regime) + '</p></div>' + blocoCaminhos(rv, cv, k) + '</section>' +
      '<div class="r-duas">' + (temGraf ? '<section class="r-card r-graf">' + grafico(cv) + '</section>' : '') +
      '<div class="r-grupos' + (temGraf ? '' : ' sozinho') + '">' + blocoGrupos(r, k) + '</div></div>';
  }
  // horas que a equipe passa a trabalhar a menos por semana em cada etapa (11/11/2026), sem dizer "0 horas"
  function linhaEtapas(r) {
    var x = r.e1.horas, y = r.e2.horas, frase = 'A equipe passa a trabalhar ';
    if (!x && !y) return 'Pelos dados informados, a equipe não precisa trabalhar menos horas em nenhuma das duas etapas.';
    if (x === y) return frase + horasTxt(x) + ' a menos por semana nas duas etapas.';
    if (!x) return frase + horasTxt(y) + ' a menos por semana a partir de 16/12/2027.';
    return frase + horasTxt(x) + ' a menos por semana a partir de 16/12/2026 e ' + horasTxt(y) + ' a menos a partir de 16/12/2027.';
  }
  function abrirAba(k, foco) {
    ['e1', 'e2'].forEach(function (x) {
      var aba = $('aba-' + x), on = x === k;
      aba.setAttribute('aria-selected', on ? 'true' : 'false'); aba.tabIndex = on ? 0 : -1;
      $('pane-' + x).hidden = !on;
    });
    if (foco) $('aba-' + k).focus();
    animarResultado();
  }
  function mostrarResultado(grupos, empresa) {
    var regime = ($('emp-regime') || {}).value || '';
    var r = calcular(grupos, empresa), c = custos(r, regime);
    resultado = { empresa: empresa, funcoes: grupos, r: r, c: c, regime: regime };
    $('pane-e1').innerHTML = painel(r, c, 'e1', regime, segundaEtapa(c));
    $('pane-e2').innerHTML = painel(r, c, 'e2', regime, '');
    $('res-linha').textContent = linhaEtapas(r);
    $('res-respostas').innerHTML = respostasRapidas(r, c, empresa);
    $('res-muda').innerHTML = blocoMuda(r);
    $('res-olhar').innerHTML = blocoOlhar(r, empresa);
    $('res-custo').innerHTML = blocoCusto(r, c, regime);
    $('res-data').textContent = new Date().toLocaleDateString('pt-BR');
    $('po-etapas').innerHTML = ['e1', 'e2'].map(function (k) {
      var p = $('pane-' + k), tit = p.querySelector('.pane-tit'), rt = p.querySelector('.rec-tit'), tx = p.querySelector('.rec-txt');
      return '<div class="po-etapa"><h3>' + esc(tit ? tit.textContent : '') + '</h3><p><strong>' + esc(rt ? rt.textContent : '') + '.</strong>' + (tx ? ' ' + esc(tx.textContent) : '') + '</p></div>';
    }).join('');
    // eventos dos botões da recomendação (montados agora)
    document.querySelectorAll('.etapa-pane .rec a[data-evento]').forEach(function (a) { a.addEventListener('click', function () { ev(a.getAttribute('data-evento'), { transport_type: 'beacon' }); }); });
    // chamada: WhatsApp com o resumo (sem dados pessoais)
    var msg = 'Olá, Daniela! Usei a calculadora da escala 6x1 e quero ajuda para montar a nova escala.' +
      '\nPessoas com menos horas ou uma folga a mais: ' + r.e1.pessoas + '\nHoras de trabalho que deixam de existir por semana: ' + num(r.e1.horas) + ' em dez. 2026 e ' + num(r.e2.horas) + ' em dez. 2027';
    $('cta-agendar').href = 'https://wa.me/5577981640599?text=' + encodeURIComponent(msg);
    irPasso(3);
    abrirAba('e1', false);
    ev('escala6x1_resultado', { pessoas_mudam: r.e1.pessoas, horas_perdidas: r.e1.horas, pessoas_mudam_40: r.e2.pessoas, horas_perdidas_40: r.e2.horas, funcoes: grupos.length });
  }


  // ───────── justificado no celular (13/11/2026): nesta página o corpo de texto é justificado também abaixo de 600 px ─────────
  // O js/alinhamento.js (comum ao site) só trabalha a partir de 600 px; abaixo disso, este trecho faz o mesmo nesta página:
  // parágrafo curto (menos de 120 caracteres) fica à esquerda, e volta a justificar se o texto crescer.
  var curtosAgendado = false;
  function curtosCelular() {
    curtosAgendado = false;
    if (!document.documentElement.hasAttribute('data-justifica-celular') || !(window.matchMedia && window.matchMedia('(max-width: 599px)').matches)) return;
    document.querySelectorAll('body *:not(script):not(style)').forEach(function (e) {
      var marcado = e.getAttribute('data-curto') === '1';
      if (!marcado && getComputedStyle(e).textAlign !== 'justify') return;
      var n = (e.textContent || '').replace(/\s+/g, ' ').trim().length;
      if (n > 0 && n < 120) { if (!marcado) { e.style.textAlign = 'left'; e.setAttribute('data-curto', '1'); } }
      else if (marcado) { e.style.textAlign = ''; e.removeAttribute('data-curto'); }
    });
  }
  function agendarCurtos() { if (!curtosAgendado) { curtosAgendado = true; requestAnimationFrame(curtosCelular); } }

  // ───────── ligações ─────────
  if (!EM_NODE) document.addEventListener('DOMContentLoaded', function () {
    agendarCurtos();
    new MutationObserver(agendarCurtos).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', agendarCurtos);
    var calc = $('calculadora');
    if (!calc) return;
    calc.addEventListener('input', marcarInicio, { once: true });
    calc.addEventListener('focusin', marcarInicio, { once: true });
    novaFuncao();
    ligarControles(calc);
    ligarOrientacoes(calc);
    montarHorarios();
    $('hor-alternar').addEventListener('click', alternarDias);
    $('passo-2').addEventListener('input', function (e) { if (e.target.closest('.horarios')) calcularHorarios(); });
    $('passo-2').addEventListener('change', function (e) { if (e.target.closest('.horarios')) calcularHorarios(); });
    calc.addEventListener('input', atualizarPrevia);
    var dAte = diasAteEtapa();
    if ($('contagem-dias')) { if (dAte > 1) $('contagem-dias').textContent = dAte; else if (dAte === 1) $('contagem').textContent = 'Falta 1 dia para a primeira etapa da nova jornada.'; else $('contagem').textContent = 'A primeira etapa da nova jornada vale desde 16/12/2026.'; }
    // botão de continuar da barra do celular: o mesmo do passo aberto
    document.querySelectorAll('.res-abas [role=tab]').forEach(function (t) {
      t.addEventListener('click', function () { abrirAba(t.getAttribute('data-etapa'), false); });
      t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); abrirAba(t.getAttribute('data-etapa') === 'e1' ? 'e2' : 'e1', true); } });
    });
    $('pvm-continuar').addEventListener('click', function () { (!$('passo-2').hidden ? $('btn-resultado') : $('btn-passo1')).click(); });
    // teclado aberto no celular: campo de texto com foco
    calc.addEventListener('focusin', atualizarBarra);
    calc.addEventListener('focusout', function () { setTimeout(atualizarBarra, 50); });
    window.addEventListener('scroll', function () { requestAnimationFrame(atualizarBarra); }, { passive: true });
    window.addEventListener('resize', atualizarBarra);
    // mudanças na página (avisos que aparecem e somem): a barra acompanha
    new MutationObserver(function (ms) { if (ms.some(function (m) { return m.target === document.body || (m.target.closest && m.target.closest('.ck-aviso')); })) atualizarBarra(); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    window.addEventListener('beforeprint', terminarAnimacoes);
    if (window.matchMedia) { var mp = window.matchMedia('print'); var fim = function (e) { if (e.matches) terminarAnimacoes(); }; if (mp.addEventListener) mp.addEventListener('change', fim); else if (mp.addListener) mp.addListener(fim); }
    $('btn-passo1').addEventListener('click', function () { marcarInicio(); if (lerEquipe()) irPasso(2); });
    $('btn-adicionar').addEventListener('click', function () { var f = novaFuncao(); f.querySelector('.f-nome').focus(); });
    $('btn-voltar1').addEventListener('click', function () { irPasso(1); });
    $('btn-resultado').addEventListener('click', function () {
      var f = lerEquipe(); if (!f) { irPasso(1); return; }
      var emp = lerFuncionamento(); if (!emp) { document.querySelector('#passo-2 [aria-invalid="true"]').focus(); return; }
      mostrarResultado(f, emp);
    });
    $('btn-voltar2').addEventListener('click', function () { irPasso(2); });
    $('btn-abrir-pdf').addEventListener('click', function () { terminarAnimacoes(); window.print(); });
    // links de conversa no WhatsApp marcados com data-evento (como o "fale com a gente" das escalas de revezamento)
    document.querySelectorAll('a[data-evento]').forEach(function (a) { a.addEventListener('click', function () { ev(a.getAttribute('data-evento'), { transport_type: 'beacon' }); }); });
    window.Escala6x1 = { calcular: calcular, irPasso: irPasso, novaFuncao: novaFuncao };
  });
  if (EM_NODE) module.exports = { calcular: calcular, etapa: etapa, custos: custos, vista: vista, tituloRecomendacao: tituloRecomendacao,
    blocoRecomendacao: blocoRecomendacao, blocoCaminhos: blocoCaminhos, custoPorHora: custoPorHora, contratarCompensa: contratarCompensa, textoAjuste: textoAjuste, segundaEtapa: segundaEtapa,
    respostasRapidas: respostasRapidas, blocoResumo: blocoResumo };
})();
