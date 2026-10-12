# Hospedagem do piloto WhatsApp

O backend requer uma única instância Node 22 com volume persistente. O Dockerfile não inclui credenciais nem dados locais. Não hospedar este FileStore em Vercel Functions ou outro filesystem efêmero.

## Configuração do serviço

- Branch: `tests/primeira-versao-estresse`.
- Execução sem Docker: `npm run start:hosted` (variáveis fornecidas pelo host; não exige `.env.local`).
- Docker: construir com o Dockerfile da raiz e montar volume gravável pelo usuário node em `/app/data`.
- Uma réplica; porta interna 3000 ou PORT fornecida pelo host; HTTPS terminado pelo host.
- Health check: `GET /health`, resposta `200 ok`.
- Persistência: `DATA_FILE=/app/data/pilot.json` no container.

Cadastre os nomes de `.env.example` no gerenciador de segredos do host. META_ACCESS_TOKEN e META_APP_SECRET devem ser copiados diretamente do painel Meta. META_VERIFY_TOKEN e ADMIN_TOKEN são segredos independentes, gerados aleatoriamente. Não preencher segredos em arquivos versionados.

Use META_PHONE_NUMBER_ID do número de testes e META_GRAPH_VERSION conforme o painel. WHATSAPP_ALLOWED_NUMBERS contém apenas os destinatários autorizados do piloto, em dígitos com país e DDD.

## Ativação

1. Publicar o serviço com as variáveis e volume configurados.
2. Verificar `/health` na URL pública HTTPS.
3. Configurar na Meta `https://SEU_HOST/webhooks/whatsapp` com o mesmo META_VERIFY_TOKEN do serviço.
4. Assinar o campo `messages` da conta WhatsApp usada no teste.
5. Enviar `oi` do celular autorizado e verificar a resposta da Secretária.
6. Testar contratação e pausa humana conforme `whatsapp-setup.md`.

O envio da mensagem de exemplo pelo painel Meta não comprova o recebimento pelo backend. A validação real exige a resposta da Secretária no celular. Não executar estresse contra números reais.
