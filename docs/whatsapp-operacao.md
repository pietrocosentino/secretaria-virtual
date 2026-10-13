# Operação do WhatsApp

O servidor Node e a Edge Function executam o mesmo motor de conversa em `supabase/functions/whatsapp/shared`. Não há geração externa de código. A interface `dist/index.html` continua sendo uma demonstração independente; seus controles não administram a conta real.

## Jornadas publicadas

Menu por texto/número, catálogo sem cadastro obrigatório, contratação para si ou outro beneficiário, nome/idade/relação separados, reaproveitamento de cadastro, validação de e-mail, consulta de cadastro/plano/pagamento confirmado, pedidos de aulas, dúvidas/regras, coleta de saúde com consentimento e resumo confirmado, dificuldade de execução com ou sem vídeo, anamnese após confirmação administrativa do pagamento, pendências e histórico.

As operações reais que dependem de agenda, cobrança e MFIT são pedidos ao profissional, sem simular reserva, pagamento ou treino. O bot não diagnostica nem analisa vídeos automaticamente. Um novo pedido não altera o plano vigente. Idade não define método de treino.

`waiting` permite retornar ao menu; `human` pausa o bot. `encerrar` retoma o bot e preserva pendências. Novas mensagens retomam uma sessão humana inativa há 15 minutos. O endpoint `admin/tick` envia aviso após 10 minutos e encerra após 15, mas exige um agendador autenticado chamando-o periodicamente; o agendador ainda não foi configurado.

## Variáveis

Obrigatórias: `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_GRAPH_VERSION`, `WHATSAPP_ALLOWED_NUMBERS`, `ADMIN_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Aliases legados: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GRAPH_API_VERSION`. O valor `META_*` prevalece se ambos estiverem preenchidos. Números autorizados são separados por vírgula, somente dígitos com país e DDD. A chave de serviço e o token administrativo permanecem no backend.

## Rotas

Base Supabase: `https://kpxourwsbawmwemzwozn.supabase.co/functions/v1/whatsapp`.

- GET `/health`: disponibilidade e cabeçalho `X-Bot-Version`.
- GET e POST `/`, `/webhook` ou `/webhooks/whatsapp`: callback Meta. GET valida verify token; POST exige HMAC com App Secret.
- GET `/admin/requests`: lista contatos, cadastro, solicitações e histórico.
- POST `/admin/owner`: `{ "contact": "NUMERO", "owner": "human" }` ou `bot`.
- POST `/admin/action`: ações detalhadas abaixo.
- POST `/admin/tick`: execução dos prazos de inatividade.

Toda rota `/admin/*` exige `Authorization: Bearer ADMIN_TOKEN`. Não colocar esse token em páginas públicas. Respostas administrativas se limitam a contatos autorizados e à janela recente de conversa. Saúde/histórico são dados privados acessíveis somente ao operador autenticado.

### Ações do profissional

Atualizar cadastro/plano (não a partir da mensagem do aluno):

```json
{"contact":"NUMERO","action":"profile","profile":{"name":"Nome","email":"nome@example.com","plan":{"name":"Online mensal","modality":"Online","start":"2026-10-13","end":"2026-11-12","nextTraining":"A confirmar","suspended":false}}}
```

Confirmar pagamento após conferir evidência real. Uma referência é obrigatória; o aluno dizer “paguei” não confirma:

```json
{"contact":"NUMERO","action":"payment","status":"confirmed","reference":"referência da confirmação autorizada"}
```

Após confirmação, o cliente pode escrever `anamnese`. Para marcar pagamento pendente, usar `status: pending`; um plano cadastrado será suspenso. O bot não altera a vigência.

Responder como profissional e assumir conversa:

```json
{"contact":"NUMERO","action":"reply","messageId":"identificador-unico-da-resposta","text":"Resposta do profissional"}
```

Repetir `messageId` evita reenviar uma resposta já concluída. Resolver pendência:

```json
{"contact":"NUMERO","action":"resolve","requestId":"ID_DA_SOLICITACAO"}
```

Vídeos recebidos têm o ID da mídia registrado na solicitação após confirmação do cliente. O download permanente/galeria e o painel web real ainda não estão integrados. Não considerar o ID uma cópia permanente do vídeo.

## Verificação

`npm test` executa fluxos reais do motor, webhook assinado com transportes de teste, autenticação administrativa, retentativa, mídia, cadastro, saúde e inatividade. Os testes do protótipo em `tests/prototype.test.cjs` são separados e verificam a demonstração do navegador.

Teste no canal real: `menu` → `1` → `1` → contratação; `menu` → `5` → saúde; `menu` → `6` → exercício. As confirmações de envio dependem da Meta e de token de acesso válido.

## Homologação sem Meta

Acesse `/homologacao` na mesma base da função. A interface chama `/homologacao/simular` com um estado fictício por sessão e executa o mesmo `respond` do canal real. A rota não instancia transporte Meta, não acessa banco e não depende de secrets. Use somente dados fictícios; as respostas trafegam pela função hospedada, embora ela não grave a sessão.

Há 14 roteiros com aprovação/reprovação e observações, três cenários, controles fictícios de pagamento/atendimento e exportação JSON das sessões. Não substitui testes de HMAC, tokens, transporte, banco, download de mídia, agendador ou integrações externas. O conteúdo HTML está em `scripts/homologacao.html`; o módulo servido é `supabase/functions/whatsapp/homologacao.mjs`.
