import {prepareRichText} from './converter-core.mjs';

const source = document.getElementById('source');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
function updateStatus(message, kind = '') {
  status.className = kind;
  status.textContent = message;
}
function render() {
  const result = prepareRichText(source.value);
  preview.replaceChildren();
  if (!result.ok) {
    const diagnostic = result.diagnostics[0];
    const empty = diagnostic.code === 'EMPTY_INPUT';
    if (empty) {
      const label = document.createElement('p');
      label.className = 'empty';
      label.textContent = 'Your formatted content will appear here.';
      preview.appendChild(label);
    }
    updateStatus(diagnostic.message, empty ? '' : 'warn');
    return null;
  }
  // Only the shared core's allowlisted, serialized output enters the live DOM.
  preview.innerHTML = result.html;
  const note = result.diagnostics.map(diagnostic => diagnostic.message).join(' ');
  updateStatus([note, 'Preview ready. Check the formatting, then choose Copy Rich Text.'].filter(Boolean).join(' '));
  return result;
}
function selectPreview(){const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(preview);selection.removeAllRanges();selection.addRange(range);}
document.getElementById('paste').addEventListener('click',async()=>{
 try{
  if(!navigator.clipboard?.readText)throw new Error('Clipboard read unavailable');
  const t=await navigator.clipboard.readText();
  if(!t.trim())throw new Error('Clipboard is empty');
  source.value=t;
  if(render()){document.querySelector('.source-panel').open=false;status.className='success';}
 }catch(err){document.querySelector('.source-panel').open=true;source.focus();updateStatus('Automatic paste unavailable: '+String(err?.message||err)+'. Paste into the HTML source field using your device’s Paste action.','warn');}
});
source.addEventListener('input',render);
document.getElementById('select').addEventListener('click',()=>{
 if(!render())return;selectPreview();updateStatus('Preview selected. Use your device’s Copy action to copy the selected content.','warn');
});
document.getElementById('copy').addEventListener('click',async()=>{
 const result = render();
 if (!result) return;
 const html='<!doctype html><html><body>'+result.html+'</body></html>';
 const text=result.plainText;
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
