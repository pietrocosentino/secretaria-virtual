# Conectar o número de testes da Meta

O código do webhook e do envio está implementado. Não há credenciais configuradas ou deployment público nesta entrega; os testes executados não enviaram mensagens reais.

## 1. Preparar a conta

Abra o [guia oficial da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started), crie/configure um app com WhatsApp e obtenha o número de testes disponibilizado no painel. Adicione e confirme seu celular como destinatário autorizado, conforme as instruções do painel.

Reúna: ID do número de telefone, token de acesso, App Secret e versão suportada da Graph API. O Verify Token é um segredo que você cria para a confirmação do webhook, diferente do access token e do App Secret. Não envie esses valores em mensagens ou publique no GitHub.

## 2. Configurar o backend

Na raiz do projeto, com Node.js 22 ou superior, copie `.env.example` para `.env.local` e preencha as variáveis. Use apenas números de homologação na lista `WHATSAPP_ALLOWED_NUMBERS`. `ADMIN_TOKEN` é uma credencial separada para o endpoint de controle humano. `WHATSAPP_TEST_RECIPIENT` deve ser seu celular autorizado, no formato país + DDD + número, sem símbolos.

```bash
npm test
npm run test:prototype
npm run test:stress
npm start
```

Não há dependências npm para instalar. Um `GET /health` deve retornar `ok`. Para receber eventos da Meta, hospede este processo Node único com disco persistente e URL pública HTTPS. Um túnel HTTPS para localhost também pode ser usado apenas na homologação, enquanto o servidor local estiver ativo. Não configurar FileStore em filesystem efêmero de serverless.

## 3. Conectar o webhook

No painel Meta, informe a URL HTTPS terminando em `/webhooks/whatsapp` e o mesmo `META_VERIFY_TOKEN` configurado no servidor. Ative a assinatura do campo `messages` para a conta WhatsApp utilizada. Use as instruções atuais do painel e a [documentação oficial de webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/).

O servidor valida o challenge GET e a assinatura POST. Teste o webhook pelo painel; depois envie “oi” do celular autorizado para o número de testes.

## 4. Homologar no celular

1. Envie “oi”: receba a apresentação da Secretária.
2. Envie “contratar plano”: receba a pergunta para quem é.
3. Responda “para minha esposa online três vezes por semana”: receba apenas a pergunta sobre objetivo.
4. Responda “hipertrofia”: confira os valores de referência e escolha “mensal”.
5. Responda “sim, mas não quero contratar ainda”: não deve registrar interesse.
6. Responda “sim”: deve registrar apenas interesse e aguardar o profissional, sem cobrar ou reservar.
7. Envie outra mensagem: enquanto aguarda atendimento, o bot permanece pausado.

O backend grava pedidos no arquivo local. O operador pode consultá-los em `GET /admin/requests` com o header `Authorization: Bearer ADMIN_TOKEN`; não há interface gráfica para essa consulta. O endpoint administrativo autenticado `POST /admin/owner`, com JSON `{"contact":"NUMERO_AUTORIZADO","owner":"bot"}` e header `Authorization: Bearer ADMIN_TOKEN`, libera o bot para a próxima conversa. `human` mantém o bot pausado. Esta rota não envia mensagens.

Para testar envio real da API, primeiro envie “oi” do celular para abrir a janela de atendimento, então execute:

```bash
npm run test:whatsapp
```

O script envia uma única mensagem para `WHATSAPP_TEST_RECIPIENT`, retorna o ID aceito pela Meta e solicita conferir a chegada no celular. Não é teste de entrega automático. Verifique no aparelho, responda “oi” e confirme que a resposta percorreu celular → Meta → webhook → backend → Meta → celular.

## Evidências de homologação

Registre data/hora, versão do commit, passo executado, resultado e print do celular com dados fictícios. As mensagens fora da lista autorizada não serão atendidas. Não executar testes de volume contra celulares; o script de estresse usa HTTP em localhost e adaptador falso da Meta.

Documentação: [envio de mensagens](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages) e [eventos messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages).
