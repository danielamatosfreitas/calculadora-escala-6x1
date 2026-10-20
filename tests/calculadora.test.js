// Testes do cálculo da calculadora da escala 6x1 (node --test).
// Os números esperados foram conferidos à mão com as fórmulas descritas no README.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcular, custos } = require('../js/escala-6x1.js');

// Loja do caso F: 5 vendedoras, 6 dias por semana, 44 horas, salário de R$ 2.500, Simples Nacional.
// A loja abre 54 horas por semana em 6 dias (segunda a sexta das 8h às 18h e sábado das 8h às 12h).
const LOJA = [{ nome: 'Vendas', pessoas: 5, dias: 6, horas: 44, salario: 2500 }];
const ABERTURA = { dias: 6, horas: 54 };

// Mesmo caminho da página: "Não sei" usa o cenário sem convenção como principal e calcula também o cenário com convenção.
function simular(grupos, empresa, convencao, regime) {
  const principal = Object.assign({}, empresa, { convencao: convencao === 'sim' ? 'sim' : 'nao' });
  const r = calcular(grupos, principal), c = custos(r, regime);
  let alt = null;
  if (convencao === 'naosei') {
    const rs = calcular(grupos, Object.assign({}, principal, { convencao: 'sim' }));
    alt = { r: rs, c: custos(rs, regime) };
  }
  return { r, c, alt };
}

const perto = (real, esperado, msg) => assert.ok(Math.abs(real - esperado) < 0.01, `${msg}: ${real} (esperado ${esperado})`);

describe('caso F: convenção permite 8h24 por dia (Sim)', () => {
  const { r, c } = simular(LOJA, ABERTURA, 'sim', 'simples');

  test('dez. 2026: até 42 horas em 5 dias, 10 horas a menos por semana', () => {
    assert.equal(r.e1.limite, 42);
    assert.equal(r.e1.linhas[0].horasNovas, 42); // mínimo(44, 42, 5 × 8 + 2)
    assert.equal(r.e1.pessoas, 5);
    assert.equal(r.e1.horas, 10); // (44 − 42) × 5
    assert.equal(c.e1.Hc, 10);
  });

  test('dez. 2026: 10 horas é menos de 12, então o indicado é ajustar o horário', () => {
    assert.equal(c.e1.ajuste, true);
  });

  test('dez. 2026: custos de contratar e de hora extra', () => {
    // tempo parcial de 10 h: 2.500 × 10 / 42 × 1,29
    perto(c.e1.contratar[0], 2500 * 10 / 42 * 1.29, 'contratar');
    // hora = 2.500 / (42 × 5); 10 h × 4,33 × hora × 1,5 × 7/6 × 1,29
    perto(c.e1.extra[0], 10 * 4.33 * (2500 / 210) * 1.5 * (7 / 6) * 1.29, 'hora extra');
    perto(c.e1.extra[0], 1163.69, 'hora extra arredondada');
  });

  test('dez. 2027: 40 horas para todos, 20 horas a menos por semana', () => {
    assert.equal(r.e2.limite, 40);
    assert.equal(r.e2.horas, 20);
    assert.equal(c.e2.Hc, 20);
    assert.equal(c.e2.ajuste, false);
  });
});

describe('caso F: convenção não permite (Não)', () => {
  const { r, c } = simular(LOJA, ABERTURA, 'nao', 'simples');

  test('dez. 2026: 8 horas por dia, ou seja, 40 horas em 5 dias', () => {
    assert.equal(r.e1.limite, 40);
    assert.equal(r.e1.linhas[0].horasNovas, 40); // mínimo(44, 42, 5 × 8)
    assert.equal(r.e1.horas, 20);
    assert.equal(c.e1.Hc, 20);
  });

  test('dez. 2026: 1 pessoa em tempo parcial de 20 horas, R$ 1.612,50 por mês', () => {
    assert.equal(c.e1.integrais, 0);
    assert.deepEqual(c.e1.parciais, [{ nome: 'Vendas', horas: 20 }]);
    perto(c.e1.contratar[0], 1612.5, 'contratar'); // 2.500 × 20 / 40 × 1,29
  });

  test('dez. 2026: hora extra de R$ 2.443,74 por mês e virada no mês 4', () => {
    perto(c.e1.extra[0], 2443.74, 'hora extra'); // 20 × 4,33 × 12,50 × 1,5 × 7/6 × 1,29
    assert.equal(c.e1.unico, 2500); // custo único de 1 salário por contratação
    assert.deepEqual(c.e1.virada, [4]); // 1.612,50 × m + 2.500 ≤ 2.443,74 × m a partir de m = 4
  });

  test('dez. 2027 fica igual a dez. 2026: 20 horas e R$ 1.612,50', () => {
    assert.equal(r.e2.horas, 20);
    perto(c.e2.contratar[0], 1612.5, 'contratar');
  });
});

