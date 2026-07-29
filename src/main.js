import QRCode from "qrcode";
import "./style.css";

const content = document.querySelector("#qr-content");
const contentLabel = document.querySelector("#content-label");
const typeOptions = document.querySelectorAll(".type-option");
const charCount = document.querySelector("#char-count");
const darkColor = document.querySelector("#dark-color");
const lightColor = document.querySelector("#light-color");
const darkValue = document.querySelector("#dark-value");
const lightValue = document.querySelector("#light-value");
const size = document.querySelector("#qr-size");
const sizeOutput = document.querySelector("#size-output");
const canvas = document.querySelector("#qr-canvas");
const downloadButton = document.querySelector("#download-button");
const status = document.querySelector("#status");

let renderTimer;
let contentType = "link";

function readableColor(value) {
  return value.toUpperCase();
}

async function drawQr() {
  const text = content.value.trim();
  charCount.textContent = `${content.value.length} / 2000`;
  darkValue.textContent = readableColor(darkColor.value);
  lightValue.textContent = readableColor(lightColor.value);
  sizeOutput.textContent = `${size.value} px`;

  if (!text) {
    canvas.hidden = true;
    downloadButton.disabled = true;
    status.textContent = "Digite um texto ou link para gerar";
    return;
  }

  canvas.hidden = false;
  downloadButton.disabled = false;

  try {
    await QRCode.toCanvas(canvas, text, {
      width: 360,
      margin: 3,
      errorCorrectionLevel: "H",
      color: {
        dark: darkColor.value,
        light: lightColor.value,
      },
    });
    status.textContent = "Pronto para baixar em alta qualidade";
  } catch {
    status.textContent = "Não foi possível gerar este QR Code";
  }
}

function scheduleDraw() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(drawQr, 80);
}

function selectContentType(type) {
  contentType = type;

  typeOptions.forEach((option) => {
    const selected = option.dataset.type === type;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-pressed", String(selected));
  });

  if (type === "link") {
    contentLabel.textContent = "Cole seu link";
    content.placeholder = "https://seusite.com";
    content.inputMode = "url";
  } else {
    contentLabel.textContent = "Digite seu texto";
    content.placeholder = "Escreva sua mensagem aqui…";
    content.inputMode = "text";
  }

  content.focus();
  scheduleDraw();
}

async function downloadQr() {
  const text = content.value.trim();
  if (!text) return;

  downloadButton.disabled = true;
  status.textContent = "Preparando seu arquivo…";

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: Number(size.value),
      margin: 4,
      errorCorrectionLevel: "H",
      rendererOpts: { quality: 1 },
      color: {
        dark: darkColor.value,
        light: lightColor.value,
      },
    });

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qrcode-${size.value}px.png`;
    link.click();
    status.textContent = `PNG de ${size.value} px baixado`;
  } catch {
    status.textContent = "Não foi possível baixar o arquivo";
  } finally {
    downloadButton.disabled = false;
  }
}

[content, darkColor, lightColor, size].forEach((element) => {
  element.addEventListener("input", scheduleDraw);
});

typeOptions.forEach((option) => {
  option.addEventListener("click", () => selectContentType(option.dataset.type));
});

downloadButton.addEventListener("click", downloadQr);
drawQr();
