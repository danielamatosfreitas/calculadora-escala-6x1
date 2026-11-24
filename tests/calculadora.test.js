// Testes do cálculo da calculadora da escala 6x1 (node --test tests/calculadora.test.js).
// Etapa 1 (16/12/2026 a 15/12/2027), pela liminar do STF de 12/11/2026, que ainda depende de referendo do plenário: 42 h
// para todos, em 5 dias de até 8h24; com menos de 5 dias de trabalho, o teto diário continua 8 h. Etapa 2 (desde
// 16/12/2027): 40 h, 8 h por dia. Sem a pergunta da convenção coletiva (rascunho de 13/11/2026).
// Custo de contratar (regra de 11/11/2026): o salário do tempo parcial é proporcional às horas sobre as
// horas semanais novas do grupo, a mesma base do valor da hora extra (CLT, art. 58-A, § 1º); o custo único de contratação
// (seleção, admissão e treinamento, igual a 1 salário) fica inteiro também no tempo parcial.
// Loja fictícia "Moda Aurora" no Simples Nacional (fator 1,29), salário médio de R$ 2.500.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { calcular, custos } = require(path.join(__dirname, '..', 'js', 'escala-6x1.js'));

const SAL = 2500, FATOR = 1.29;
const perto = (real, esperado, msg) => assert.ok(Math.abs(real - esperado) < 0.01, `${msg}: ${real} (esperado ${esperado})`);
// hora extra: H × 4,33 × (salário ÷ (horas novas × 5)) × 1,5 × 7/6 × fator
const horaExtra = (H, novas) => H * 4.33 * (SAL / (novas * 5)) * 1.5 * (7 / 6) * FATOR;
// mês de virada: primeiro mês em que o acumulado de contratar (com o custo único) fica menor ou igual ao da hora extra
const virada = (mensal, unico, extra) => { for (let m = 1; m <= 12; m++) if (mensal * m + unico <= extra * m + 1e-9) return m; return null; };
const simular = (pessoas, horas, dias = 6) => {
  const r = calcular([{ nome: 'Vendas', pessoas, dias, horas, salario: SAL }], { dias: 6, horas: 54 });
  return { r, c: custos(r, 'simples') };
};

describe('aceitação: horas novas de um grupo de 44 horas', () => {
  test('a) 6 dias, etapa 1: 42 horas', () => assert.equal(simular(5, 44, 6).r.e1.linhas[0].horasNovas, 42));
  test('b) 5 dias, etapa 1: 42 horas', () => assert.equal(simular(5, 44, 5).r.e1.linhas[0].horasNovas, 42));
  test('c) 4 dias, etapa 1: 32 horas (teto de 8 h por dia)', () => assert.equal(simular(5, 44, 4).r.e1.linhas[0].horasNovas, 32));
  test('d) 6 dias, etapa 2: 40 horas', () => assert.equal(simular(5, 44, 6).r.e2.linhas[0].horasNovas, 40));
  test('jornada integral (J) para contar contratações: 42 na etapa 1, 40 na etapa 2', () => {
    const { r } = simular(5, 44); assert.equal(r.e1.limite, 42); assert.equal(r.e2.limite, 40);
  });
});

describe('Moda Aurora (5 pessoas, 6 dias, 44 horas), etapa 1: 10 horas a cobrir', () => {
  const { r, c } = simular(5, 44), e = c.e1;
  test('10 horas a menos por semana, menos de 12: o indicado é ajustar o horário', () => {
    assert.equal(r.e1.horas, 10); assert.equal(e.Hc, 10); assert.equal(e.ajuste, true);
  });
  test('tempo parcial de 10 horas sobre 42: R$ 767,86 por mês; hora extra R$ 1.163,69; virada no 7º mês', () => {
    perto(e.contratar[0], SAL * 10 / 42 * FATOR, 'contratar'); perto(e.contratar[0], 767.86, 'contratar arredondado');
    perto(e.extra[0], 1163.69, 'hora extra'); perto(e.unico, SAL, 'custo único');
    assert.equal(e.virada[0], virada(e.contratar[0], SAL, e.extra[0])); assert.equal(e.virada[0], 7);
  });
});

