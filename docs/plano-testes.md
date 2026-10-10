# Plano de testes — Secretária Virtual

## Objetivo e execução
Validar jornadas, regras de acesso, contexto e falhas de navegação antes de integrar IA, WhatsApp, pagamentos e persistência.

Requisito: Node.js 18 ou superior, sem dependências externas. Na raiz do repositório:

```bash
node tests/prototype.test.cjs --stress=10000 --seed=42 --report=docs/resultado-testes.json
```

Retorno 0 indica sucesso total; 1 indica ao menos uma falha. O relatório contém resultados individuais, hash SHA-256 da versão testada e ambiente. A sequência aleatória aceita `--seed=N` para reprodução. Para maior volume, use `--stress=100000`.

Para executar três sequências independentes (42, 2026 e 8675309):

```bash
node tests/stress-matrix.cjs --actions=10000 --out=reports
```

O script grava um JSON por semente e `resumo.json`, e retorna 1 quando há falhas. Não exige instalação de pacotes.

## Cobertura automatizada
| Grupo | Cobertura |
|---|---|
| Menu e identidade | Entrada unificada para novos interessados e identidade genérica |
| Pagamentos | Bloqueio de menus e mensagens livres, regularização simulada e situação em dia |
| Contratação | Respostas digitadas, frequência inválida, dados em uma única mensagem, preço após entendimento, plano atual preservado, correção e saída |
| Saúde | Perguntas progressivas, confirmação antes de registro, intensidade inválida, descarte, saída por menu e contexto temporal |
| Exercícios | Dificuldade sem dor, referência ausente e dor redirecionada à saúde |
| Atendimento humano | Pausa, reinício de inatividade, encerramento aos 15 minutos, pendências preservadas e comando textual |
| Entradas adversas | Conteúdo HTML como texto; mensagens vazias, emojis, mensagens longas e sequências inesperadas |
| Estresse de lógica | Milhares de ações distribuídas por cenários; mensagens e cliques, sem exceções |

## Falhas reproduzidas nesta versão
| ID | Comportamento esperado | Resultado observado |
|---|---|---|
| M01 | Novo interessado vê Conhecer serviços e planos | Menu ainda separa consultoria e atendimento presencial |
| H04 | Menu interrompe coleta de saúde | Palavra é registrada como resposta de saúde |
| H06 | Início agora evita pergunta redundante de evolução | Pergunta continua sendo feita |
| A04 | Encerrar por texto finaliza sessão humana | Bot ignora comando enquanto está pausado |
| C09 | Negação em confirmação impede registrar pedido | “sim, mas não quero contratar ainda” registra solicitação |
| C13 | Resposta ambígua exige esclarecimento | “sim” é registrado como beneficiário |

Esses casos são testes de regressão intencionalmente falhando, não devem ser removidos ou afrouxados para aprovar a versão.

## Homologação manual no navegador
Use dados e vídeos fictícios. Não usar registros reais de saúde.

| Caso | Passos | Resultado esperado |
|---|---|---|
| B01 Responsividade | Abrir em 360px, 768px e desktop | Sem sobreposição; chat e painel acessíveis |
| B02 Acessibilidade | Navegar somente por teclado, enviar mensagem e acionar botões | Foco visível, nomes acessíveis, sem bloqueios de navegação |
| B03 Vídeo válido | Exercício sem dor → selecionar MP4 pequeno → confirmar → mudar menu | Vídeo reproduzível no painel, pendência preservada |
| B04 Vídeo inválido | Selecionar arquivo não vídeo e vídeo maior que 50MB | Recusa compreensível, sem pendência de upload fictício |
| B05 Descarte | Selecionar vídeo e descartar | Nenhuma pendência criada |
| B06 Nova contratação | Aluno ativo solicita para esposa, online, três vezes por semana | Só perguntas faltantes; beneficiário separado; preços após objetivo |
| B07 Atualização da versão | Reabrir demonstração com recarga completa | Versão e fluxo correspondem ao código testado |
| B08 Reiniciar | Registrar pendências e reiniciar cenário | Dados da sessão e vídeos locais descartados conforme informado |
| B09 Contexto extenso | Relatar vários dados de saúde numa mensagem | Registrar limitações da extração atual e perguntas repetidas |
| B10 Uso real do tempo | Comparar avanço simulado e ausência de interação | Registrar que relógio é simulado, não temporizador real |

## Limites e critérios de liberação
A suíte usa DOM simulado em Node, não navegador real. Não avalia CSS, acessibilidade completa, codecs, capacidade de rede, usuários simultâneos, IA, privacidade em produção, segurança de backend ou pagamentos reais. As ações validam robustez lógica; não representam teste de carga de um serviço.

Bloqueadores: acesso indevido por inadimplência, perda de plano existente, registro sem confirmação, bot respondendo durante atendimento humano ou falhas nas jornadas principais. Antes de produção, resolver regressões e executar testes de navegador e integrações.

Próxima etapa: corrigir os seis casos, executar novamente e só depois ampliar os testes para o agente e serviços externos.


## Resultado verificado

41 casos por execução: 35 aprovados e 6 reprovados nas três sementes, totalizando 30.000 ações aleatórias. O estresse inclui invariantes: identificadores de pendências únicos, proprietário da conversa válido, bloqueio financeiro e preservação do nome do aluno com plano existente. O caso I01 intercala 50 contextos de VM independentes e verifica isolamento de beneficiários; não representa concorrência de servidor.

Casos adicionais incluem email inválido, confirmação repetida, correção de frequência, cancelamento, aviso aos dez minutos, formulário vazio e seleção de vídeos falsos de tipos/tamanhos diferentes. Os objetos de arquivo são simulados: reprodução, upload e liberação real de memória devem ser conferidos no navegador.

Não há agendamento real nesta versão: verificar que pedidos de marcar, cancelar e remarcar apenas geram encaminhamento e nunca prometem alteração de calendário. Testes de carga HTTP/WhatsApp ficam para a implementação dessas integrações.

As falhas permanecem nos testes como critérios de correção. A aplicação não foi alterada neste pacote.
