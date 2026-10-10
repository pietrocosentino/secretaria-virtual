# Secretaria Virtual

Plataforma em desenvolvimento para automatizar o atendimento de profissionais autônomos e microempreendedores. A proposta é reduzir o tempo de resposta, organizar solicitações e permitir que o profissional se concentre nos seus clientes.

O piloto é uma secretária virtual para o profissional de demonstração, com atendimento a alunos e interessados em consultoria online e serviços presenciais.

## Protótipo atual

- Chat do cliente e painel do personal na mesma interface.
- Consulta de planos, dúvidas frequentes e cadastro básico.
- Simulação de contratação, pagamento e conclusão da anamnese.
- Transferência para atendimento humano e pausa do bot.
- Simulação de aviso após 10 minutos e encerramento após 15 minutos de inatividade.
- Pendências preservadas após o encerramento.
- Cenários de interessado, aluno ativo e aluno com pagamento pendente.

As respostas usam fluxos e palavras-chave. Não há agente de IA, backend, persistência de dados nem integrações reais com WhatsApp, calendário, pagamentos ou aplicativos. Atualizar a página reinicia a demonstração. O tempo avança pelo botão de simulação.

## Executar

Abra `dist/index.html` no navegador. Não exige instalação nem compilação.

Opcionalmente, com Python instalado:

```bash
python -m http.server 8000 --directory dist
```

Acesse http://localhost:8000.

## Estrutura

- `dist/index.html`: interface, estilos e lógica do protótipo.
- `docs/requisitos.md`: escopo, regras e decisões do piloto.

## Evolução prevista

Atendimento com IA e WhatsApp, cadastro persistente, agendamento integrado ao calendário, cobranças e confirmação automática, fluxo de caixa, acompanhamento da anamnese e avisos de atualização dos treinos. Aplicativo próprio em etapa futura.

## Demonstração publicada

https://secretaria-virtual-demo.goldenstork8.chatgpt.site

O acesso à demonstração é privado e depende da autorização do proprietário.

## Condições comerciais

Os preços são referências do material fornecido pelo personal. Condições finais e juros devem ser validados antes da operação comercial. Dados de alunos no protótipo são fictícios.
