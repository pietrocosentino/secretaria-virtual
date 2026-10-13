# Relatório QA — Secretária Virtual

Execução: 2026-10-13T03:30:14.238Z.

## Resultado

78 testes aprovados: 49 de backend/endpoints/interface simulada e 29 do protótipo. Zero falhas na regressão final.

Estresse: 30.000 ações no motor, 10.000 no protótipo, 1.000 requisições concorrentes ao serviço e 1.000 chamadas locais ao endpoint isolado. Zero falhas nas assertivas executadas.

| Execução | Volume | Resultado |
|---|---:|---|
| Motor determinístico | 30.000 ações / 200 sessões | Sem alteração indevida de entrada, plano ou pagamento |
| Protótipo | 10.000 ações | 29/29 cenários aprovados |
| Concorrência em adapter serializado | 1.000 requisições / 25 contatos | 500 eventos únicos, 500 envios, zero duplicatas concluídas |
| Endpoint local isolado | 1.000 chamadas / concorrência 20 | Todas aprovadas; sem Meta ou banco real |

## Falhas corrigidas

1. Menu do interessado divergente da entrada unificada de serviços no protótipo.
2. Comando menu não saía da coleta de saúde no protótipo.
3. Dor iniciada agora recebia pergunta prematura de evolução no protótipo.
4. Encerrar não retomava o bot durante atendimento humano no protótipo.
5. Cancelar durante rascunho de aula era registrado como detalhes da solicitação.
6. Corrigir no resumo de exercício não refazia a coleta.
7. Encerrar exibia menu amplo para aluno suspenso.
8. Payloads assinados malformados retornavam 200/503 em vez de 400.
9. Atualização parcial administrativa do plano apagava vigência não fornecida.
10. Resumos extensos podiam ultrapassar o limite de mensagem do WhatsApp; agora são divididos preservando Unicode e conteúdo.
11. Erros da simulação não tinham CORS consistente, impedindo leitura clara no navegador.

As quatro primeiras falhas foram reproduzidas na regressão inicial (25/29 aprovados). Os demais pontos foram corrigidos durante revisão e expansão dos testes; todos têm cobertura regressiva.

## Métricas e limites

Motor local p95: 0.0318 ms. Endpoint local p95: 2.9937 ms. São medidas no processo Node em memória, não latência de produção nem SLA. O serviço concorrente usa adapter serializado de teste, não Supabase real. Memória ao final: heap 36.94 MiB / RSS 187.31 MiB; não é medição de vazamento nem limite máximo.

O canal WhatsApp real não foi homologado: a Meta bloqueia o envio com 131037 enquanto o nome está em análise. Não houve estresse de Meta ou banco de produção. A interface foi testada em DOM simulado; não houve inspeção visual em navegador real. Agenda, cobrança, MFIT, download permanente de vídeos e painel operacional real permanecem pendentes. Avisos proativos de inatividade exigem configurar agendador.

Não é possível garantir ausência de todos os defeitos; esta execução cobre os cenários, fronteiras e invariantes documentados.

## Evidências e reprodução

Casos: `docs/qa/casos-de-teste.md`. Resultados: `resultado-consolidado.json`, `resultado-estresse.json`, `resultado-prototipo.json`.

`npm run test:regression` e `npm run test:stress`. Seeds fixas, dados fictícios, sem dependências externas de teste.
