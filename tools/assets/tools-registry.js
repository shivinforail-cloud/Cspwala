export const TOOL_CATEGORIES = [
  { id: "all", name: "All Tools", nameMr: "सर्व टूल्स" },
  { id: "image", name: "Image Tools", nameMr: "इमेज टूल्स" },
  { id: "pdf", name: "PDF Tools", nameMr: "PDF टूल्स" },
  { id: "photo", name: "Photo Tools", nameMr: "फोटो टूल्स" },
  { id: "document", name: "Document Tools", nameMr: "डॉक्युमेंट टूल्स" },
  { id: "calculator", name: "Calculators", nameMr: "कॅल्क्युलेटर" }
];

export const TOOLS = [
  {
    id: "image-compressor",
    slug: "image-compressor",
    name: "Image Compressor",
    nameMr: "इमेज कॉम्प्रेसर",
    description: "Compress JPG, PNG and WebP images locally with custom quality and target size.",
    descriptionMr: "JPG, PNG आणि WebP फोटो मोबाईलमध्येच सुरक्षितपणे कॉम्प्रेस करा.",
    category: "image",
    icon: "🗜️",
    status: "active",
    isNew: true,
    keywords: ["compress", "image", "photo", "kb", "size", "फोटो", "कॉम्प्रेस", "इमेज", "केबी"],
    href: "./image-compressor/"
  },
  {
    id: "image-resizer",
    slug: "image-resizer",
    name: "Image Resizer",
    nameMr: "इमेज रिसायझर",
    description: "Resize an image by pixels, percentage, centimetres, millimetres or inches.",
    descriptionMr: "फोटोचे pixel, टक्केवारी, cm, mm किंवा inch प्रमाणे माप बदला.",
    category: "image",
    icon: "📐",
    status: "active",
    isNew: true,
    keywords: ["resize", "pixel", "dpi", "cm", "mm", "passport", "रिसाईज", "पिक्सेल", "डीपीआय"],
    href: "./image-resizer/"
  },
  {
    id: "image-converter",
    slug: "image-converter",
    name: "Image Converter",
    nameMr: "इमेज कन्व्हर्टर",
    description: "Convert multiple images between JPG, PNG and WebP formats.",
    descriptionMr: "अनेक फोटो JPG, PNG किंवा WebP फॉरमॅटमध्ये कन्व्हर्ट करा.",
    category: "image",
    icon: "🔁",
    status: "active",
    isNew: true,
    keywords: ["convert", "jpg", "png", "webp", "format", "कन्वर्ट", "फॉरमॅट"],
    href: "./image-converter/"
  },
  {
    id: "signature-resizer",
    slug: "signature-resizer",
    name: "Signature Resizer",
    nameMr: "स्वाक्षरी रिसायझर",
    description: "Crop, clean and resize signatures for online forms.",
    descriptionMr: "ऑनलाईन फॉर्मसाठी स्वाक्षरी crop, clean आणि resize करा.",
    category: "photo",
    icon: "✍️",
    status: "coming-soon",
    keywords: ["signature", "sign", "crop", "स्वाक्षरी", "सही"],
    href: "#"
  },
  {
    id: "image-to-pdf",
    slug: "image-to-pdf",
    name: "Image to PDF",
    nameMr: "इमेज ते PDF",
    description: "Arrange multiple photos and create a print-ready PDF.",
    descriptionMr: "अनेक फोटो योग्य क्रमाने लावून PDF तयार करा.",
    category: "pdf",
    icon: "🧾",
    status: "coming-soon",
    keywords: ["image pdf", "photo pdf", "इमेज पीडीएफ"],
    href: "#"
  },
  {
    id: "merge-pdf",
    slug: "merge-pdf",
    name: "Merge PDF",
    nameMr: "PDF एकत्र करा",
    description: "Combine multiple PDF files in your preferred order.",
    descriptionMr: "अनेक PDF फाइल्स आपल्या क्रमाने एकत्र करा.",
    category: "pdf",
    icon: "🧩",
    status: "coming-soon",
    keywords: ["merge", "combine", "pdf", "एकत्र"],
    href: "#"
  },
  {
    id: "pdf-signature-verifier",
    slug: "pdf-signature-verifier",
    name: "PDF Signature Verifier",
    nameMr: "PDF ई-साइन तपासणी",
    description: "Inspect embedded digital signatures without making false validity claims.",
    descriptionMr: "PDF मधील डिजिटल स्वाक्षरीची तांत्रिक माहिती तपासा.",
    category: "pdf",
    icon: "✅",
    status: "coming-soon",
    keywords: ["esign", "signature", "verify", "pdf", "ई-साइन", "स्वाक्षरी"],
    href: "#"
  },
  {
    id: "pmfby-calculator",
    slug: "pmfby-calculator",
    name: "PMFBY Calculator",
    nameMr: "पीक विमा कॅल्क्युलेटर",
    description: "District-wise crop insurance premium calculator with validity information.",
    descriptionMr: "जिल्हानिहाय पीक विमा प्रीमियम आणि क्षेत्रफळ कॅल्क्युलेटर.",
    category: "calculator",
    icon: "🌾",
    status: "coming-soon",
    keywords: ["pmfby", "crop", "premium", "पीक विमा", "प्रीमियम"],
    href: "#"
  }
];
