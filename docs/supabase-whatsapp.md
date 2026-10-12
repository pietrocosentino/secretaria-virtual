# Secretária Virtual no Supabase — SmartTec

Usar projeto dedicado `Secretária Virtual` na organização `SmartTec`. Nenhuma alteração deve ser aplicada ao banco Finança Fácil.

## Conteúdo preparado

- `supabase/functions/whatsapp/index.ts`: Edge Function e URL HTTPS.
- `handler.mjs`: adapta Request/Response para o mesmo handler HTTP do Node.
- `shared/store.mjs`: persistência via REST/RPC, sem arquivo local.
- `pilot-schema.sql`: tabela com RLS, sem acesso anon/authenticated, RPCs somente service_role.
- `npm run build:edge`: gera ESM das regras originais, evitando duas implementações de negócio.
- `npm run test:edge`: testa assinatura, challenge, regras, deduplicação e contrato do armazenamento.

## Implantação pendente

1. Criar projeto dedicado depois de consultar e confirmar seu custo. Região preferida: São Paulo (`sa-east-1`).
2. Aplicar `pilot-schema.sql` e verificar RLS/permissões e RPCs no banco real; rodar advisors.
3. Executar `npm run build:edge` e publicar a função `whatsapp`, incluindo todos os módulos relativos. Configurar `verify_jwt=false`, pois a Meta não envia JWT; a função valida o verify token no GET, HMAC no POST e token administrativo nas rotas admin.
4. Cadastrar em Edge Functions Secrets: META_VERIFY_TOKEN, META_APP_SECRET, META_ACCESS_TOKEN, META_PHONE_NUMBER_ID, META_GRAPH_VERSION, WHATSAPP_ALLOWED_NUMBERS, ADMIN_TOKEN. Os valores Supabase são fornecidos pelo ambiente do projeto. Nunca gravar credenciais no repositório.
5. Usar como callback a URL da função fornecida pelo Supabase (sem acrescentar `/webhooks/whatsapp`). Assinar `messages` no painel Meta.
6. Enviar `oi` do celular autorizado e validar recebimento da resposta da Secretária.

## Limites explícitos

Este armazenamento mantém o modelo serial do piloto: uma lease global no banco, renovada a cada persistência. Chamadas concorrentes recebem 503 para reentrega da Meta. Não comprova capacidade de produção; deve evoluir para fila e transações por contato antes de escala. Interrupção após envio e antes de persistência pode repetir resposta; não há garantia de exatamente uma vez. A fila de mensagens de um mesmo contato também depende da ordem de entrega do provedor.

Os testes Node usam banco simulado. A execução SQL, o runtime Deno hospedado, os segredos, a função pública e a conversa real ainda precisam ser validados após criação do projeto. O health check prova apenas disponibilidade HTTP.

## Implantação de homologação — 12/10/2026

Projeto SmartTec `Secretaria Virtual`, ref `kpxourwsbawmwemzwozn`, região `us-west-2`. Esquema aplicado por migration `secretaria_pilot_state`. Verificados no Postgres real: aquisição exclusiva, rejeição de lease concorrente/token inválido, gravação e liberação, com rollback dos testes. RLS habilitado sem políticas públicas é intencional: somente service_role acessa a tabela.

Função `whatsapp` publicada; `/functions/v1/whatsapp/health` retornou `200 ok`. Corrigida normalização do caminho interno do gateway e acrescentado teste de regressão (9 testes Edge passam em Node).

Callback: `https://kpxourwsbawmwemzwozn.supabase.co/functions/v1/whatsapp`. Segredos Meta e ADMIN_TOKEN ainda precisam ser configurados; a raiz permanece `503 Configuration pending` até configuração completa. Webhook Meta ainda não conectado; health não comprova envio real.