describe('caso F: convenção desconhecida (Não sei)', () => {
  const { r, c, alt } = simular(LOJA, ABERTURA, 'naosei', 'simples');

  test('o cenário principal é o sem convenção: 20 horas e 20 horas', () => {
    assert.equal(r.e1.horas, 20);
    assert.equal(r.e2.horas, 20);
    perto(c.e1.contratar[0], 1612.5, 'contratar');
  });

  test('o segundo cenário, com convenção, aparece ao lado: 10 horas e 20 horas', () => {
    assert.ok(alt, 'deveria haver o segundo cenário');
    assert.equal(alt.r.e1.horas, 10);
    assert.equal(alt.r.e2.horas, 20);
  });

  test('qualquer valor diferente de "sim" é tratado como sem convenção', () => {
    const direto = calcular(LOJA, Object.assign({}, ABERTURA, { convencao: 'naosei' }));
    assert.equal(direto.e1.limite, 40);
    assert.equal(direto.e1.horas, 20);
  });
});

describe('regime tributário', () => {
  const r = calcular(LOJA, Object.assign({}, ABERTURA, { convencao: 'nao' }));

  test('fora do Simples (ou Anexo IV) o fator de encargos é 1,62', () => {
    const c = custos(r, 'geral');
    assert.deepEqual(c.fator, [1.62]);
    perto(c.e1.contratar[0], 2500 * 20 / 40 * 1.62, 'contratar');
  });

  test('"Não sei" mostra a faixa entre 1,29 e 1,62', () => {
    const c = custos(r, 'naosei');
    assert.deepEqual(c.fator, [1.29, 1.62]);
    perto(c.e1.contratar[0], 1612.5, 'mínimo');
    perto(c.e1.contratar[1], 2025, 'máximo');
  });
});

describe('quem não muda e quem muda só pela folga', () => {
  test('equipe que já faz 5 dias e 40 horas não muda', () => {
    const r = calcular([{ nome: 'Escritório', pessoas: 3, dias: 5, horas: 40 }], { dias: 5, horas: 45, convencao: 'nao' });
    assert.equal(r.e1.pessoas, 0);
    assert.equal(r.e1.horas, 0);
    assert.equal(r.e1.linhas[0].muda, false);
  });

  test('6 dias e 36 horas: muda por causa da folga, sem perder horas', () => {
    const r = calcular([{ nome: 'Caixa', pessoas: 2, dias: 6, horas: 36 }], { dias: 6, horas: 54, convencao: 'nao' });
    assert.equal(r.e1.linhas[0].muda, true);
    assert.equal(r.e1.linhas[0].diasNovos, 5);
    assert.equal(r.e1.horas, 0);
  });
});

describe('cobertura do horário (pessoas ao mesmo tempo)', () => {
  test('5 vendedoras com 2 ao mesmo tempo cobrem as 54 horas da loja', () => {
    const grupos = [Object.assign({}, LOJA[0], { simultaneas: 2 })];
    const { r, c } = simular(grupos, ABERTURA, 'nao', 'simples');
    assert.equal(r.e1.linhas[0].cobertura.status, 'cobre'); // precisa 108 h; depois da mudança há 5 × 40 = 200 h
    assert.equal(c.e1.H, 0);
  });

  test('faltam dias de trabalho: hora extra não resolve', () => {
    // 2 pessoas, as 2 juntas, loja aberta 6 dias e 40 horas: com 5 dias cada, sobram 2 dias sem a dupla
    const grupos = [{ nome: 'Dupla', pessoas: 2, dias: 6, horas: 44, simultaneas: 2, salario: 2000 }];
    const { r, c } = simular(grupos, { dias: 6, horas: 40 }, 'nao', 'simples');
    const cob = r.e2.linhas[0].cobertura;
    assert.equal(cob.status, 'falta');
    assert.equal(cob.faltaDias, 2);
    assert.ok(c.e2.semExtra, 'deveria marcar que a hora extra não resolve');
    assert.equal(c.e2.virada, null);
  });

  test('dados impossíveis travam o resultado', () => {
    const grupos = [{ nome: 'Grupo', pessoas: 2, dias: 6, horas: 44, simultaneas: 3 }];
    const { r, c } = simular(grupos, ABERTURA, 'nao', 'simples');
    assert.equal(r.e1.linhas[0].cobertura.status, 'dados');
    assert.equal(c.e1.dados, true);
  });
});

describe('contratação em pessoas inteiras', () => {
  const caso = (pessoas) => {
    // 6 dias e 45 horas: perdem 5 horas cada em dez. 2027 (45 − 40)
    const { c } = simular([{ nome: 'Equipe', pessoas, dias: 6, horas: 45, salario: 2000 }], ABERTURA, 'nao', 'simples');
    return c.e2;
  };

  test('35 horas (acima de 30): 1 pessoa em tempo integral', () => {
    const e = caso(7);
    assert.equal(e.Hc, 35);
    assert.equal(e.integrais, 1);
    assert.deepEqual(e.parciais, []);
  });

  test('55 horas: 1 integral e sobra de 15 horas em tempo parcial', () => {
    const e = caso(11);
    assert.equal(e.integrais, 1);
    assert.deepEqual(e.parciais, [{ nome: 'Equipe', horas: 15 }]);
  });

  test('45 horas: 1 integral e sobra de 5 horas (menos de 12) com ajuste ou hora extra', () => {
    const e = caso(9);
    assert.equal(e.integrais, 1);
    assert.deepEqual(e.parciais, []);
    assert.equal(e.sobraExtra, 5);
  });
});
