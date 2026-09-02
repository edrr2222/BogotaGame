// Funciones puras para leer un nodo de STORY_NODES contra el estado actual.
// Compartidas entre DialogueScene (localidades sin caminar) y DialogueBox
// (localidades caminables + las otras) para que la lógica de la historia no
// se duplique ni se desalinee entre las dos presentaciones.

export function resolveText(node, momento) {
  if (!node.text) return '';
  if (typeof node.text === 'string') return node.text;
  return momento === 'Noche' ? node.text.night : node.text.day;
}

export function evalCondition(cond, stats) {
  const m = cond.match(/\$(\w+)\s*([<>]=?)\s*(-?\d+)/);
  if (!m) return false;
  const [, stat, op, num] = m;
  const v = stats[stat] || 0;
  const n = parseInt(num, 10);
  switch (op) {
    case '>': return v > n;
    case '<': return v < n;
    case '>=': return v >= n;
    case '<=': return v <= n;
  }
  return false;
}

export function evalEcho(cond, stats) {
  const m = cond.match(/\$(\w+)\s*([<>])\s*0/);
  if (!m) return false;
  const [, stat, op] = m;
  const v = stats[stat] || 0;
  return op === '>' ? v > 0 : v < 0;
}

// Si un párrafo es largo (varias oraciones), lo parte en trozos cortos por
// oración — como los globos de una historieta — en vez de una sola burbuja
// con 4-5 oraciones. Agrupa oraciones seguidas mientras quepan bajo maxLen.
function splitLong(text, maxLen = 170) {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
  const chunks = [];
  let cur = '';
  sentences.forEach(s => {
    if (cur && (cur + s).trim().length > maxLen) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  });
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [text];
}

// Arma las "páginas" de una ventana de diálogo chica para un nodo: en vez de
// un solo bloque largo, cada PÁRRAFO (y cada oración larga dentro de un
// párrafo) es su propia página — así la burbuja de diálogo muestra trozos
// cortos, como en una historieta, en vez de un párrafo largo de una sola vez.
export function buildPages(node, momento, stats) {
  const pages = [];

  const base = resolveText(node, momento);
  base.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    .forEach(p => splitLong(p).forEach(chunk => pages.push(chunk)));
  if (node.extra_raw) splitLong(node.extra_raw).forEach(chunk => pages.push(chunk));

  if (node.mood_reaction) {
    const cond = evalCondition(node.mood_reaction.condition, stats);
    pages.push(cond ? node.mood_reaction.text_true : node.mood_reaction.text_false);
  }

  if (node.reveal) {
    const r = node.reveal;
    const v = stats[r.stat] || 0;
    pages.push(v >= r.high_threshold ? r.text_high : (v <= r.low_threshold ? r.text_low : r.text_neutral));
  }

  if (node.memory_echo && evalEcho(node.memory_echo.condition, stats)) {
    pages.push(node.memory_echo.text);
  }

  if (pages.length === 0) pages.push('');
  return pages;
}
