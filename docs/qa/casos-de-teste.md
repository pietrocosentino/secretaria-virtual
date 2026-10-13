# Casos de teste — Secretária Virtual

Escopo: motor publicado no WhatsApp, webhook Meta, persistência por adapter, API administrativa, homologação isolada e protótipo independente. Massa: nomes/e-mails fictícios, números de teste, mensagens e mídias sintéticas. Nunca utilizar tokens ou dados de saúde de pessoas reais na massa.

Critério de aprovação: passos executados, resultado esperado verificado por assertiva, sem regressão nas demais jornadas. Os relatórios distinguem testes locais e verificações remotas. Passar na simulação não homologa a entrega pelo WhatsApp.

## Casos funcionais e regressivos

| ID | Pré-condição | Passos | Resultado esperado |
|---|---|---|---|
| F01 | Novo interessado sem plano | Enviar menu | Serviços, dúvidas, humano e cadastro; sem menu de aluno |
| F02 | Aluno com plano confirmado | Enviar menu | Aulas, plano/treino, pagamento, saúde, exercício e contratação |
| F03 | Plano suspenso | Enviar menu, quero agendar e encerrar | Orientação financeira; nenhum agendamento ou acesso indevido |
| F04 | Interessado | Consultar serviços | Preços disponíveis sem cadastro obrigatório |
| F05 | Sem cadastro | Contratar para mim, objetivo, frequência, online, mensal, sim | Solicitar nome/e-mail e forma de pagamento; sem pagamento automático |
| F06 | Cadastro existente | Repetir F05 | Reaproveitar nome/e-mail válidos |
| F07 | Aluno ativo | Contratar para esposa; informar nome, idade, objetivo, modalidade e duração | Beneficiário separado; plano vigente preservado |
| F08 | Contratação em frequência | Informar 0, 9 ou texto inválido; depois 2 | Rejeitar inválidos e avançar apenas com 1–7 ou não sei |
| F09 | Contratação presencial | Completar intenção | Orçamento pendente; não inventar preço ou disponibilidade |
| F10 | Resumo de contratação | Responder não/corrigir | Refazer; não registrar pedido |
| F11 | Rascunho em andamento | Cancelar/menu | Sair do rascunho sem criar pendência |
| F12 | Cadastro em e-mail | Enviar e-mail inválido; depois válido | Não avançar até formato válido |
| F13 | Perfil de aluno | Solicitar agendamento/cancelamento/remarcação | Registrar pedido; não confirmar reserva ou alteração |
| F14 | Rascunho de aula | Cancelar | Descartar, sem registrar a palavra cancelar como pedido |
| F15 | Menu de aulas | Escrever cancelar | Pedir detalhes do cancelamento; não confirmar ainda |
| F16 | Qualquer contato | Escrever paguei | Não confirmar pagamento automaticamente |
| F17 | Cadastro sem informação financeira | Consultar pagamentos | Informar ausência de confirmação; não inventar débito |
| F18 | Operador autenticado | Confirmar pagamento com referência verificável | Registrar confirmação administrativa; liberar anamnese |
| F19 | Sem referência administrativa | Tentar confirmar pagamento | Rejeitar a alteração |
| F20 | Novo/ativo | Alterar nome/e-mail | Preservar plano e pendências |
| F21 | Plano com vigência | Operador altera nome do plano | Preservar campos existentes não fornecidos |
| F22 | Atualização de saúde | Iniciar categoria e consentir | Uma pergunta por vez, sem diagnóstico ou prescrição |
| F23 | Dor em coleta | Enviar -1, 11 e 10.5; depois 5,5 | Rejeitar valores fora de 0–10; aceitar decimal válido |
| F24 | Dor iniciada agora | Responder local, início agora, contexto, intensidade, impacto | Não perguntar evolução prematuramente |
| F25 | Saúde completa | Conferir resumo, corrigir, confirmar | Somente confirmação gera solicitação com data/origem/consentimento |
| F26 | Saúde incompleta | Encaminhar antes de terminar | Exibir resumo para confirmar; não registrar silenciosamente |
| F27 | Saúde em rascunho | Cancelar/menu | Descartar ou sair, sem nova solicitação |
| F28 | Cirurgia/medicamento/condição | Completar cada roteiro | Perguntas adequadas e registro somente após confirmação |
| F29 | Dificuldade de exercício | Informar exercício, dificuldade e dor | Dor abre saúde; não pede repetição dolorosa para gravar vídeo |
| F30 | Dificuldade sem dor | Pedir referência | Não inventar referência aprovada; oferecer análise humana |
| F31 | Vídeo em etapa correta | Enviar mídia sintética e confirmar | Associar ID da mídia ao pedido; não alegar análise automática |
| F32 | Resumo de exercício | Corrigir | Voltar à coleta para alterar informações |
| F33 | Anamnese sem pagamento confirmado | Pedir anamnese | Bloquear até confirmação administrativa |
| F34 | Pagamento confirmado | Consentir, responder anamnese e confirmar resumo | Registrar para análise; não criar treino automaticamente |
| F35 | Aguardando profissional | Enviar menu | Retomar bot e preservar pendência |
| F36 | Profissional assumiu | Enviar mensagem comum | Bot silencioso; atividade reinicia prazo |
| F37 | Profissional assumiu | Encerrar | Retomar bot; preservar pendências e restrição financeira |
| F38 | Sessão humana inativa | Tick em 10 e 15 min | Um aviso, encerramento, sem apagar pendências |
| F39 | Sessão humana inativa por 15 min | Nova mensagem | Retomar automaticamente no processamento |
| F40 | Pergunta não cadastrada | Enviar dúvida desconhecida | Oferecer menu/encaminhamento, sem bloquear definitivamente |

