import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(process.argv[2], 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const base = 'http://localhost:3000/api';
const N = 200;

async function login(email) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, senha: env.SEED_SENHA }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return (await r.json()).accessToken;
}

function pct(ordenado, p) {
  return ordenado[Math.min(ordenado.length - 1, Math.floor((p / 100) * ordenado.length))];
}

async function medir(nome, fazer, n = N) {
  for (let i = 0; i < 5; i++) await fazer();
  const tempos = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    const r = await fazer();
    tempos.push(performance.now() - t0);
    if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
    await r.arrayBuffer();
  }
  tempos.sort((a, b) => a - b);
  const f = (v) => v.toFixed(1).padStart(7);
  console.log(
    `${nome.padEnd(34)} n=${String(n).padStart(3)}  p50=${f(pct(tempos, 50))}  p95=${f(pct(tempos, 95))}  p99=${f(pct(tempos, 99))}  max=${f(tempos.at(-1))} ms`,
  );
}

const gestor = await login('gestor@sigcf.local');
const joao = await login('joao@sigcf.local');
const get = (rota, token) => () =>
  fetch(base + rota, { headers: { authorization: `Bearer ${token}` } });

await medir('GET /ordens/minhas (RF03)', get('/ordens/minhas', joao));
await medir('GET /ordens (lista do gestor)', get('/ordens', gestor));
await medir('GET /ordens/resumo (painel)', get('/ordens/resumo', gestor));
await medir('GET /ordens/1 (detalhe+historico)', get('/ordens/1', gestor));
await medir('GET /veiculos', get('/veiculos', gestor));
await medir(
  'POST /auth/login (bcrypt)',
  () =>
    fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'gestor@sigcf.local', senha: env.SEED_SENHA }),
    }),
  30,
);
