// Testes da recomendação e dos cartões de "Os caminhos, lado a lado" (node --test tests/recomendacao.test.js).
// Regra de 13/11/2026 para poucas horas a cobrir (acima de zero e abaixo de 12 por semana):
// título "Reorganize a escala antes de cortar horário", custo por hora coberta (custo mensal ÷ (horas × 4,33), sem o custo único,
// arredondado só no fim, meio centavo para cima), faixa com o regime "Não sei" e selo em Contratar só quando contratar sai mais barato
// que a hora extra em 12 meses. Os outros casos não mudam.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'escala-6x1.js'));

// texto visível: sem tags e com espaços comuns no lugar dos inseparáveis
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
function montar(grupo, regime, empresa = { dias: 6, horas: 54 }) {
  const r = E.calcular([Object.assign({ nome: 'Vendas', pessoas: 5, dias: 6, horas: 44 }, grupo)], empresa), c = E.custos(r, regime);
  const aba = k => ({
    rec: txt(E.blocoRecomendacao(E.vista(r, k), E.vista(c, k), k === 'e1' ? E.segundaEtapa(c) : '')),
    tit: txt(E.tituloRecomendacao(E.vista(r, k), E.vista(c, k))),
    // cartões na ordem da tela: [selo, título]
    cartoes: E.blocoCaminhos(E.vista(r, k), E.vista(c, k), k).split('<div class="cam-card').slice(1).map(h => {
      const selo = (h.match(/<span class="cam-tag[^"]*">([^<]*)<\/span>/) || [])[1] || '';
      const tit = (h.match(/<h4 class="cam-tit">([^<]*)<\/h4>/) || [])[1] || '';
      return { selo, tit, texto: txt('<x' + h) };
    })
  });
  return { r, c, e1: aba('e1'), e2: aba('e2') };
}
const comSelo = (a, selo) => a.cartoes.filter(x => x.selo === selo).map(x => x.tit);
const NOVO = 'Reorganize a escala antes de cortar horário';

describe('a) Moda Aurora (5 pessoas, 6 dias, 44 horas, R$ 2.500, Simples Nacional), dez. 2026', () => {
  const m = montar({ salario: 2500 }, 'simples');
  test('custo por hora coberta: contratar R$ 17,73 e hora extra R$ 26,88', () => {
    const p = E.custoPorHora(m.c.e1);
    assert.deepEqual(p.contratar, [17.73]); assert.deepEqual(p.extra, [26.88]);
  });
  test('hora extra por hora: 2.500 ÷ 210 × 1,5 × 7/6 × 1,29 = 26,875, que sobe para 26,88', () => {
    assert.ok(Math.abs(2500 / 210 * 1.5 * 7 / 6 * 1.29 - 26.875) < 1e-9);
  });
  test('título e texto da recomendação', () => {
    assert.equal(m.e1.tit, NOVO);
    assert.equal(m.e1.rec, 'Recomendação para a sua empresa ' + NOVO + ' Faltam 10 horas por semana. Antes de fechar mais cedo, organize as entradas e as folgas pelo movimento da loja: muitas vezes isso cobre o horário sem custo. Se ainda faltar gente, contratar alguém por 10 horas custa cerca de R$ 17,73 por hora coberta, e a hora extra, R$ 26,88. Feche só os horários que dão menos lucro do que isso. Em 16/12/2027 vão faltar 20 horas por semana: contratar antes evita disputar gente com todas as empresas ao mesmo tempo. Conversar sobre a escala');
  });
  test('selo "Indicado para o seu caso" em "Contratar alguém em tempo parcial"; "Ajustar o horário" com "Não aumenta a folha" e o texto novo', () => {
    assert.deepEqual(comSelo(m.e1, 'Indicado para o seu caso'), ['Contratar alguém em tempo parcial']);
    const aj = m.e1.cartoes.find(x => x.tit === 'Ajustar o horário');
    assert.equal(aj.selo, 'Não aumenta a folha');
    assert.match(aj.texto, /Reduzir 10 horas de atendimento por semana nos horários de menor movimento\. Não aumenta a folha, mas a empresa deixa de vender nesses horários\.$/);
  });
  test('contas sem mudança: R$ 767,86, R$ 1.163,69 e virada no 7º mês', () => {
    assert.ok(Math.abs(m.c.e1.contratar[0] - 767.857) < 0.01); assert.ok(Math.abs(m.c.e1.extra[0] - 1163.69) < 0.01); assert.equal(m.c.e1.virada[0], 7);
  });
});

describe('b) Moda Aurora, dez. 2027: sem mudança', () => {
  const m = montar({ salario: 2500 }, 'simples');
  test('"Contrate 1 pessoa por 20 horas semanais", com o selo em contratar', () => {
    assert.equal(m.e2.tit, 'Contrate 1 pessoa por 20 horas semanais');
    assert.match(m.e2.rec, /^Recomendação para a sua empresa Contrate 1 pessoa por 20 horas semanais A partir do 4º mês, contratar sai mais barato que pagar hora extra\. Enquanto a seleção acontece, a hora extra cobre as horas que faltam\./);
    assert.deepEqual(comSelo(m.e2, 'Indicado para o seu caso'), ['Contratar alguém em tempo parcial']);
  });
});

describe('c) sem salário informado', () => {
  const m = montar({}, 'simples');
  test('mesmo texto sem valores em reais, terminando com o pedido do salário', () => {
    assert.equal(m.e1.tit, NOVO);
    assert.ok(!/R\$/.test(m.e1.rec), m.e1.rec);
    assert.match(m.e1.rec, /^Recomendação para a sua empresa Reorganize a escala antes de cortar horário Faltam 10 horas por semana\. Antes de fechar mais cedo, organize as entradas e as folgas pelo movimento da loja: muitas vezes isso cobre o horário sem custo\./);
    assert.match(m.e1.rec, /Informe o salário médio no primeiro passo para ver quanto custa cada hora coberta\. Conversar sobre a escala$/);
  });
  test('sem salário, nenhum cartão recebe o selo de indicado', () => assert.deepEqual(comSelo(m.e1, 'Indicado para o seu caso'), []));
});

describe('d) regime "Não sei": custos por hora em faixa (fatores 1,29 e 1,62)', () => {
  for (const regime of ['naosei', '']) {
    test(regime ? 'Não sei' : 'em branco', () => {
      const m = montar({ salario: 2500 }, regime);
      assert.deepEqual(E.custoPorHora(m.c.e1), { contratar: [17.73, 22.27], extra: [26.88, 33.75] });
      assert.match(m.e1.rec, /contratar alguém por 10 horas custa cerca de entre R\$ 17,73 e R\$ 22,27 por hora coberta, e a hora extra, entre R\$ 26,88 e R\$ 33,75\./);
    });
  }
});

describe('e) hora extra mais barata em 12 meses (2 pessoas, 4 horas a cobrir)', () => {
  const m = montar({ pessoas: 2, salario: 2500 }, 'simples');
  test('contratar não compensa em 12 meses', () => {
    const e = m.c.e1; assert.equal(e.Hc, 4);
    assert.ok(e.contratar[0] * 12 + e.unico >= e.extra[0] * 12); assert.equal(E.contratarCompensa(e), false);
  });
  test('título novo e nenhum cartão com o selo de indicado', () => {
    assert.equal(m.e1.tit, NOVO);
    assert.deepEqual(comSelo(m.e1, 'Indicado para o seu caso'), []);
    assert.equal(m.e1.cartoes[0].tit, 'Ajustar o horário');
  });
});

describe('f) sem horas a cobrir: sem mudança', () => {
  test('5 dias de 40 horas: o horário já cabe', () => {
    const m = montar({ dias: 5, horas: 40, salario: 2500 }, 'simples', { dias: 5, horas: 45 });
    assert.equal(m.e1.rec, 'Recomendação para a sua empresa O horário de hoje já cabe na regra nova Pelos dados informados, ninguém precisa mudar de horário. Confira os contratos e a convenção coletiva da sua categoria. Conversar sobre a escala');
    assert.deepEqual(m.e1.cartoes.map(x => [x.selo, x.tit]), [['Não aumenta a folha', 'Folgas alternadas'], ['', 'Contratar'], ['', 'Hora extra']]);
  });
  test('6 dias de 40 horas: folgas alternadas, com o selo de indicado', () => {
    const m = montar({ horas: 40, salario: 2500 }, 'simples');
    assert.equal(m.e1.tit, 'Organize folgas alternadas');
    assert.match(m.e1.rec, /Organize folgas alternadas \(cada pessoa folga num dia diferente\)\. Para conferir se a equipe cobre todo o horário, informe quantas pessoas precisam trabalhar juntas\./);
    assert.deepEqual(m.e1.cartoes.map(x => [x.selo, x.tit]), [['Indicado para o seu caso', 'Folgas alternadas'], ['', 'Contratar'], ['', 'Hora extra']]);
  });
});

// Coerência com a recomendação nova (textos de 15/11/2026): resposta rápida "Preciso contratar?",
// cartão 3 dos números e cartão "Ajustar o horário" em todos os casos.
function extras(grupo, regime, empresa = { dias: 6, horas: 54 }) {
  const r = E.calcular([Object.assign({ nome: 'Vendas', pessoas: 5, dias: 6, horas: 44 }, grupo)], empresa), c = E.custos(r, regime);
  const rr = E.respostasRapidas(r, c, empresa);
  const resp = p => { const i = rr.indexOf('<dt>' + p + '</dt><dd>'); if (i < 0) return null; const ini = i + p.length + 13; return txt(rr.slice(ini, rr.indexOf('</dd>', ini))); };
  const card3 = k => { const h = E.blocoResumo(E.vista(r, k), E.vista(c, k), k).split('<div class="res-num-card')[3]; return txt('<x' + h); };
  const ajuste = k => E.blocoCaminhos(E.vista(r, k), E.vista(c, k), k).split('<div class="cam-card').slice(1).map(h => txt('<x' + h)).find(t => / Ajustar o horário /.test(' ' + t + ' '));
  return { contratar: resp('Preciso contratar? Quantas pessoas?'), card3, ajuste };
}
describe('coerência com a recomendação para poucas horas', () => {
  test('Moda Aurora com salário: "Preciso contratar?" por etapa', () => {
    assert.equal(extras({ salario: 2500 }, 'simples').contratar,
      'A partir de 16/12/2026, ainda não: reorganize a escala antes de cortar horário. Se ainda faltar gente, 1 pessoa por 10 horas por semana custa cerca de R$ 768 por mês. A partir de 16/12/2027, sim: 1 pessoa em tempo parcial, 20 horas por semana, cerca de R$ 1.613 por mês.');
  });
  test('Moda Aurora sem salário: "Preciso contratar?" sem valores', () => {
    assert.equal(extras({}, 'simples').contratar,
      'A partir de 16/12/2026, ainda não: reorganize a escala antes de cortar horário. A partir de 16/12/2027, sim: 1 pessoa em tempo parcial, 20 horas por semana.');
  });
  test('duas etapas iguais (2 pessoas, 4 dias, 36 horas: 8 horas nas duas): uma frase só', () => {
    const x = extras({ pessoas: 2, dias: 4, horas: 36, salario: 2500 }, 'simples');
    assert.equal(x.contratar, 'Ainda não, nas duas etapas: reorganize a escala antes de cortar horário.');
    assert.match(x.card3('e1'), /a mais por mês, reorganizando a escala$/);
  });
  test('Moda Aurora dez. 2026: cartão 3 dos números "a mais por mês, reorganizando a escala"', () => {
    assert.equal(extras({ salario: 2500 }, 'simples').card3('e1'), 'R$ 0,00 a mais por mês, reorganizando a escala');
  });
  test('cartão "Ajustar o horário" com "deixa de vender" nas duas etapas (dez. 2027 também)', () => {
    const x = extras({ salario: 2500 }, 'simples');
    for (const k of ['e1', 'e2']) assert.match(x.ajuste(k), /Não aumenta a folha, mas a empresa deixa de vender nesses horários\.$/);
  });
});
