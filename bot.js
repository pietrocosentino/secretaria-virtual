// Aqui fica a "inteligência" do robô.
// Por enquanto é um menu simples com regras fixas, só para provar que
// o caminho WhatsApp -> servidor -> resposta funciona.
// Depois, as jornadas de docs/requisitos.md entram neste arquivo.

async function responder({ de, texto, tipo }) {
  if (tipo !== "text") {
    return "Por enquanto só consigo ler mensagens de texto. Pode escrever o que precisa? 🙂";
  }

  const t = texto.trim().toLowerCase();

  if (t === "1") {
    return "Certo! Para solicitar um atendimento, me diga seu nome e o assunto. Em breve retornamos.";
  }
  if (t === "2") {
    return "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.";
  }
  if (t === "3") {
    return "Tudo bem, vou encaminhar para um atendente humano.";
  }

  return (
    "Olá! Sou a secretária virtual. Como posso ajudar?\n\n" +
    "1 - Solicitar atendimento\n" +
    "2 - Horário de funcionamento\n" +
    "3 - Falar com uma pessoa"
  );
}

module.exports = { responder };
