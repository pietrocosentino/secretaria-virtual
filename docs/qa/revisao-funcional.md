# Revisão funcional passo a passo

Foram percorridas deliberadamente 12 jornadas com dados fictícios: catálogo do interessado, contratação para si, contratação para beneficiário, alteração de plano, cancelamento de rascunho de aula, saúde com resumo, exercício sem vídeo, anamnese liberada, pausa/encerramento humano, suspensão financeira, retomada enquanto aguarda profissional e dúvida desconhecida.

A divergência da troca de plano foi reproduzida na API publicada: Menu do aluno → Meu plano e treino → Solicitar troca de plano abria uma nova contratação. A correção cria uma solicitação distinta de alteração, sem substituir o plano cadastrado.

Também foram corrigidos o motivo numérico do encaminhamento ao profissional e os nomes técnicos das etapas/pendências no painel de homologação. As etapas e solicitações agora possuem rótulos em português.

A regressão do backend passou em 51 testes, incluindo dois novos casos que impedem a volta dessas divergências. A evidência das respostas/estados de cada passo está em `evidencias-funcionais-passo-a-passo.json`.

Limitação: revisão funcional do motor e da API; não houve sessão manual em navegador real. A execução de cliques da interface permanece coberta por DOM simulado. Transporte Meta e operações reais de agenda/pagamento continuam fora deste aceite.
