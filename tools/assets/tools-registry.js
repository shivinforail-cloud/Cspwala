export const TOOL_CATEGORIES = [
  { id: 'all', name: 'All Tools', nameMr: 'सर्व टूल्स', icon: '✨' },
  { id: 'image', name: 'Image Tools', nameMr: 'इमेज टूल्स', icon: '🖼️' },
  { id: 'pdf', name: 'PDF Tools', nameMr: 'PDF टूल्स', icon: '📄' },
  { id: 'id-card', name: 'ID Card Tools', nameMr: 'आयडी कार्ड टूल्स', icon: '🪪' },
  { id: 'documents', name: 'Document Tools', nameMr: 'डॉक्युमेंट टूल्स', icon: '📝' },
  { id: 'event-card', name: 'Event Cards', nameMr: 'इव्हेंट कार्ड्स', icon: '💌' },
  { id: 'utility', name: 'Utility Tools', nameMr: 'उपयुक्त टूल्स', icon: '🧮' },
  { id: 'posters', name: 'Poster Studio', nameMr: 'पोस्टर स्टुडिओ', icon: '🎨' }
];

const w = (slug) => `./workspace/?tool=${encodeURIComponent(slug)}`;

export const TOOLS = [
  { id:'compress-image', slug:'compress-image', name:'Compress Image', nameMr:'इमेज कॉम्प्रेस करा', category:'image', icon:'🗜️', engine:'image', mode:'compress', descriptionMr:'JPG, PNG आणि WebP फोटो quality किंवा target KB प्रमाणे कमी करा.', keywords:['compress','image','photo','kb','size','कॉम्प्रेस','फोटो'], featured:true },
  { id:'passport-photo-maker', slug:'passport-photo-maker', name:'Passport Size Photo Maker', nameMr:'पासपोर्ट साईज फोटो मेकर', category:'image', icon:'📸', engine:'image', mode:'passport', descriptionMr:'फोटो crop करून 3.5×4.5 cm, 2×2 inch आणि print sheet तयार करा.', keywords:['passport','photo','sheet','3.5x4.5','पासपोर्ट','फोटो'], featured:true, beta:true },
  { id:'background-remover', slug:'background-remover', name:'Background Remover', nameMr:'फोटो बॅकग्राऊंड रिमूव्हर', category:'image', icon:'🪄', engine:'image', mode:'background', descriptionMr:'एकसमान रंगाची पार्श्वभूमी local color-key पद्धतीने remove किंवा replace करा.', keywords:['background','remove','transparent','बॅकग्राऊंड'], beta:true },
  { id:'resize-image-pixels', slug:'resize-image-pixels', name:'Resize Image In Pixels', nameMr:'इमेज Pixel मध्ये Resize करा', category:'image', icon:'📐', engine:'image', mode:'resize', descriptionMr:'Width, height, percentage, cm, mm, inch आणि DPI प्रमाणे फोटो resize करा.', keywords:['resize','pixels','dpi','cm','mm','रिसाईज'], featured:true },
  { id:'increase-image-size', slug:'increase-image-size', name:'Increase Image Size', nameMr:'इमेज साईज वाढवा', category:'image', icon:'🔍', engine:'image', mode:'upscale', descriptionMr:'फोटो 2×, 3× किंवा custom scale ने वाढवा आणि output quality निवडा.', keywords:['increase','upscale','enlarge','size','मोठा'], beta:true },
  { id:'universal-converter', slug:'universal-converter', name:'Universal Converter', nameMr:'युनिव्हर्सल इमेज कन्व्हर्टर', category:'image', icon:'🔁', engine:'image', mode:'convert', descriptionMr:'JPG, PNG आणि WebP फॉरमॅटमध्ये batch conversion करा.', keywords:['convert','jpg','png','webp','converter','कन्व्हर्ट'], featured:true },

  { id:'pdf-signature-verifier', slug:'pdf-signature-verifier', name:'PDF Signature Verifier', nameMr:'PDF डिजिटल स्वाक्षरी तपासणी', category:'pdf', icon:'✅', engine:'pdf', mode:'signature', descriptionMr:'PDF मध्ये signature objects व ByteRange तपासा; cryptographic verification वेगळे स्पष्ट दाखवा.', keywords:['pdf','signature','verify','dsc','esign','स्वाक्षरी'], beta:true },
  { id:'image-to-pdf', slug:'image-to-pdf', name:'Image to PDF', nameMr:'इमेज ते PDF', category:'pdf', icon:'🧾', engine:'pdf', mode:'image-to-pdf', descriptionMr:'अनेक फोटो निवडून A4 किंवा photo-size PDF तयार करा.', keywords:['image','pdf','photo','इमेज'], featured:true },
  { id:'compress-pdf', slug:'compress-pdf', name:'Compress PDF', nameMr:'PDF कॉम्प्रेस करा', category:'pdf', icon:'📉', engine:'pdf', mode:'compress', descriptionMr:'PDF pages rasterize करून portal upload साठी size कमी करा.', keywords:['compress','pdf','size','कॉम्प्रेस'], beta:true },
  { id:'pdf-to-image', slug:'pdf-to-image', name:'PDF to Image', nameMr:'PDF ते इमेज', category:'pdf', icon:'🖼️', engine:'pdf', mode:'pdf-to-image', descriptionMr:'PDF pages JPG किंवा PNG मध्ये convert करा.', keywords:['pdf','image','jpg','png','पीडीएफ'], featured:true },
  { id:'pdf-lock-unlock', slug:'pdf-lock-unlock', name:'PDF Lock / Unlock', nameMr:'PDF Lock / Unlock', category:'pdf', icon:'🔐', engine:'pdf', mode:'lock-unlock', descriptionMr:'Known password वापरून rasterized unlocked copy किंवा password-protected copy तयार करा.', keywords:['lock','unlock','password','pdf','पासवर्ड'], beta:true },
  { id:'pdf-ocr', slug:'pdf-ocr', name:'PDF OCR', nameMr:'PDF OCR', category:'pdf', icon:'🔎', engine:'pdf', mode:'ocr', descriptionMr:'Scanned PDF मधील English, Marathi किंवा Hindi text ओळखा.', keywords:['ocr','text','scan','pdf','मराठी'], beta:true },
  { id:'merge-pdf', slug:'merge-pdf', name:'Merge PDF', nameMr:'PDF एकत्र करा', category:'pdf', icon:'🧩', engine:'pdf', mode:'merge', descriptionMr:'अनेक PDF फाइल्स निवडलेल्या क्रमाने एकत्र करा.', keywords:['merge','combine','pdf','एकत्र'], featured:true },
  { id:'pdf-page-numbers', slug:'pdf-page-numbers', name:'PDF Page Numbers', nameMr:'PDF Page Numbers', category:'pdf', icon:'🔢', engine:'pdf', mode:'page-numbers', descriptionMr:'PDF च्या वर किंवा खाली page numbers जोडा.', keywords:['page','number','pdf','क्रमांक'] },
  { id:'pdf-watermark', slug:'pdf-watermark', name:'Add Watermark to PDF', nameMr:'PDF वर Watermark', category:'pdf', icon:'💧', engine:'pdf', mode:'watermark', descriptionMr:'Text watermark, opacity, rotation आणि page range निवडा.', keywords:['watermark','pdf','text','वॉटरमार्क'] },
  { id:'rearrange-pdf', slug:'rearrange-pdf', name:'Rearrange PDF Pages', nameMr:'PDF Pages क्रम बदला', category:'pdf', icon:'↕️', engine:'pdf', mode:'rearrange', descriptionMr:'Page order comma-separated क्रमाने बदलून नवीन PDF डाउनलोड करा.', keywords:['rearrange','order','pages','pdf','क्रम'] },
  { id:'remove-pdf-pages', slug:'remove-pdf-pages', name:'Remove PDF Pages', nameMr:'PDF Pages काढा', category:'pdf', icon:'🗑️', engine:'pdf', mode:'remove-pages', descriptionMr:'नको असलेले page numbers निवडून नवीन PDF तयार करा.', keywords:['remove','delete','pages','pdf','काढा'] },

  ...[
    ['aadhaar-cropper','Aadhaar Cropper','आधार कार्ड क्रॉपर','aadhaar'],
    ['pan-card-cropper','PAN Card Cropper','PAN कार्ड क्रॉपर','pan'],
    ['udid-cropper','UDID Cropper','UDID कार्ड क्रॉपर','udid'],
    ['voter-card-cropper','Voter Card Cropper','मतदार कार्ड क्रॉपर','voter'],
    ['e-shram-cropper','E-Shram Cropper','ई-श्रम कार्ड क्रॉपर','eshram'],
    ['ayushman-cropper','Ayushman Cropper','आयुष्मान कार्ड क्रॉपर','ayushman'],
    ['abha-cropper','ABHA Cropper','ABHA कार्ड क्रॉपर','abha'],
    ['ration-card-cropper','Ration Card Cropper','रेशन कार्ड क्रॉपर','ration'],
    ['learner-licence-cropper','Learner Licence Cropper','Learner Licence क्रॉपर','learner'],
    ['mahaid-cropper','MahaID Cropper','महा-ID क्रॉपर','mahaid']
  ].map(([slug,name,nameMr,preset],index)=>({ id:slug, slug, name, nameMr, category:'id-card', icon:'🪪', engine:'id-card', mode:preset, descriptionMr:'Image किंवा PDF मधून card front/back crop करून print sheet तयार करा.', keywords:[name.toLowerCase(),'cropper','id card','क्रॉपर'], beta:true, featured:index<2 })),

  ...[
    ['pikpera-declaration','Pikpera Self Declaration Letter (PMFBY)','पीकपेरा स्वयंघोषणापत्र','pikpera'],
    ['residence-declaration','Residence Self-Declaration','रहिवासी स्वयंघोषणापत्र','residence'],
    ['age-declaration','Age Declaration Letter','वयाबाबत स्वयंघोषणापत्र','age'],
    ['family-tree-maker','Family Tree Maker','वंशावळ / Family Tree Maker','family-tree'],
    ['alive-declaration','Alive Self Declaration Letter','हयात स्वयंघोषणापत्र','alive'],
    ['widow-declaration','Widow Self Declaration Letter','विधवा स्वयंघोषणापत्र','widow'],
    ['deserted-woman-declaration','Deserted Woman Self Declaration Letter','परित्यक्ता महिला स्वयंघोषणापत्र','deserted'],
    ['caste-scrutiny-form-17','Caste Scrutiny Affidavit (Form-17)','जात पडताळणी प्रतिज्ञापत्र Form-17','form17'],
    ['caste-affidavit-form-3','Caste Affidavit Form-3 with Family Tree','जात प्रतिज्ञापत्र Form-3 व वंशावळ','form3']
  ].map(([slug,name,nameMr,template],index)=>({ id:slug, slug, name, nameMr, category:'documents', icon:'📝', engine:'document', mode:template, descriptionMr:'माहिती भरून A4 print-ready draft तयार करा. अंतिम वापरापूर्वी संबंधित प्राधिकरणाकडून तपासा.', keywords:[name.toLowerCase(),'declaration','document','स्वयंघोषणापत्र'], featured:index<3 })),

  { id:'marriage-biodata', slug:'marriage-biodata', name:'Marriage Bio-data Maker', nameMr:'विवाह बायोडाटा मेकर', category:'event-card', icon:'👤', engine:'event', mode:'biodata', descriptionMr:'मराठी किंवा English विवाह बायोडाटा image तयार करा.', keywords:['marriage','biodata','विवाह','बायोडाटा'], featured:true, beta:true },
  { id:'marriage-invitation', slug:'marriage-invitation', name:'Marriage Invitation Card Maker', nameMr:'लग्नपत्रिका मेकर', category:'event-card', icon:'💍', engine:'event', mode:'invitation', descriptionMr:'नाव, तारीख, वेळ, स्थळ आणि फोटो वापरून invitation card तयार करा.', keywords:['marriage','invitation','लग्नपत्रिका','wedding'], featured:true, beta:true },

  { id:'pmfby-premium-calculator', slug:'pmfby-premium-calculator', name:'PMFBY Premium Calculator', nameMr:'PMFBY पीक विमा प्रीमियम कॅल्क्युलेटर', category:'utility', icon:'🌾', engine:'utility', mode:'pmfby', descriptionMr:'क्षेत्रफळ × अधिकृत ₹/हेक्टर दर वापरून प्रीमियम मोजा आणि existing district-wise calculator उघडा.', keywords:['pmfby','premium','crop','पीक विमा'], featured:true },
  { id:'poster-brand-editor', slug:'poster-brand-editor', name:'Poster Brand Editor', nameMr:'पोस्टर ब्रँड एडिटर', category:'posters', icon:'🎨', engine:'poster', mode:'brand', descriptionMr:'आपला poster upload करून दुकानाचे नाव, मोबाईल, पत्ता आणि watermark जोडा.', keywords:['poster','brand','shop','watermark','पोस्टर'], featured:true, beta:true }
].map(tool => ({ status:'active', accessType:'free', processingType:'local', href:w(tool.slug), ...tool }));

export function getTool(slug) { return TOOLS.find(tool => tool.slug === slug) || null; }
