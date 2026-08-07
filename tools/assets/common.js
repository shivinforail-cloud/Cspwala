export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export function outputName(inputName, suffix, extension) {
  const base = safeFileName(inputName.replace(/\.[^.]+$/, "")) || "cspwala-image";
  return `${base}-${suffix}.${extension}`;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function validateImageFile(file) {
  if (!(file instanceof File)) return "Invalid file.";
  if (!file.type.startsWith("image/")) return `${file.name}: Unsupported file type.`;
  if (file.size > MAX_IMAGE_SIZE) return `${file.name}: Maximum file size is 20 MB.`;
  return "";
}

export async function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`${file.name} could not be decoded as an image.`);
  }
}

export function releaseImage(image) {
  if (image?.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The browser could not create the output image.")), type, quality);
  });
}

export function recordRecentTool(toolId) {
  const key = "cspwala_recent_tools";
  const current = JSON.parse(localStorage.getItem(key) || "[]").filter(item => item.id !== toolId);
  current.unshift({ id: toolId, openedAt: Date.now() });
  localStorage.setItem(key, JSON.stringify(current.slice(0, 8)));
}

export function bindDropzone(dropzone, input, onFiles) {
  const activate = () => input.click();
  dropzone.addEventListener("click", event => {
    if (!event.target.closest("button")) activate();
  });
  dropzone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
  ["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach(type => dropzone.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  }));
  dropzone.addEventListener("drop", event => onFiles(event.dataTransfer.files));
  input.addEventListener("change", () => onFiles(input.files));
}

export function showError(element, message = "") {
  element.textContent = message;
  element.classList.toggle("show", Boolean(message));
}

export function setProgress(bar, value) {
  bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}
