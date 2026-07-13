export const DEFAULT_POSTERS = [
  {id:'gov-certificate-01',title:'शासकीय दाखले सेवा',category:'government',theme:'red-gold',published:true,background:'#fff7ec',accent:'#8f1d1d',previewText:'जात • उत्पन्न • रहिवासी • नॉन-क्रीमीलेयर'},
  {id:'farmer-01',title:'शेतकरी योजना व PMFBY',category:'agriculture',theme:'green-trust',published:true,background:'#effaf2',accent:'#166534',previewText:'Farmer ID • MahaDBT • PMFBY • PM-Kisan'},
  {id:'banking-01',title:'बँकिंग आणि AEPS सेवा',category:'banking',theme:'corporate-blue',published:true,background:'#edf6ff',accent:'#174f86',previewText:'AEPS • DBT • Deposit • Withdrawal'},
  {id:'education-01',title:'Admission व Scholarship',category:'education',theme:'purple-digital',published:true,background:'#f7efff',accent:'#6b2fa0',previewText:'Admission • Scholarship • CET • Exam Form'},
  {id:'digital-01',title:'CSC Digital Services',category:'digital',theme:'orange-blue',published:true,background:'#fff5e8',accent:'#1556a0',previewText:'Online Form • Print • Scan • eSign'}
];

export const LIBRARY_KEY='cspwala_admin_poster_library_v1';
export const SAVED_TEMPLATE_KEY='cspwala_saved_ad_templates_v1';

export function getPosterLibrary(){
  const custom=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]');
  return [...DEFAULT_POSTERS,...custom].filter(p=>p.published!==false);
}

export function getAllAdminPosters(){
  return [...DEFAULT_POSTERS.map(p=>({...p,system:true})),...JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]')];
}

export function saveCustomPosters(posters){localStorage.setItem(LIBRARY_KEY,JSON.stringify(posters.filter(p=>!p.system)))}
