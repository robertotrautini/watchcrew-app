#!/usr/bin/env node
/*
 * Component inventory. Read-only analysis of src/components and src/app (*.tsx).
 * Usage: node scripts/component-inventory.js [out.json]
 * Default out: docs/component-inventory-<YYYY-MM-DD>.json
 * Measured: names, paths, lines, props (TS AST), usages (text search), JSX children, className tokens, Jaccard.
 * Derived: category (path rules), description (comment or name heuristic).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const compFiles = [
  ...walk(path.join(ROOT, 'src/components'), ['.tsx']),
  ...walk(path.join(ROOT, 'src/app'), ['.tsx']),
];
const srcFiles = walk(path.join(ROOT, 'src'), ['.ts', '.tsx']);
const testFiles = walk(path.join(ROOT, '__tests__'), ['.ts', '.tsx']);
const read = (f) => fs.readFileSync(f, 'utf8');
const srcText = new Map(srcFiles.map((f) => [rel(f), read(f)]));
const testText = new Map(testFiles.map((f) => [rel(f), read(f)]));

function category(file) {
  if (file.startsWith('src/app/')) {
    if (/_layout\.tsx$/.test(file)) return 'layout';
    return 'screen';
  }
  const m = file.match(/^src\/components\/([^/]+)\//);
  if (!m) return /Provider|Swipe|Layout|layout/.test(file) ? 'layout' : 'layout';
  const d = m[1];
  return { ui: 'ui', movie: 'movie', tagebuch: 'tagebuch', watchlist: 'watchlist', tracker: 'tracker', entries: 'entries', settings: 'settings' }[d] || d;
}

const hasJsx = (node) => {
  let found = false;
  (function v(n) {
    if (found) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) { found = true; return; }
    ts.forEachChild(n, v);
  })(node);
  return found;
};

function propsFromType(typeNode, decls) {
  if (!typeNode) return [];
  if (ts.isTypeLiteralNode(typeNode)) return typeNode.members.map((m) => m.name && m.name.getText()).filter(Boolean);
  if (ts.isTypeReferenceNode(typeNode)) {
    return propsFromName(typeNode.typeName.getText(), decls);
  }
  if (ts.isIntersectionTypeNode(typeNode) || ts.isUnionTypeNode(typeNode)) return typeNode.types.flatMap((t) => propsFromType(t, decls));
  return [];
}
function propsFromName(n, decls) {
  {
    const d = decls.get(n);
    if (d) {
      if (ts.isInterfaceDeclaration(d)) {
        const own = d.members.map((m) => m.name && m.name.getText()).filter(Boolean);
        const ext = (d.heritageClauses || []).flatMap((h) => h.types.flatMap((t) => propsFromName(t.expression.getText(), decls)));
        return [...own, ...ext];
      }
      if (ts.isTypeAliasDeclaration(d)) return propsFromType(d.type, decls);
    }
    return [];
  }
}

function leadingComment(node, src) {
  const ranges = ts.getLeadingCommentRanges(src, node.getFullStart()) || [];
  if (!ranges.length) return '';
  const t = src.slice(ranges[ranges.length - 1].pos, ranges[ranges.length - 1].end);
  return t.replace(/^\/\*+|\*+\/$/g, '').split('\n').map((l) => l.replace(/^\s*(\*|\/\/)\s?/, '').trim()).filter(Boolean).join(' ');
}

function splitWords(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

const rawComps = [];
for (const f of compFiles) {
  const file = rel(f);
  const src = read(f);
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const decls = new Map();
  sf.statements.forEach((s) => {
    if (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) decls.set(s.name.text, s);
  });
  const fileHeader = (() => {
    const first = sf.statements[0];
    if (!first) return '';
    return leadingComment(first, src);
  })();
  const defaultExportNames = new Set();
  const exportedNames = new Set();
  sf.statements.forEach((s) => {
    if (ts.isExportAssignment(s) && ts.isIdentifier(s.expression)) defaultExportNames.add(s.expression.text);
    if (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause)) s.exportClause.elements.forEach((e) => exportedNames.add((e.propertyName || e.name).text));
  });
  const addComp = (name, fnNode, stmt, isDefault) => {
    const hasExportMod = (stmt.modifiers || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const hasDefaultMod = (stmt.modifiers || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    const exported = hasExportMod || exportedNames.has(name) || defaultExportNames.has(name) || isDefault;
    let params = fnNode.parameters || [];
    let props = [];
    if (params[0]) {
      props = propsFromType(params[0].type, decls);
      if (!props.length && ts.isObjectBindingPattern(params[0].name)) props = params[0].name.elements.map((e) => (e.propertyName || e.name).getText());
    }
    // memo/forwardRef wrapping handled by caller
    const startLine = sf.getLineAndCharacterOfPosition(stmt.getStart()).line;
    const endLine = sf.getLineAndCharacterOfPosition(stmt.getEnd()).line;
    const tags = new Set();
    const tagCounts = {};
    const classTokens = new Set();
    (function v(n) {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const t = n.tagName.getText();
        tags.add(t);
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
      if (ts.isJsxAttribute(n) && n.name.getText() === 'className' && n.initializer) {
        n.initializer.getText().replace(/["'`{}]/g, ' ').split(/\s+/).forEach((tok) => { if (/^[a-z!\-\[][\w\-:\/\[\]\.!%#()]*$/i.test(tok) && tok.length > 1 && !/^(cn|\?|:)/.test(tok)) classTokens.add(tok); });
      }
      ts.forEachChild(n, v);
    })(stmt);
    const comment = leadingComment(stmt, src);
    rawComps.push({
      name, file, exported, isDefault: isDefault || hasDefaultMod || defaultExportNames.has(name),
      lines: endLine - startLine + 1, startLine: startLine + 1,
      props: [...new Set(props)], tags: [...tags], tagCounts, classTokens: [...classTokens],
      comment, fileHeader,
    });
  };
  sf.statements.forEach((s) => {
    if (ts.isFunctionDeclaration(s) && s.name && /^[A-Z]/.test(s.name.text) && hasJsx(s)) {
      addComp(s.name.text, s, s, false);
    } else if (ts.isFunctionDeclaration(s) && !s.name && (s.modifiers || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) && hasJsx(s)) {
      const nm = path.basename(file, '.tsx').replace(/[\[\]]/g, '');
      addComp(nm === 'index' || nm === '_layout' ? 'Screen:' + file : nm, s, s, true);
    } else if (ts.isVariableStatement(s)) {
      s.declarationList.declarations.forEach((d) => {
        if (!ts.isIdentifier(d.name) || !/^[A-Z]/.test(d.name.text) || !d.initializer) return;
        let init = d.initializer;
        // unwrap memo(...) / forwardRef(...)
        while (ts.isCallExpression(init) && init.arguments.length) init = init.arguments[0];
        if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && hasJsx(init)) addComp(d.name.text, init, s, false);
      });
    }
  });
}

// anonymous default-exported screens get a readable name
const comps = rawComps.map((c) => {
  let name = c.name;
  let display = name;
  if (name.startsWith('Screen:')) display = 'Screen ' + c.file.replace(/^src\/app\//, '').replace(/\.tsx$/, '');
  return { ...c, id: c.file + '#' + display, display };
});

const catOf = (c) => {
  const base = category(c.file);
  if (base === 'screen') {
    const isMain = c.isDefault;
    return isMain ? 'screen' : 'screen-lokal';
  }
  return base;
};

const uiNames = new Set(comps.filter((c) => c.file.startsWith('src/components/ui/')).map((c) => c.display));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function countUsage(c) {
  if (c.display.startsWith('Screen ') || (c.isDefault && c.file.startsWith('src/app/'))) return null;
  const re = new RegExp('<' + esc(c.display) + '[\\s/>]');
  const imp = new RegExp('import[^;]*\\b' + esc(c.display) + '\\b[^;]*from');
  const srcUsers = [];
  let self = 0;
  for (const [f, t] of srcText) {
    if (f === c.file) {
      const m = t.match(new RegExp('<' + esc(c.display) + '[\\s/>]', 'g'));
      self = m ? m.length : 0;
      continue;
    }
    if (re.test(t) || imp.test(t)) srcUsers.push(f);
  }
  const testUsers = [];
  for (const [f, t] of testText) if (re.test(t) || imp.test(t)) testUsers.push(f);
  return { srcUsers, testUsers, self };
}

function describe(c) {
  const clean = (t) => t.replace(/\s+/g, ' ').trim();
  if (c.comment && c.comment.length > 15) return { text: clean(c.comment).split(/(?<=[.!?])\s/)[0].slice(0, 220), source: 'Kommentar' };
  if (c.fileHeader && c.fileHeader.length > 15 && !/^(eslint|@ts|copyright)/i.test(c.fileHeader)) return { text: clean(c.fileHeader).split(/(?<=[.!?])\s/)[0].slice(0, 220), source: 'Datei-Kommentar' };
  const w = splitWords(c.display.replace(/^Screen /, ''));
  const kind = [
    [/sheet$/, 'Bottom-Sheet'], [/dialog$/, 'Dialog'], [/modal$/, 'Modal'], [/card$/, 'Karte'], [/tile$/, 'Kachel'], [/row$/, 'Zeile'],
    [/list$/, 'Liste'], [/header$/, 'Kopfbereich'], [/panel$/, 'Panel'], [/badge$/, 'Badge'], [/button$/, 'Button'], [/provider$/, 'Provider'],
    [/table$/, 'Tabelle'], [/grid$/, 'Raster'], [/bar$/, 'Leiste'], [/field$/, 'Feld'], [/toggle$/, 'Umschalter'], [/section$/, 'Abschnitt'],
  ].find(([r]) => r.test(w));
  const prims = c.tags.filter((t) => uiNames.has(t)).slice(0, 3).join(', ');
  const text = (c.display.startsWith('Screen ') ? 'Bildschirm ' + c.display.slice(7) : (kind ? kind[1] + ': ' : 'Komponente: ') + w) + (prims ? ' (nutzt ' + prims + ')' : '');
  return { text, source: 'abgeleitet aus Name/Aufbau' };
}

const out = comps.map((c) => {
  const u = countUsage(c);
  const d = describe(c);
  const cat = catOf(c);
  const usage = u ? { src: u.srcUsers.length, tests: u.testUsers.length, self: u.self } : { src: 0, tests: 0, self: 0 };
  const status = !u ? 'route' : (usage.src === 0 && usage.self === 0 ? (usage.tests > 0 ? 'nur-tests' : 'ungenutzt') : 'ok');
  const topUsers = u ? u.srcUsers.map((f) => ({ f, n: (srcText.get(f).match(new RegExp('<' + esc(c.display) + '[\\s/>]', 'g')) || []).length })).sort((a, b) => b.n - a.n).slice(0, 5).map((x) => x.f + (x.n ? ' (' + x.n + 'x)' : ' (import)')) : [];
  return {
    id: c.id, name: c.display, file: c.file, category: cat, lines: c.lines, startLine: c.startLine,
    exported: c.exported, isDefault: c.isDefault, props: c.props,
    usage, status, topUsers,
    usesPrimitives: c.tags.filter((t) => uiNames.has(t) && t !== c.display),
    children: c.tags.filter((t) => /^[A-Z]/.test(t) && t !== c.display),
    classTokens: c.classTokens,
    description: d.text, descriptionSource: d.source,
    fileLines: (srcText.get(c.file) || '').split('\n').length,
  };
});

// similarity
const jac = (a, b) => {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return null;
  let i = 0;
  A.forEach((x) => B.has(x) && i++);
  return i / (A.size + B.size - i);
};
const pairs = [];
const cand = out.filter((c) => c.lines >= 25 && !c.name.startsWith('Screen '));
for (let i = 0; i < cand.length; i++) {
  for (let j = i + 1; j < cand.length; j++) {
    const a = cand[i], b = cand[j];
    const jp = jac(a.props, b.props), jc = jac(a.children, b.children), jk = jac(a.classTokens, b.classTokens);
    const vals = [jp, jc, jk].filter((x) => x !== null);
    if (vals.length < 2) continue;
    const score = vals.reduce((s, x) => s + x, 0) / vals.length;
    if (score >= 0.6) pairs.push({ a: a.id, b: b.id, aName: a.name, bName: b.name, score: +score.toFixed(2), props: jp === null ? null : +jp.toFixed(2), children: jc === null ? null : +jc.toFixed(2), classes: jk === null ? null : +jk.toFixed(2) });
  }
}
pairs.sort((x, y) => y.score - x.score);

// name clusters
const suffixes = ['Card', 'Tile', 'Row', 'Sheet', 'Dialog', 'Modal', 'Panel', 'List', 'Header', 'Badge', 'Button', 'Table', 'Grid', 'Bar', 'Section', 'Field', 'Toggle', 'Provider'];
const clusters = {};
out.forEach((c) => {
  if (c.name.startsWith('Screen ')) return;
  const s = suffixes.find((x) => c.name.endsWith(x));
  if (s) (clusters['*' + s] = clusters['*' + s] || []).push(c.id);
  const fam = c.name.match(/^(MovieDetail|Tagebuch|Watchlist|Tracker|Diary|Poster|Settings|Group|Filmography|Add)/);
  if (fam) (clusters[fam[1] + '*'] = clusters[fam[1] + '*'] || []).push(c.id);
});
// Tagebuch <-> Watchlist pairs by suffix
const pairsTW = [];
out.forEach((c) => {
  const m = c.name.match(/^Tagebuch(.+)$/);
  if (m) {
    const w = out.find((x) => x.name === 'Watchlist' + m[1]);
    if (w) pairsTW.push({ tagebuch: c.id, watchlist: w.id });
  }
});

const cats = {};
out.forEach((c) => { cats[c.category] = (cats[c.category] || 0) + 1; });
const stats = {
  total: out.length, byCategory: cats, totalLines: out.reduce((s, c) => s + c.lines, 0),
  usedOnce: out.filter((c) => c.status === 'ok' && c.usage.src + (c.usage.self > 0 ? 1 : 0) === 1).length,
  unused: out.filter((c) => c.status === 'ungenutzt').length,
  onlyTests: out.filter((c) => c.status === 'nur-tests').length,
  routes: out.filter((c) => c.status === 'route').length,
  over300: out.filter((c) => c.lines > 300).length,
  similarPairs: pairs.length,
  files: compFiles.length,
};
const bigFiles = [...new Set(out.map((c) => c.file))].map((f) => ({ file: f, lines: (srcText.get(f) || '').split('\n').length })).filter((x) => x.lines > 300).sort((a, b) => b.lines - a.lines);

const date = new Date().toISOString().slice(0, 10);
const data = { generated: date, stats, components: out, similarPairs: pairs, clusters, tagebuchWatchlistPairs: pairsTW, bigFiles };
const outPath = process.argv[2] || path.join(ROOT, 'docs', `component-inventory-${date}.json`);
fs.writeFileSync(outPath, JSON.stringify(data, null, 1));
console.log(JSON.stringify(stats), '->', outPath);