describe('etapa 2 (40 horas): custos sem mudança', () => {
  test('jornada cheia, 9 pessoas: 36 horas, 1 pessoa em tempo integral, virada no 3º mês', () => {
    const e = simular(9, 44).c.e2;
    assert.equal(e.Hc, 36); assert.equal(e.integrais, 1); assert.equal(e.parciais.length, 0);
    perto(e.contratar[0], SAL * FATOR, 'contratar'); perto(e.unico, SAL, 'custo único');
    perto(e.extra[0], horaExtra(36, 40), 'hora extra'); assert.equal(e.virada[0], 3);
  });
  test('Moda Aurora: 20 horas em tempo parcial, R$ 1.612,50, virada no 4º mês', () => {
    const e = simular(5, 44).c.e2;
    assert.deepEqual(e.parciais.map(p => p.horas), [20]);
    perto(e.contratar[0], 1612.50, 'contratar'); perto(e.extra[0], 2443.74, 'hora extra'); perto(e.unico, SAL, 'custo único');
    assert.equal(e.virada[0], 4);
  });
  test('30 horas em tempo parcial (15 pessoas de 42 horas), virada no 3º mês', () => {
    const e = simular(15, 42).c.e2;
    assert.deepEqual(e.parciais.map(p => p.horas), [30]);
    perto(e.contratar[0], SAL * 30 / 40 * FATOR, 'contratar'); assert.equal(e.virada[0], 3);
  });
});

// O valor da hora tem de ser o mesmo nas duas contas: hora extra (salário ÷ (horas novas × 5)) e tempo parcial
// (salário × horas ÷ horas novas, por (horas × 5) horas no mês), em cada etapa
describe('mesmo valor de hora na hora extra e no tempo parcial', () => {
  for (const [nome, k, novas] of [['etapa 1', 'e1', 42], ['etapa 2', 'e2', 40]]) {
    test(`${nome}: hora de R$ ${(SAL / (novas * 5)).toFixed(2)}`, () => {
      const e = simular(5, 44).c[k], parcial = e.parciais[0].horas;
      const horaDoParcial = e.contratar[0] / FATOR / (parcial * 5);
      const horaDaExtra = e.extra[0] / (e.H * 4.33 * 1.5 * (7 / 6) * FATOR);
      perto(horaDoParcial, horaDaExtra, 'hora do tempo parcial igual à da hora extra');
      perto(horaDoParcial, SAL / (novas * 5), `salário ÷ (${novas} × 5)`);
    });
  }
});

// Grupo de 36 horas com salário de R$ 2.500: hora de R$ 13,89 (2.500 ÷ 180) nas duas contas, em cada etapa.
// Um grupo de 36 horas não perde horas em nenhuma etapa, então o teste confere a fórmula de custo direto, com 20 horas a cobrir.
describe('grupo de 36 horas: mesmo valor de hora (R$ 13,89) na hora extra e no tempo parcial', () => {
  const linha = { nome: 'Caixa', pessoas: 5, horas: 36, horasNovas: 36, perda: 20, salario: SAL, cobertura: null, simultaneas: null };
  const r = { e1: { limite: 42, linhas: [linha] }, e2: { limite: 40, linhas: [linha] } };
  for (const [nome, k] of [['etapa 1', 'e1'], ['etapa 2', 'e2']]) {
    test(nome, () => {
      const e = custos(r, 'simples')[k];
      assert.deepEqual(e.parciais.map(p => p.horas), [20]);
      perto(e.contratar[0] / FATOR / (20 * 5), SAL / 180, 'tempo parcial');
      perto(e.extra[0] / (20 * 4.33 * 1.5 * (7 / 6) * FATOR), SAL / 180, 'hora extra');
      perto(e.unico, SAL, 'custo único inteiro');
    });
  }
});

// Ateliê: 2 pessoas, 4 dias por semana, 44 horas (11 horas por dia). Com menos de 5 dias, o teto diário é 8 h nas duas
// etapas: 32 horas depois da mudança, 24 horas em tempo parcial sobre 32.
describe('Ateliê: 2 pessoas de 44 horas em 4 dias', () => {
  const r = calcular([{ nome: 'Costura', pessoas: 2, dias: 4, horas: 44, salario: SAL }], { dias: 6, horas: 44 }), c = custos(r, 'simples');
  for (const k of ['e1', 'e2']) {
    test(`${k === 'e1' ? 'etapa 1' : 'etapa 2'}: 24 horas em tempo parcial sobre 32 horas`, () => {
      const e = c[k];
      assert.equal(r[k].linhas[0].horasNovas, 32);
      assert.deepEqual(e.parciais.map(p => p.horas), [24]);
      perto(e.contratar[0], SAL * 24 / 32 * FATOR, 'contratar');
      perto(e.unico, SAL, 'custo único inteiro');
      assert.equal(e.virada[0], virada(e.contratar[0], SAL, e.extra[0]));
    });
  }
});