## Endpoints, segurança e resiliência

| ID | Cenário | Execução | Resultado esperado |
|---|---|---|---|
| T01 | Callback GET | Token correto/incorreto em cada alias de rota | Challenge 200 ou rejeição 403 |
| T02 | HMAC | POST sem assinatura ou assinatura inválida | 401, sem persistir ou enviar |
| T03 | JSON/estrutura | POST assinado com JSON inválido, null, array, entry/changes inválidos | 400, sem erro interno 503 |
| T04 | Outro phone ID | Mensagem assinada para outro número | Ignorar e responder 200 |
| T05 | Allowlist | Remetente não autorizado | Não criar contato nem enviar resposta |
| T06 | Timestamp | Mensagem antiga, futura ou NaN | Ignorar sem efeitos |
| T07 | Administração | Sem Bearer administrativo | 401 em owner/action/tick |
| T08 | Método/rota | PUT no webhook e GET em rota inexistente | 405 e 404 |
| T09 | Envio falha | Provedor falha; mensagem é reentregue | Retomar intenção persistida; não repetir mensagem concluída |
| T10 | Reentrega concorrente | Cem requisições do mesmo evento | Um evento e uma resposta em adapter serializado |
| T11 | Texto extenso | Resumo de saúde >4096 unidades de texto, com emojis | Dividir em blocos seguros sem perder conteúdo ou cortar Unicode |
| T12 | Resposta humana | Mesmo messageId duas vezes | Uma resposta; janela expirada retorna 409 |
| T13 | Retenção | Histórico >100 entradas e evento concluído antigo | Limitar histórico; remover evento concluído antigo; preservar falha/pendência |
| T14 | Simulação isolada | POST /homologacao/simular sem secrets | Mesmo respond; não acessar Meta nem banco real |
| T15 | Limite de payload | Simulação >256 KiB | 413 |
| T16 | CORS | OPTIONS e respostas válidas/inválidas de simulação | Origin permitido; browser recebe erro em vez de falha opaca |
| T17 | Interface | Alternar interessado/aluno e clicar em aulas | Menus distintos; botão executa intenção correta |
| T18 | Conteúdo HTML | Mensagem com tags/script | Mostrar como texto, sem criar elemento executável |

## Estresse reproduzível

- Motor: 30.000 ações determinísticas, seed 42, 200 sessões; confirma imutabilidade da entrada, preservação de plano, ausência de pagamento não verificado, consentimento de registros e divisão das respostas.
- Protótipo: 10.000 ações, incluindo botões e cenários de interessado, aluno e inadimplente.
- Serviço: 1.000 requisições simultaneamente submetidas, 25 contatos, 500 eventos únicos enviados duas vezes. Adapter em memória serializado; assertivas de isolamento e deduplicação.
- Endpoint isolado local: 1.000 requisições, lotes de 20 simultâneas. Sem chamadas à Meta ou banco de produção.

Métricas locais não representam SLA ou capacidade do Supabase. O adapter de concorrência serializa transações e não mede contenção real do banco.

## Como executar

```bash
npm run test:regression
npm run test:stress
```

## Itens bloqueados ou fora do escopo executável

Entrega real da Meta: bloqueada pelo erro 131037/nome de exibição em análise na evidência da sessão. Agenda, cobrança, MFIT, download permanente de vídeos, painel administrativo real e agendador não estão integrados. Browser visual real não foi executado; a UI foi testada em DOM simulado. Os avisos proativos só serão operacionais quando o agendador autenticado estiver configurado.
