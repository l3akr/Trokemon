/* Construit data/prices.json : cote Cardmarket (guide des prix public) par carte TCGdex.
   Sources : products_singles_6.json + price_guide_6.json (Cardmarket) et l'API TCGdex (anglais).
   Le catalogue Cardmarket n'a ni numéro ni nom de set : on associe par noms de cartes (set), puis par ordre pour les doublons (V1, V2…). */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const CM = 'https://downloads.s3.cardmarket.com/productCatalog/';
const TC = 'https://api.tcgdex.net/v2/en';

export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/* « Masquerain [Water Gun | Bubble] (DLR 104) » -> { base:'masquerain', num:104 } */
export function parseCm(name) {
  const m = /\(\s*[A-Za-z0-9]{2,6}\s*0*(\d{1,3})\s*\)\s*$/.exec(name);
  const base = norm(String(name).replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s*\([^)]*\)\s*$/, ''));
  return { base, num: m ? String(Number(m[1])) : null };
}
const lid = c => String(c.localId).replace(/^0+(?=\d)/, '');
const byLocal = (a, b) => (parseInt(a.localId, 10) - parseInt(b.localId, 10)) || String(a.localId).localeCompare(String(b.localId));

/* products: [{idProduct,name,idExpansion}], guide: {idProduct -> entry}, sets: [{id,name,cards:[{id,localId,name}]}] */
export function build(products, guide, sets) {
  const exps = new Map();
  for (const p of products) {
    const { base, num } = parseCm(p.name);
    if (!base) continue;
    let e = exps.get(p.idExpansion);
    if (!e) exps.set(p.idExpansion, e = { id: p.idExpansion, names: new Map(), n: 0 });
    if (!e.names.has(base)) e.names.set(base, []);
    e.names.get(base).push({ id: p.idProduct, num });
    e.n++;
  }
  for (const e of exps.values()) for (const l of e.names.values()) l.sort((a, b) => a.id - b.id);
  const tsets = sets.map(s => {
    const names = new Map();
    for (const c of s.cards || []) { const b = norm(c.name); if (!names.has(b)) names.set(b, []); names.get(b).push(c); }
    for (const l of names.values()) l.sort(byLocal);
    return { id: s.id, name: s.name, names };
  });
  const inv = new Map();
  tsets.forEach((s, i) => { for (const b of s.names.keys()) { if (!inv.has(b)) inv.set(b, []); inv.get(b).push(i); } });
  const best = new Map(); // set index -> {exp, score}
  for (const e of exps.values()) {
    const ov = new Map();
    for (const b of e.names.keys()) for (const i of inv.get(b) || []) ov.set(i, (ov.get(i) || 0) + 1);
    let bi = -1, bs = 0;
    for (const [i, o] of ov) { const s = o / (e.names.size + tsets[i].names.size - o); if (s > bs) { bs = s; bi = i; } }
    if (bi >= 0 && bs >= 0.5 && (!best.has(bi) || best.get(bi).score < bs)) best.set(bi, { exp: e, score: bs });
  }
  const out = {}, rep = { sets: [], unsetted: [], ambiguous: [], dups: [], approx: 0, unmatched: 0, matched: 0 };
  const priced = id => { const g = guide[id]; return g ? [id, g.trend ?? null, g.avg ?? null, g.low ?? null, g['trend-holo'] ?? null] : [id, null, null, null, null]; };
  tsets.forEach((s, i) => {
    const b = best.get(i);
    if (!b) { rep.unsetted.push(`${s.id} ${s.name}`); return; }
    rep.sets.push(`${s.id} ${s.name} ← expansion ${b.exp.id} (score ${b.score.toFixed(2)})`);
    for (const [base, cards] of s.names) {
      const prods = b.exp.names.get(base);
      if (!prods) { rep.unmatched += cards.length; continue; }
      if (prods.every(p => p.num)) {
        for (const p of prods) { const c = cards.find(c => lid(c) === p.num); if (c) { out[c.id] = priced(p.id); rep.matched++; } }
      } else if (prods.length === cards.length) {
        cards.forEach((c, k) => { out[c.id] = priced(prods[k].id); rep.matched++; });
        if (cards.length > 1) rep.dups.push(`${s.id} ${cards[0].name} : ` + cards.map((c, k) => `${c.localId}→${prods[k].id}`).join(', '));
      } else if (prods.length > cards.length) {
        /* produits en trop (variantes ajoutées plus tard : tampons, 1re édition…) : on garde les plus anciens */
        cards.forEach((c, k) => { out[c.id] = priced(prods[k].id); rep.matched++; rep.approx++; });
        rep.dups.push(`${s.id} ${cards[0].name} [approx, ${prods.length} produits] : ` + cards.map((c, k) => `${c.localId}→${prods[k].id}`).join(', '));
      } else {
        rep.ambiguous.push(`${s.id} « ${cards[0].name} » : ${cards.length} cartes TCGdex (${cards.map(c => c.localId).join(',')}) contre ${prods.length} produits Cardmarket (${prods.map(p => p.id).join(',')})`);
        rep.unmatched += cards.length;
      }
    }
  });
  return { out, rep };
}

async function get(u) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(u); if (r.ok) return await r.json(); } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error('échec : ' + u);
}

async function main() {
  const [cat, pg] = await Promise.all([get(CM + 'productList/products_singles_6.json'), get(CM + 'priceGuide/price_guide_6.json')]);
  const guide = {}; for (const g of pg.priceGuides) guide[g.idProduct] = g;
  const list = await get(TC + '/sets');
  const sets = [];
  for (let i = 0; i < list.length; i += 8) {
    const part = await Promise.all(list.slice(i, i + 8).map(s => get(TC + '/sets/' + encodeURIComponent(s.id))));
    sets.push(...part);
  }
  const { out, rep } = build(cat.products, guide, sets);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/prices.json', JSON.stringify({ createdAt: pg.createdAt, c: out }));
  const recent = rep.dups.slice(-250);
  const L = a => a.slice(0, 300).map(x => '- ' + x).join('\n') + (a.length > 300 ? `\n- … (+${a.length - 300})` : '');
  fs.writeFileSync('data/report.md', `# Rapport prix Cardmarket\n\nGénéré : ${new Date().toISOString()} (guide du ${pg.createdAt})\n\n- Cartes associées : ${rep.matched}\n- Cartes sans produit : ${rep.unmatched}\n- Dont associées par approximation (produits en trop) : ${rep.approx}\n- Sets TCGdex associés : ${rep.sets.length} / ${sets.length}\n\n## Sets non associés\n${L(rep.unsetted)}\n\n## Cas ambigus (non associés, sets récents d'abord ; liste complète dans data/ambiguous.md)\n${L(rep.ambiguous.slice().reverse())}\n\n## Doublons de nom associés par ordre (sets récents en dernier)\n${L(recent)}\n\n## Associations de sets\n${L(rep.sets)}\n`);
  fs.writeFileSync('data/ambiguous.md', '# Cas non associés\\n\\n' + rep.ambiguous.map(x => '- ' + x).join('\\n') + '\\n');
  console.log(`associées ${rep.matched}, sans produit ${rep.unmatched}, ambiguës ${rep.ambiguous.length}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
