// Servidor do webhook do WhatsApp (Meta Cloud API).
// Não precisa instalar nada: usa só recursos do próprio Node.js (18 ou superior).

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// 1) Carrega o arquivo .env (se existir). Na hospedagem (Render etc.)
//    as variáveis já vêm prontas, então o arquivo não é necessário lá.
function carregarEnv() {
  const arquivo = path.join(__dirname, ".env");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const l = linha.trim();
    if (!l || l.startsWith("#") || !l.includes("=")) continue;
    const i = l.indexOf("=");
    const chave = l.slice(0, i).trim();
    const valor = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}
carregarEnv();

const { responder } = require("./bot");

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN?.trim() || process.env.WHATSAPP_VERIFY_TOKEN?.trim();
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const APP_SECRET = process.env.META_APP_SECRET?.trim() || process.env.WHATSAPP_APP_SECRET?.trim();
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || process.env.GRAPH_API_VERSION || "v25.0";

for (const [nome, valor] of Object.entries({
  WHATSAPP_VERIFY_TOKEN: VERIFY_TOKEN,
  WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
})) {
  if (!valor) console.warn(`AVISO: a variável ${nome} não está preenchida.`);
}
if (!APP_SECRET) {
  console.warn(
    "AVISO: WHATSAPP_APP_SECRET vazio. As mensagens serão rejeitadas até configurar META_APP_SECRET ou WHATSAPP_APP_SECRET."
  );
}

// 2) Confere se a mensagem realmente veio da Meta (assinatura HMAC).
function assinaturaValida(corpoBruto, cabecalho) {
  if (!APP_SECRET) return false;
  if (!cabecalho) return false;
  const esperado =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(corpoBruto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(cabecalho);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 3) Envia uma mensagem de texto pelo WhatsApp.
async function enviarTexto(para, texto) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!resposta.ok) {
    console.error("Erro ao enviar mensagem:", resposta.status, await resposta.text());
  } else {
    console.log("Resposta enviada para", para);
  }
}

// 4) Processa o que a Meta mandou.
async function processar(corpo) {
  for (const entrada of corpo.entry || []) {
    for (const mudanca of entrada.changes || []) {
      for (const msg of (mudanca.value && mudanca.value.messages) || []) {
        const de = msg.from;
        const texto = msg.type === "text" ? msg.text.body : "";
        console.log(`Mensagem recebida de ${de} (${msg.type}): ${texto}`);
        try {
          const resposta = await responder({ de, texto, tipo: msg.type });
          if (resposta) await enviarTexto(de, resposta);
        } catch (erro) {
          console.error("Erro ao processar mensagem:", erro);
        }
      }
    }
  }
}

// 5) O servidor.
const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Página simples para saber se está no ar.
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Secretaria virtual no ar.");
  }

  // Verificação do webhook (a Meta chama isso ao cadastrar a URL).
  if (req.method === "GET" && ["/webhook", "/webhooks/whatsapp"].includes(url.pathname)) {
    const modo = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const desafio = url.searchParams.get("hub.challenge");
    if (modo === "subscribe" && token && token === VERIFY_TOKEN) {
      console.log("Webhook verificado pela Meta.");
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(desafio);
    }
    console.warn("Falha na verificação: o token não confere.");
    res.writeHead(403);
    return res.end("Token inválido");
  }

  // Recebimento de mensagens.
  if (req.method === "POST" && ["/webhook", "/webhooks/whatsapp"].includes(url.pathname)) {
    const pedacos = [];
    req.on("data", (p) => pedacos.push(p));
    req.on("end", () => {
      const corpoBruto = Buffer.concat(pedacos);
      if (!assinaturaValida(corpoBruto, req.headers["x-hub-signature-256"])) {
        console.warn("Assinatura inválida. Requisição ignorada.");
        res.writeHead(401);
        return res.end();
      }
      // A Meta exige resposta rápida; respondemos 200 e processamos depois.
      res.writeHead(200);
      res.end("EVENT_RECEIVED");
      try {
        processar(JSON.parse(corpoBruto.toString("utf8")));
      } catch (erro) {
        console.error("Corpo inválido:", erro.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

servidor.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("Rota do webhook: /webhook");
});
