(()=>{
'use strict';
const source=document.getElementById('source');
const preview=document.getElementById('preview');
const status=document.getElementById('status');
const allow=new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SPAN','BR','STRONG','B','EM','I','U','MARK','S','DEL','SUP','SUB','UL','OL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DETAILS','SUMMARY','PRE','CODE','A','HR']);
const skip=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SVG','MATH','TEMPLATE','META','LINK','BASE','VIDEO','AUDIO','IMG']);
function updateStatus(message,kind='') {status.className=kind;status.textContent=message;}
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
function clean(node){
 if(node.nodeType===Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
 if(node.nodeType!==Node.ELEMENT_NODE) return document.createDocumentFragment();
 const tag=node.tagName.toUpperCase();
 if(skip.has(tag))return document.createDocumentFragment();
 if(!allow.has(tag)){
  const frag=document.createDocumentFragment();
  for(const child of [...node.childNodes])frag.appendChild(clean(child));
  return frag;
 }
 const el=document.createElement(tag.toLowerCase());
 const dir=(node.getAttribute('dir')||'').toLowerCase();
 if(['ltr','rtl','auto'].includes(dir))el.setAttribute('dir',dir);
 const lang=node.getAttribute('lang')||'';
 if(/^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[xi](?:-[A-Za-z0-9]{1,8})+)$/i.test(lang))el.setAttribute('lang',lang);
 if(tag==='A'){
  const href=node.getAttribute('href');
  const safe=href?safeHref(href):null;
  if(safe){el.setAttribute('href',safe);el.setAttribute('rel','noopener noreferrer');el.setAttribute('target','_blank');}
 }
 if(tag==='DETAILS'&&node.hasAttribute('open'))el.setAttribute('open','');
 if(tag==='OL'&&node.hasAttribute('start')){
  const value=node.getAttribute('start').trim();
  const n=Number(value);if(/^[+-]?\d+$/.test(value)&&Number.isSafeInteger(n))el.setAttribute('start',String(n));
 }
 if(['TH','TD'].includes(tag)){
  for(const attr of ['colspan','rowspan']){const n=Number(node.getAttribute(attr));if(Number.isInteger(n)&&n>=1&&n<=6)el.setAttribute(attr,String(n));}
  const align=(node.getAttribute('align')||'').toLowerCase();if(['left','center','right'].includes(align))el.setAttribute('align',align);
 }
 for(const child of [...node.childNodes])el.appendChild(clean(child));
 return el;
}
function normalize(text){
 let t=text.trim();
 const opening=t.match(/^(?:<\s*)?```[ \t]*(?:html)?[ \t]*\r?\n/i);
 const closing=t.match(/\r?\n```[ \t]*>?[ \t]*$/);
 if(opening||closing){
  if(!opening||!closing||opening[0].length+closing[0].length>=t.length)
   return {error:'Incomplete or malformed HTML code fence. Paste only the HTML fragment.'};
  t=t.slice(opening[0].length,t.length-closing[0].length).trim();
  if(!t||/^(?:<\s*)?```/.test(t))
   return {error:'Nested or malformed code fence. Paste one HTML fragment.'};
  return {html:t,unwrapped:true};
 }
 if(/^(?:<\s*)?```/.test(t)||/```[ \t]*>?[ \t]*$/.test(t))
  return {error:'Unmatched code fence detected. Copy only the HTML fragment.'};
 return {html:t,unwrapped:false};
}
// Reject truncated or mismatched markup before the HTML parser can repair it.
function completeFragment(text){
 const voids=new Set(['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR']);
 const stack=[];
 const tokens=/<!--[^]*?-->|<\/?([a-z][\w:-]*)(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>|[^<]+/giy;
 let match;
 while(tokens.lastIndex<text.length){
  match=tokens.exec(text);
  if(!match)return false;
  const token=match[0];
  if(!match[1])continue;
  const tag=match[1].toUpperCase();
  if(token.startsWith('</')){
   if(voids.has(tag)||!/^<\/[a-z][\w:-]*\s*>$/i.test(token)||stack.pop()!==tag)return false;
  }else if(!voids.has(tag)){
   if(/\/\s*>$/.test(token))return false;
   stack.push(tag);
  }
 }
 return stack.length===0;
}
function render(){
 const parsed=normalize(source.value);preview.replaceChildren();
 if(parsed.error){updateStatus(parsed.error,'warn');return false;}
 const text=parsed.html;
 if(!text){const p=document.createElement('p');p.className='empty';p.textContent='Your formatted content will appear here.';preview.appendChild(p);updateStatus('Paste an HTML fragment to begin.');return false;}
 if(![...text.matchAll(/<([a-z][\w:-]*)\b/gi)].some(match=>allow.has(match[1].toUpperCase()))){
  updateStatus('This does not look like supported HTML. Paste an HTML fragment with complete tags.','warn');return false;
 }
 if(!completeFragment(text)){updateStatus('Incomplete or mismatched HTML. Paste the complete HTML fragment.','warn');return false;}
 const doc=new DOMParser().parseFromString(text,'text/html');
 if([...doc.body.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())){
  updateStatus('Text was found outside HTML elements. Paste only your HTML fragment.','warn');return false;
 }
 for(const child of [...doc.body.childNodes])preview.appendChild(clean(child));
 if(!preview.textContent.trim()){updateStatus('No supported content was found to preview.','warn');return false;}
 updateStatus(parsed.unwrapped?'Code fences removed. Check the preview, then copy.':'Preview ready. Check the formatting, then choose Copy Rich Text.');return true;
}
function selectPreview(){const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(preview);selection.removeAllRanges();selection.addRange(range);}
function plainText(){
 // Protect literal code before normalizing prose and generated block spacing.
 // Choose a marker absent from both visible text and sanitized attributes.
 let prefix='\uE000HTMLTORICH';
 const occupied=preview.textContent+preview.innerHTML;
 while(occupied.includes(prefix))prefix+='_';
 const literal=[];
 const token=i=>prefix+i+'\uE001';
 const protect=text=>{const i=literal.push(text)-1;return token(i);};
 const blankEdges=text=>text.replace(/^[ \t]*\n(?:[ \t]*\n)*/,'').replace(/(?:\n[ \t]*)+$/,'');
 function item(li,depth,marker){
  let body=blankEdges([...li.childNodes].map(child=>walk(child,depth+1)).join('')).replace(/\n{2,}/g,'\n');
  const lines=body.split('\n');
  const indent='  '.repeat(depth),childIndent='  '.repeat(depth+1);
  const continuation=indent+' '.repeat(marker.length);
  const startsWithChild=lines[0].startsWith(childIndent);
  let first=startsWithChild?indent+marker.trimEnd()+'\n'+lines[0]:indent+marker+lines[0].trimStart();
  for(const line of lines.slice(1))first+='\n'+(line.startsWith(childIndent)?line:continuation+line);
  return first;
 }
 function walk(node,depth=0){
  if(node.nodeType===Node.TEXT_NODE)return node.nodeValue.replace(/[ \t\r\n\f]+/g,' ');
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  const tag=node.tagName;
  if(tag==='PRE')return '\n\n'+protect(node.textContent)+'\n\n';
  if(tag==='CODE')return protect(node.textContent);
  if(tag==='BR')return '\n';
  if(tag==='HR')return '\n\n---\n\n';
  if(tag==='UL'||tag==='OL'){
   let count=tag==='OL'&&node.hasAttribute('start')?BigInt(node.getAttribute('start')):1n;
   const entries=[];
   for(const child of [...node.childNodes]){
    if(child.nodeType===Node.ELEMENT_NODE&&child.tagName==='LI')entries.push(item(child,depth,tag==='OL'?(count++)+'. ':'• '));
    else if(child.textContent.trim())entries.push(walk(child,depth));
   }
   return '\n'+entries.join('\n')+'\n';
  }
  if(tag==='LI')return '\n'+item(node,depth,'• ')+'\n';
  if(tag==='TR'){
   const cells=[...node.children].filter(child=>['TH','TD'].includes(child.tagName));
   return cells.map(cell=>blankEdges(walk(cell,depth)).trim()).join(' | ')+'\n';
  }
  const text=[...node.childNodes].map(child=>walk(child,depth)).join('');
  if(tag==='A'){
   const href=node.getAttribute('href');
   return href&&node.textContent.trim()!==href?text+' ('+href+')':text;
  }
  if(['H1','H2','H3','H4','H5','H6','P','BLOCKQUOTE','DIV','TABLE','DETAILS','SUMMARY'].includes(tag))return '\n\n'+blankEdges(text).trim()+'\n\n';
  return text;
 }
 let text=walk(preview).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 for(let i=0;i<literal.length;i++)text=text.split(token(i)).join(literal[i]);
 return text;
}
async function writePlain(text){await navigator.clipboard.writeText(text);}
document.getElementById('paste').addEventListener('click',async()=>{
 try{
  if(!navigator.clipboard?.readText)throw new Error('Clipboard read unavailable');
  const t=await navigator.clipboard.readText();
  if(!t.trim())throw new Error('Clipboard is empty');
  source.value=t;
  if(render()){document.querySelector('.source-panel').open=false;updateStatus('HTML pasted. Check the preview, then choose Copy Rich Text.','success');}
 }catch(err){document.querySelector('.source-panel').open=true;source.focus();updateStatus('Automatic paste unavailable: '+String(err?.message||err)+'. Paste into the HTML source field using your device’s Paste action.','warn');}
});
source.addEventListener('input',render);
document.getElementById('select').addEventListener('click',()=>{
 if(!render())return;selectPreview();updateStatus('Preview selected. Use your device’s Copy action to copy the selected content.','warn');
});
document.getElementById('copy').addEventListener('click',async()=>{
 if(!render())return;
 const html='<!doctype html><html><body>'+preview.innerHTML+'</body></html>';
 const text=plainText();
 try{
  if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Rich clipboard API unavailable');
  await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
  updateStatus('Rich text copied. Paste into your destination app and check the result.','success');
 }catch(err){
  let copied=false;
  const handle=e=>{if(e.clipboardData){e.clipboardData.setData('text/html',html);e.clipboardData.setData('text/plain',text);e.preventDefault();copied=true;}};
  document.addEventListener('copy',handle,{once:true});
  try{selectPreview();document.execCommand('copy');}catch{}
  document.removeEventListener('copy',handle);
  updateStatus(copied?'Fallback rich copy used. Check the result in your destination app.':'Rich copy blocked: '+String(err?.message||err)+'. Try Select preview, then your device’s Copy action.',copied?'success':'warn');
 }
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
render();
})();

