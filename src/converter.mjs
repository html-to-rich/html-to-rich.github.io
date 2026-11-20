import { Tokenizer, defaultTreeAdapter, parseFragment, serialize } from 'parse5';

export const PROFILE_VERSION = '2.8.0';
export const MAX_BYTES = 65536;
export const MAX_DEPTH = 64;
const encoder = new TextEncoder();
const elements = new Set('h1 h2 h3 h4 h5 h6 p div span br strong b em i u mark s del sup sub ul ol li blockquote table thead tbody tfoot tr th td details summary pre code a hr'.split(' '));
const voids = new Set(['br', 'hr']);
const unsafe = new Set('script style iframe object embed form input button svg math template meta link base video audio img'.split(' '));

class ProfileError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function reject(code, message) { throw new ProfileError(code, message); }
function malformed() { reject('MALFORMED_HTML', 'Incomplete, mismatched or malformed HTML. Supply complete, correctly nested tags and escaped literal characters.'); }

// Only user-activated navigation; never execute or fetch an input link here.
function safeHref(raw){
 if(/[\u0000-\u001f\u007f]/.test(raw))return null;
 const href=raw.trim();
 if(!href)return null;
 let decoded,u;
 try{decoded=decodeURIComponent(href);u=new URL(href);}catch{return null;}
 if(/[\u0000-\u001f\u007f]/.test(decoded))return null;
 if(['https:','http:'].includes(u.protocol))return u.href;
 if(u.protocol==='mailto:'){
  const address=decodeURIComponent(u.pathname);
  // A deliberately bounded mailto profile: one unquoted ASCII address.
  if(!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(address)||u.hash)return null;
  if(address.startsWith('.')||address.includes('..')||address.split('@')[0].endsWith('.'))return null;
  const seen=new Set();
  for(const [key] of u.searchParams){
   const name=key.toLowerCase();
   if(!['subject','body'].includes(name)||seen.has(name))return null;
   seen.add(name);
  }
  return u.href;
 }
 if(u.protocol==='tel:'){
  const number=u.pathname;
  // Global numbers, visual separators and one numeric extension only.
  if(u.search||u.hash||!/^\+[0-9().-]+(?:;ext=[0-9]+)?$/i.test(number)||!/[0-9]/.test(number.split(';')[0]))return null;
  return u.href;
 }
 return null;
}
function normalize(text){
 let t=text.trim();
 const opening=t.match(/^(?:<\s*)?```[ \t]*(?:html[ \t]*)?\r?\n/i);
 const closing=t.match(/\r?\n```[ \t]*(?:>[ \t]*)?$/);
 if(opening||closing){
  if(!opening||!closing||opening[0].length+closing[0].length>=t.length)
   return {error:'Incomplete or malformed HTML code fence. Paste only the HTML fragment.'};
  t=t.slice(opening[0].length,t.length-closing[0].length).trim();
  if(!t||/^(?:<\s*)?```/.test(t))
   return {error:'Nested or malformed code fence. Paste one HTML fragment.'};
  return {html:t,unwrapped:true};
 }
 if(/^(?:<\s*)?```/.test(t)||/```[ \t]*(?:>[ \t]*)?$/.test(t))
  return {error:'Unmatched code fence detected. Copy only the HTML fragment.'};
 return {html:t,unwrapped:false};
}

// Compare the authored nesting/text with the HTML parser's tree. A balanced
// fragment can still move text out of a table or implicitly end a paragraph.
function inspectStructure(source) {
  const expected = [];
  const stack = [];
  function characters({chars}) {
    if (!stack.length && chars.trim()) reject('TOP_LEVEL_TEXT', 'Wrap the text outside the fragment in a supported element.');
    const last = expected.at(-1);
    if (last && last[0] === 'text') last[1] += chars;
    else expected.push(['text', chars]);
  }
  const tokenizer = new Tokenizer({sourceCodeLocationInfo: true}, {
    onParseError: malformed,
    onNullCharacter: malformed,
    onDoctype: () => reject('FULL_DOCUMENT', 'Supply an HTML fragment without a document declaration.'),
    onComment: () => reject('UNSUPPORTED_COMMENT', 'Remove the HTML comment or make its required content visible.'),
    onCharacter: characters,
    onWhitespaceCharacter: characters,
    onStartTag({tagName, selfClosing, location}) {
      const where = ' (line ' + location.startLine + ', column ' + location.startCol + ').';
      if (!elements.has(tagName)) {
        if (unsafe.has(tagName)) reject('UNSAFE_ELEMENT', 'Active content, forms and embedded media are outside the converter profile' + where);
        reject('UNSUPPORTED_ELEMENT', 'Choose a supported representation for the unsupported element' + where);
      }
      if (stack.length >= MAX_DEPTH) reject('TOO_DEEP', 'The fragment exceeds the processing limit of 64 nested elements.');
      expected.push(['start', tagName]);
      if (!voids.has(tagName)) {
        if (selfClosing) malformed();
        stack.push(tagName);
      }
    },
    onEndTag({tagName, attrs, selfClosing}) {
      if (attrs.length || selfClosing || stack.pop() !== tagName) malformed();
      expected.push(['end', tagName]);
    },
    onEof() { if (stack.length) malformed(); }
  });
  tokenizer.write(source, true);
  const context = defaultTreeAdapter.createElement('div', 'http://www.w3.org/1999/xhtml', []);
  const fragment = parseFragment(context, source, { sourceCodeLocationInfo: true, onParseError: malformed });
  let position = 0;
  function match(kind, value) {
    const token = expected[position++];
    if (!token || token[0] !== kind || token[1] !== value) reject('REPAIRED_STRUCTURE', 'HTML parsing would move or drop content. Check nesting, table rows and leading newlines directly inside pre.');
  }
  function check(node) {
    if (node.nodeName === '#text') return match('text', node.value);
    // A browser inserts a tbody around direct tr children of a table.
    const implicit = node.tagName === 'tbody' && !node.sourceCodeLocation;
    if (!implicit) match('start', node.tagName);
    for (const child of node.childNodes) check(child);
    if (!implicit && !voids.has(node.tagName)) match('end', node.tagName);
  }
  for (const child of fragment.childNodes) check(child);
  if (position !== expected.length) reject('REPAIRED_STRUCTURE', 'HTML parsing would discard markup. Check the fragment structure.');
  return fragment;
}

function attributes(node) {
  const output = [];
  const add = (name, value) => output.push({name, value});
  let link;
  for (const {name, value} of node.attrs) {
    const at = node.sourceCodeLocation?.attrs?.[name];
    const where = at ? ' (line ' + at.startLine + ', column ' + at.startCol + ').' : '.';
    const description = ['align','style','class','value','reversed','type','dir','lang','start','rowspan','colspan'].includes(name) ? name : 'attribute';
    if (name === 'dir' && ['ltr','rtl','auto'].includes(value.toLowerCase())) add(name, value.toLowerCase());
    else if (name === 'lang' && /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[xi](?:-[A-Za-z0-9]{1,8})+)$/i.test(value)) add(name, value);
    else if (node.tagName === 'a' && name === 'href') {
      link = safeHref(value);
      if (!link) reject('UNSAFE_URL', 'The link is outside the supported HTTP, HTTPS, mailto or tel profile. Check its scheme, address and parameters.');
      add(name, link);
    } else if (node.tagName === 'a' && ((name === 'target' && value === '_blank') || (name === 'rel' && value === 'noopener noreferrer'))) {
      if (!node.attrs.some(attr => attr.name === 'href')) reject('UNSUPPORTED_ATTRIBUTE', 'A link target or rel needs an allowed destination.');
    } else if (node.tagName === 'details' && name === 'open') add(name, '');
    else if (node.tagName === 'ol' && name === 'start' && /^[+-]?\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value))) add(name, String(Number(value)));
    else if (['th','td'].includes(node.tagName) && ['rowspan','colspan'].includes(name) && /^[0-9]+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 6) add(name, String(Number(value)));
    else if (['th','td'].includes(node.tagName) && name === 'align' && ['left','center','right'].includes(value.toLowerCase())) add(name, value.toLowerCase());
    else if (name.startsWith('on')) reject('UNSAFE_ATTRIBUTE', 'Remove the event handler. Executable attributes are outside the converter profile.');
    else reject('UNSUPPORTED_ATTRIBUTE', 'Unsupported ' + description + ' on <' + node.tagName + '>' + where);
  }
  if (link) { add('rel', 'noopener noreferrer'); add('target', '_blank'); }
  node.attrs = output;
}

function visibleText(node) {
  return node.nodeName === '#text' ? node.value : node.childNodes.map(visibleText).join('');
}

const literalInline = new Set('pre code span br strong b em i u mark s del sup sub'.split(' '));
function literalText(node) {
  if (node.nodeName === '#text') return node.value;
  if (node.tagName === 'br') return '\n';
  if (!literalInline.has(node.tagName)) reject('CODE_STRUCTURE', 'Code supports literal text, line breaks and inline emphasis. Move structured content outside the code block or escape markup that should appear literally.');
  return node.childNodes.map(literalText).join('');
}

// Trim blank edge lines in linear time, retaining horizontal indentation until
// the separate prose-formatting step decides what to do with it.
function blankEdges(text) {
  let first = 0;
  for (let i = 0; i < text.length && ' \t\n'.includes(text[i]); i++) {
    if (text[i] === '\n') first = i + 1;
  }
  let last = text.length;
  for (let i = text.length - 1; i >= first && ' \t\n'.includes(text[i]); i--) {
    if (text[i] === '\n') last = i;
  }
  return text.slice(first, last);
}

function plainText(fragment, occupied) {
  // Tokens protect pre/code text through prose trimming. Reserve a prefix absent
  // from decoded text and URLs, then restore all protected text in a single pass.
  const used = new Set(occupied.match(/\uE000\d+:/g) || []);
  let index = 0;
  while (used.has('\uE000' + index + ':')) index++;
  const prefix = '\uE000' + index + ':';
  const literal = [];
  const protect = text => prefix + (literal.push(text) - 1) + '\uE001';
  const children = (node, depth) => node.childNodes.map(child => walk(child, depth)).join('');
  function item(li, depth, marker) {
    const lines = blankEdges(children(li, depth + 1)).replace(/\n{2,}/g, '\n').split('\n');
    const indent = '  '.repeat(depth), childIndent = indent + '  ';
    const continuation = indent + ' '.repeat(marker.length);
    const first = lines[0].startsWith(childIndent) ? indent + marker.trimEnd() + '\n' + lines[0] : indent + marker + lines[0].trimStart();
    return [first, ...lines.slice(1).map(line => line.startsWith(childIndent) ? line : continuation + line)].join('\n');
  }
  function walk(node, depth = 0) {
    if (node.nodeName === '#text') return node.value.replace(/[ \t\r\n\f]+/g, ' ');
    const tag = node.tagName;
    if (tag === 'pre') return '\n\n' + protect(literalText(node)) + '\n\n';
    if (tag === 'code') return protect(literalText(node));
    if (tag === 'br') return '\n';
    if (tag === 'hr') return '\n\n---\n\n';
    if (tag === 'ul' || tag === 'ol') {
      let count = BigInt(node.attrs.find(attr => attr.name === 'start')?.value ?? '1');
      const entries = [];
      for (const child of node.childNodes) {
        if (child.tagName === 'li') entries.push(item(child, depth, tag === 'ol' ? (count++) + '. ' : '• '));
        else if (visibleText(child).trim()) entries.push(walk(child, depth));
      }
      return '\n' + entries.join('\n') + '\n';
    }
    if (tag === 'li') return '\n' + item(node, depth, '• ') + '\n';
    if (tag === 'tr') {
      const cells = node.childNodes.filter(child => ['th','td'].includes(child.tagName));
      return cells.map(cell => blankEdges(walk(cell, depth)).trim()).join(' | ') + '\n';
    }
    const text = children(node, depth);
    if (tag === 'a') {
      const href = node.attrs.find(attr => attr.name === 'href')?.value;
      return href && visibleText(node).trim() !== href ? text + ' (' + href + ')' : text;
    }
    if (['h1','h2','h3','h4','h5','h6','p','blockquote','div','table','details','summary'].includes(tag)) return '\n\n' + blankEdges(text).trim() + '\n\n';
    return text;
  }
  const prose = walk(fragment).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return prose.replace(new RegExp(prefix + '(\\d+)\uE001', 'g'), (_, i) => literal[Number(i)]);
}

export function prepareRichText(input) {
  const result = {ok: false, html: '', plainText: '', diagnostics: [], profileVersion: PROFILE_VERSION, sanitizationChanged: false};
  try {
    if (typeof input !== 'string') reject('INVALID_INPUT', 'Supply one HTML fragment as text.');
    if (input.length > MAX_BYTES || encoder.encode(input).length > MAX_BYTES) reject('TOO_LARGE', 'The fragment exceeds the processing limit of 65,536 UTF-8 bytes.');
    if (/[\uD800-\uDFFF]/u.test(input)) reject('INVALID_UNICODE', 'The fragment contains an unpaired UTF-16 surrogate. Supply complete Unicode characters.');
    const normalized = normalize(input);
    if (normalized.error) reject('INVALID_FENCE', normalized.error);
    if (!normalized.html) reject('EMPTY_INPUT', 'Paste an HTML fragment to begin.');
    const fragment = inspectStructure(normalized.html);
    function sanitize(node) {
      if (node.tagName) attributes(node);
      for (const child of node.childNodes || []) sanitize(child);
    }
    sanitize(fragment);
    const visible = visibleText(fragment);
    if (!visible.trim()) reject('EMPTY_CONTENT', 'The fragment has no visible text to prepare.');
    // Encode runs that might otherwise close the enclosing Markdown fence.
    const html = serialize(fragment).replace(/`{3,}/g, run => '&#96;'.repeat(run.length));
    if (encoder.encode(html).length > MAX_BYTES) reject('TOO_LARGE', 'The prepared representation exceeds the processing limit of 65,536 UTF-8 bytes.');
    const diagnostics = normalized.unwrapped ? [{code: 'FENCE_REMOVED', message: 'The matching outer code fence was removed.'}] : [];
    return {...result, ok: true, html, plainText: plainText(fragment, visible + html), diagnostics, sanitizationChanged: html !== input};
  } catch (error) {
    if (!(error instanceof ProfileError)) throw error;
    result.diagnostics.push({code: error.code, message: error.message});
    return result;
  }
}
