import QRCode from "qrcode";
import { inflate } from "pako";
import "./style.css";

const content = document.querySelector("#qr-content");
const contentLabel = document.querySelector("#content-label");
const typeOptions = document.querySelectorAll(".type-option");
const generatedLink = document.querySelector("#generated-link");
const reviewLink = document.querySelector("#review-link");
const inputHelp = document.querySelector("#input-help");
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
let effectiveContent = content.value.trim();

function readableColor(value) {
  return value.toUpperCase();
}

function placeIdFromDataId(dataId) {
  try {
    const values = dataId.split(":").map((value) => BigInt(value));
    const bytes = [0x0a, 0x12, 0x09];

    for (let index = 0; index < 2; index += 1) {
      let value = values[index];
      if (index === 1) bytes.push(0x11);

      for (let byte = 0; byte < 8; byte += 1) {
        bytes.push(Number(value & 255n));
        value >>= 8n;
      }
    }

    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function decodeGoogleSearchEntity(value) {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const compressed = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(inflate(compressed));
    const dataId = decoded.match(/0x[a-f0-9]+:0x[a-f0-9]+/i)?.[0];
    if (!dataId) return null;

    return {
      dataId,
      placeId: placeIdFromDataId(dataId),
    };
  } catch {
    return null;
  }
}

function createGoogleReviewLink(value) {
  const input = value.trim();
  if (!input) return { link: "", error: "" };

  if (/search\.google\.com\/local\/writereview/i.test(input) || /\/review(?:[/?#]|$)/i.test(input)) {
    return { link: input, error: "" };
  }

  const businessProfile = input.match(/https?:\/\/g\.page\/r\/([^/?#]+)/i);
  if (businessProfile) {
    return { link: `https://g.page/r/${businessProfile[1]}/review`, error: "" };
  }

  let placeId = "";
  try {
    const url = new URL(input);
    placeId =
      url.searchParams.get("placeid") ||
      url.searchParams.get("query_place_id") ||
      url.searchParams.get("q")?.match(/place_id:([^&]+)/i)?.[1] ||
      "";

    if (!placeId && /google\.[^/]+\/search/i.test(url.href)) {
      const entity = decodeGoogleSearchEntity(url.searchParams.get("gs_ssp") || "");
      const businessName = url.searchParams.get("q") || url.searchParams.get("oq") || "";

      if (entity?.placeId && businessName) {
        return {
          link: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(entity.placeId)}`,
          error: "",
        };
      }
    }
  } catch {
    placeId = input.match(/(?:placeid|query_place_id)=([^&\s]+)/i)?.[1] || "";
  }

  if (!placeId) {
    placeId =
      input.match(/!1s(ChI[A-Za-z0-9_-]+)/)?.[1] ||
      input.match(/\b(ChI[A-Za-z0-9_-]{15,})\b/)?.[1] ||
      "";
  }

  if (placeId) {
    return {
      link: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(decodeURIComponent(placeId))}`,
      error: "",
    };
  }

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(input)) {
    return {
      link: "",
      error: "Este é um link curto. Abra-o no navegador e cole aqui o endereço completo exibido na barra.",
    };
  }

  return {
    link: "",
    error: "Não encontrei o identificador da empresa. Use o link completo do Google Maps ou o link “Pedir avaliações” do Perfil da Empresa.",
  };
}

async function drawQr() {
  const text = content.value.trim();
  charCount.textContent = `${content.value.length} / 2000`;
  darkValue.textContent = readableColor(darkColor.value);
  lightValue.textContent = readableColor(lightColor.value);
  sizeOutput.textContent = `${size.value} px`;

  generatedLink.hidden = true;
  inputHelp.hidden = true;
  effectiveContent = text;

  if (contentType === "google-review" && text) {
    const result = createGoogleReviewLink(text);
    effectiveContent = result.link;

    if (result.link) {
      generatedLink.hidden = false;
      reviewLink.href = result.link;
      reviewLink.textContent = result.link;
    } else {
      inputHelp.hidden = false;
      inputHelp.textContent = result.error;
    }
  }

  if (!effectiveContent) {
    canvas.hidden = true;
    downloadButton.disabled = true;
    status.textContent = text ? "Aguardando um link compatível" : "Digite um texto ou link para gerar";
    return;
  }

  canvas.hidden = false;
  downloadButton.disabled = false;

  try {
    await QRCode.toCanvas(canvas, effectiveContent, {
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
  } else if (type === "text") {
    contentLabel.textContent = "Digite seu texto";
    content.placeholder = "Escreva sua mensagem aqui…";
    content.inputMode = "text";
  } else {
    contentLabel.textContent = "Cole o link da sua empresa no Google";
    content.placeholder = "https://www.google.com/maps/place/...";
    content.inputMode = "url";
  }

  content.focus();
  scheduleDraw();
}

async function downloadQr() {
  const text = effectiveContent;
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
