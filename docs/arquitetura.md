# Arquitetura do piloto WhatsApp

## Separação implementada

| Camada | Responsabilidade | Testes |
|---|---|---|
| `src/domain` | Decidir próximo passo da conversa e coletar interesse de contratação; funções puras | Unitários, sem DOM ou rede |
| `src/application` | Orquestrar mensagens, pausa humana, deduplicação e respostas pendentes | Integração por HTTP |
| `src/infrastructure` | Implementar armazenamento e API Meta | Adaptador com fetch injetado; persistência em arquivo |
| `src/http` | Verificar webhook, autenticar controle de operador e traduzir HTTP | Requisições reais em localhost |
| `src/server.cjs` | Compor dependências e iniciar servidor | Usado no piloto configurado |

Responsabilidade única e inversão de dependências: `MessageService` recebe armazenamento, transporte e relógio por construtor. MetaTransport e transporte falso são substituíveis pelo contrato `send(to, text)`. MemoryStore e FileStore expõem `transaction(work)`/`persist(data)`. Adicionar banco ou provedor exige novos adaptadores, não mudanças nas regras da contratação. Funções de domínio não acessam HTTP, DOM, ambiente ou banco. Nomes explícitos, constantes para textos e funções menores aplicam Clean Code ao backend novo.

Esta separação não significa que todo o projeto tenha sido refatorado: `dist/index.html` mantém o protótipo anterior. Seu motor é independente do novo backend; não há paridade de todas as jornadas. Reunificar a demonstração com a API é etapa posterior. Não há agente de IA nesta entrega: interpretação continua determinística e limitada a palavras-chave.

## Escopo no WhatsApp

Menu textual, coleta de beneficiário, objetivo, frequência, modalidade e duração; valores de referência; confirmação explícita; interesse sem alterar plano existente; encaminhamento ao profissional; pausa automática enquanto aguarda atendimento. Não há pagamento confirmado por texto, cadastro de alunos, cobrança, agenda ou análise de saúde. Eventos não textuais são ignorados; a versão não baixa vídeos/áudios nem responde a eles. Consulta de plano ativo depende de cadastro a implementar.

O endpoint protegido `/admin/owner` altera `owner` para `human` ou `bot`. Não envia mensagem do profissional. Pedidos são consultáveis no endpoint autenticado `GET /admin/requests`. Envio humano e interface gráfica precisam de painel próprio ou inbox do provedor. Estado `waiting` pausa respostas até liberação explícita. Não há temporizador real de 10/15 minutos neste backend.

## Confiabilidade e limites

Webhook autenticado com HMAC-SHA256 sobre bytes originais. Lista de destinatários de teste obrigatória. Estado e intenções de resposta são gravados antes do envio. Reentregas retomam respostas pendentes e evitam reaplicar a transição. Identificadores de eventos concluídos são mantidos por sete dias. Somente mensagens recentes são respondidas; chamadas espontâneas fora da janela dependem de templates não implementados.

FileStore usa arquivo com gravação temporária e rename, permissões restritas e serialização em uma instância. Exige disco persistente; não usar como banco em funções serverless, múltiplos processos ou réplicas. O arquivo contém números e interesses: usar somente contatos de testes e apagar após homologação. Não guardar relatos médicos neste piloto do canal real.

Envio tem timeout e erro retorna 503 para reentrega. Se a Meta aceitar uma mensagem e o processo cair antes de gravar o resultado, ela pode ser enviada novamente. Não existe garantia de exatamente uma entrega. HTTP confirma somente depois do processamento: tráfego de produção precisa de fila durável, recebimento rápido, armazenamento transacional e worker. O estresse local não mede limites ou latência da Meta. Não há reconciliação de status de entrega: aceite pela API não prova chegada ao celular.
