import {SERVICE_GROUPS,DIALOGUES,ACTIONS,FLOWS,TEMPLATE_STYLES,HEADER_LAYOUTS,FOOTER_LAYOUTS,getPublishedPosters} from './poster-library.js';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const canvas=$('#posterCanvas'),ctx=canvas.getContext('2d');
const state={source:'library',poster:null,posterImage:null,logo:null,qr:null,style:'royal',header:[],footer:[],badge:[],zone:'header'};
const limits={header:6,footer:7,badge:2};
const status=t=>$('#builderStatus').textContent=t||'';
const loadImage=file=>new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>res({img,url});img.onerror=()=>rej(Error('Image load झाली नाही'));img.src=url});
const fit=(text,max,font)=>{ctx.font=font;let t=text;while(ctx.measureText(t).width>max&&t.length>6)t=t.slice(0,-1);return t.length<text.length?t+'…':t};
function populate(){
  $('#dialogue').innerHTML=DIALOGUES.map(x=>`<option>${x}</option>`).join('');
  $('#action').innerHTML=ACTIONS.map(x=>`<option>${x}</option>`).join('');
  $('#headerLayout').innerHTML=HEADER_LAYOUTS.map(x=>`<option>${x}</option>`).join('');
  $('#footerLayout').innerHTML=FOOTER_LAYOUTS.map(x=>`<option>${x}</option>`).join('');
  $('#styleGrid').innerHTML=TEMPLATE_STYLES.map(s=>`<button class="style-option ${s.id===state.style?'selected':''}" data-style="${s.id}"><span class="style-colors">${s.colors.map(c=>`<span style="background:${c}"></span>`).join('')}</span><b>${s.name}</b></button>`).join('');
  $('#serviceGroups').innerHTML=Object.entries(SERVICE_GROUPS).map(([k,v])=>`<details class="service-group"><summary>${k.toUpperCase()}</summary><div class="service-options">${v.map(x=>`<button class="service-chip" data-service="${x}">${x}</button>`).join('')}</div></details>`).join('');
}
function library(){
  const posters=getPublishedPosters();
  $('#libraryGrid').innerHTML=posters.map(p=>`<button class="library-card ${state.poster?.id===p.id?'selected':''}" data-poster="${p.id}"><div class="library-poster" style="background:${p.imageData?`url(${p.imageData}) center/cover`:`linear-gradient(160deg,${p.gradient?.[0]||'#eef7f8'},${p.gradient?.[1]||'#dce9ee'})`}"><div class="mini-header">CSPWALA Advertisement</div><div class="library-body">${p.headline}<br><small>${p.subline||''}</small></div><div class="mini-footer">Business Details + CTA</div></div><div class="library-meta"><strong>${p.title}</strong><small>${p.category} • ${p.topic}</small></div></button>`).join('');
}
function selectedPoster(){
  $('#selectedPosterInfo').innerHTML=state.poster?`<b>${state.poster.title}</b><br><small>${state.poster.category} • ${state.poster.topic}</small>`:state.posterImage?'<b>Uploaded Poster</b><br><small>User image selected</small>':'Poster Library मधून poster निवडा किंवा upload करा.';
}
async function pickPoster(id){
  state.poster=getPublishedPosters().find(x=>x.id===id)||null;state.posterImage=null;state.source='library';
  if(state.poster?.style)state.style=state.poster.style;
  if(state.poster?.headline)$('#dialogue').value=state.poster.headline;
  if(state.poster?.imageData){const im=new Image();im.src=state.poster.imageData;await im.decode();state.posterImage=im}
  $$('.source-card').forEach(x=>x.classList.toggle('active',x.dataset.source==='library'));
  selectedPoster();library();populateStyles();render();
}
function populateStyles(){$$('.style-option').forEach(x=>x.classList.toggle('selected',x.dataset.style===state.style));}
function services(){
  const all=[...state.header.map(x=>`H: ${x}`),...state.footer.map(x=>`F: ${x}`),...state.badge.map(x=>`B: ${x}`)];
  $('#selectedServices').innerHTML=all.map(x=>`<span class="selected-token">${x}</span>`).join('')||'<span class="muted">सेवा निवडलेल्या नाहीत</span>';
  $$('.service-chip').forEach(b=>b.classList.toggle('selected',state[state.zone].includes(b.dataset.service)));
}
function addService(name){const arr=state[state.zone];const i=arr.indexOf(name);if(i>=0)arr.splice(i,1);else if(arr.length<limits[state.zone])arr.push(name);else return status(`${state.zone} मध्ये जास्तीत जास्त ${limits[state.zone]} services.`);services();render()}
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawBase(w,h){
  ctx.clearRect(0,0,w,h);
  if(state.posterImage){const img=state.posterImage,scale=Math.max(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh)}
  else{const p=state.poster||{gradient:['#eef7f8','#dce9ee'],headline:'आपली जाहिरात येथे',subline:'Poster Library मधून निवडा'};const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,p.gradient?.[0]||'#eef7f8');g.addColorStop(1,p.gradient?.[1]||'#dce9ee');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);roundRect(w*.08,h*.23,w*.84,h*.48,30,'rgba(255,255,255,.88)');ctx.fillStyle='#163642';ctx.textAlign='center';ctx.font=`800 ${Math.round(w*.065)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit(p.headline,w*.74,ctx.font),w/2,h*.45);ctx.font=`600 ${Math.round(w*.032)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit(p.subline,w*.72,ctx.font),w/2,h*.52)}
}
function drawHeader(w,h,style){
  const H=Math.min(+$('#headerHeight').value/1350*h,h*.28),r=+$('#radius').value/1080*w,fs=+$('#fontScale').value/100,c=style.colors;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=+$('#shadow').value/1080*w;roundRect(w*.025,h*.02,w*.95,H,r,c[2]);ctx.shadowBlur=0;ctx.fillStyle=c[0];ctx.fillRect(w*.025,h*.02,w*.95,H*.16);ctx.textAlign='center';ctx.fillStyle=c[0];ctx.font=`900 ${Math.round(w*.047*fs)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit($('#businessName').value,w*.78,ctx.font),w/2,h*.095+H*.24);ctx.fillStyle=c[1];ctx.font=`800 ${Math.round(w*.025*fs)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit($('#dialogue').value,w*.72,ctx.font),w/2,h*.135+H*.28);
  const items=state.header.slice(0,6),tw=w*.13,ty=h*.02+H*.67;items.forEach((s,i)=>{const total=items.length*tw+(items.length-1)*w*.012,x=(w-total)/2+i*(tw+w*.012);roundRect(x,ty,tw,H*.18,12,i%2?c[1]:c[0]);ctx.fillStyle=i%2?'#211a05':'#fff';ctx.font=`800 ${Math.round(w*.017*fs)}px sans-serif`;ctx.fillText(fit(s,tw*.86,ctx.font),x+tw/2,ty+H*.12)});ctx.restore()
}
function drawFooter(w,h,style){
  const F=Math.min(+$('#footerHeight').value/1350*h,h*.32),y=h-F-h*.018,r=+$('#radius').value/1080*w,c=style.colors,fs=+$('#fontScale').value/100;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=+$('#shadow').value/1080*w;roundRect(w*.025,y,w*.95,F,r,c[0]);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font=`900 ${Math.round(w*.034*fs)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit($('#businessName').value,w*.58,ctx.font),w*.07,y+F*.25);
  ctx.font=`600 ${Math.round(w*.022*fs)}px "Noto Sans Devanagari",sans-serif`;ctx.fillText(fit(`${$('#ownerName').value} • ${$('#address').value}`,w*.60,ctx.font),w*.07,y+F*.42);
  roundRect(w*.70,y+F*.15,w*.23,F*.24,18,c[1]);ctx.fillStyle='#1e1604';ctx.textAlign='center';ctx.font=`900 ${Math.round(w*.025*fs)}px sans-serif`;ctx.fillText(fit($('#action').value,w*.20,ctx.font),w*.815,y+F*.31);
  ctx.fillStyle='#fff';ctx.font=`700 ${Math.round(w*.022*fs)}px sans-serif`;ctx.fillText(fit(`${$('#mobile').value||'Mobile'} • ${$('#whatsapp').value||'WhatsApp'}`,w*.78,ctx.font),w/2,y+F*.60);
  const items=state.footer.slice(0,7),tw=w*.115,ty=y+F*.70;items.forEach((s,i)=>{const total=items.length*tw+(items.length-1)*w*.008,x=(w-total)/2+i*(tw+w*.008);roundRect(x,ty,tw,F*.16,10,i%2?c[2]:c[1]);ctx.fillStyle=i%2?c[0]:'#211a05';ctx.font=`800 ${Math.round(w*.014*fs)}px sans-serif`;ctx.fillText(fit(s,tw*.86,ctx.font),x+tw/2,ty+F*.105)});ctx.restore()
}
function drawFlow(w,h,style){const flow=FLOWS[$('#flow').value]||[];if(!flow.length)return;const y=h*.73,c=style.colors,box=w*.15,g=w*.015,total=flow.length*box+(flow.length-1)*g;flow.forEach((s,i)=>{const x=(w-total)/2+i*(box+g);roundRect(x,y,box,h*.055,14,'rgba(255,255,255,.92)',c[0]);ctx.fillStyle=c[0];ctx.textAlign='center';ctx.font=`800 ${Math.round(w*.017)}px sans-serif`;ctx.fillText(fit(`${i+1}. ${s}`,box*.88,ctx.font),x+box/2,y+h*.035)})}
function drawWatermark(w,h){if($('#watermark').value!=='on')return;ctx.save();ctx.globalAlpha=+$('#watermarkOpacity').value/100;ctx.fillStyle='#092d42';ctx.font=`900 ${Math.round(w*.035)}px sans-serif`;ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/6);for(let y=-h;y<h;y+=h*.18)for(let x=-w;x<w;x+=w*.34)ctx.fillText('CSPWALA.IN',x,y);ctx.restore()}
function render(target=canvas,part='full'){
  const [w,h]=$('#outputSize').value.split(',').map(Number);target.width=w;target.height=h;const style=TEMPLATE_STYLES.find(x=>x.id===state.style)||TEMPLATE_STYLES[0];drawBase(w,h);drawWatermark(w,h);if(part!=='footer')drawHeader(w,h,style);if(part==='full')drawFlow(w,h,style);if(part!=='header')drawFooter(w,h,style)
}
function download(part='full'){const temp=document.createElement('canvas');render(temp,part);temp.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cspwala-${part}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},'image/png',1)}
function saveTemplate(){const key='cspwala_saved_ad_templates',arr=JSON.parse(localStorage.getItem(key)||'[]');if(arr.length>=5)return status('जास्तीत जास्त 5 templates save करता येतील.');const data={id:crypto.randomUUID(),name:$('#businessName').value||'Saved Template',createdAt:Date.now(),fields:Object.fromEntries($$('input,select,textarea','.builder-controls').filter(x=>x.type!=='file').map(x=>[x.id,x.value])),services:{header:[...state.header],footer:[...state.footer],badge:[...state.badge]},style:state.style,posterId:state.poster?.id||null};arr.unshift(data);localStorage.setItem(key,JSON.stringify(arr));saved();status('Template save झाले.')}
function loadSaved(item){Object.entries(item.fields||{}).forEach(([id,v])=>{const el=$(`#${id}`);if(el)el.value=v});state.header=[...(item.services?.header||[])];state.footer=[...(item.services?.footer||[])];state.badge=[...(item.services?.badge||[])];state.style=item.style||'royal';if(item.posterId)pickPoster(item.posterId);services();populateStyles();render();status('Saved template load झाले.')}
function saved(){const key='cspwala_saved_ad_templates',arr=JSON.parse(localStorage.getItem(key)||'[]');$('#savedCount').textContent=`${arr.length}/5`;$('#savedTemplates').innerHTML=arr.map(x=>`<div class="saved-item"><span>${x.name}</span><button data-load="${x.id}">Open</button><button data-delete="${x.id}">×</button></div>`).join('')||'<small class="muted">अजून template save नाही.</small>';$('#savedTemplates').onclick=e=>{const l=e.target.dataset.load,d=e.target.dataset.delete;if(l)loadSaved(arr.find(x=>x.id===l));if(d){localStorage.setItem(key,JSON.stringify(arr.filter(x=>x.id!==d)));saved()}}}
function bind(){
  $$('.source-card').forEach(b=>b.onclick=()=>{state.source=b.dataset.source;$$('.source-card').forEach(x=>x.classList.toggle('active',x===b));if(state.source==='upload')$('#posterUpload').click()});
  $('#libraryGrid').onclick=e=>{const b=e.target.closest('[data-poster]');if(b)pickPoster(b.dataset.poster)};
  $('#posterUpload').onchange=async()=>{const f=$('#posterUpload').files[0];if(!f)return;if(f.size>15*1024*1024)return status('Poster max 15 MB.');const {img,url}=await loadImage(f);state.posterImage=img;state.poster=null;state.source='upload';selectedPoster();library();render();setTimeout(()=>URL.revokeObjectURL(url),30000)};
  $('#logoUpload').onchange=async()=>{const f=$('#logoUpload').files[0];if(f)state.logo=(await loadImage(f)).img};$('#qrUpload').onchange=async()=>{const f=$('#qrUpload').files[0];if(f)state.qr=(await loadImage(f)).img};
  $$('.tab').forEach(b=>b.onclick=()=>{state.zone=b.dataset.zone;$$('.tab').forEach(x=>x.classList.toggle('active',x===b));services()});
  $('#serviceGroups').onclick=e=>{const b=e.target.closest('[data-service]');if(b){e.preventDefault();addService(b.dataset.service)}};
  $('#addCustomService').onclick=()=>{const v=$('#customService').value.trim();if(v){addService(v);$('#customService').value=''}};
  $('#styleGrid').onclick=e=>{const b=e.target.closest('[data-style]');if(b){state.style=b.dataset.style;populateStyles();render()}};
  $$('#businessName,#ownerName,#mobile,#whatsapp,#address,#website,#email,#dialogue,#action,#flow,#headerLayout,#footerLayout,#headerHeight,#footerHeight,#fontScale,#radius,#shadow,#watermark,#watermarkOpacity,#outputSize').forEach(el=>el.addEventListener(el.type==='range'?'input':'change',()=>render()));
  $('#refreshPreview').onclick=()=>render();$('#downloadFull').onclick=()=>download('full');$('#downloadHeader').onclick=()=>download('header');$('#downloadFooter').onclick=()=>download('footer');$('#saveTemplate').onclick=saveTemplate;
}
populate();library();selectedPoster();services();saved();bind();pickPoster(getPublishedPosters()[0]?.id);render();
