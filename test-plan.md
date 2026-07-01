# 🛩️ FlyTracker — Plano de Testes

**Perfil:** Maurício (QA)  
**Projeto:** FlyTracker — Sistema de Monitoramento de Passagens Aéreas  
**Versão do plano:** 1.0  
**Data:** 2026-06-30  

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Escopo](#2-escopo)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Casos de Teste — Busca de Voos](#4-casos-de-teste--busca-de-voos)
5. [Casos de Teste — Validação de Preços (R$ + Milhas)](#5-casos-de-teste--validação-de-preços-r--milhas)
6. [Casos de Teste — Criação/Gatilho de Alertas](#6-casos-de-teste--criaçãogatilho-de-alertas)
7. [Casos de Teste — Notificações](#7-casos-de-teste--notificações)
8. [Casos de Teste — API (Endpoints)](#8-casos-de-teste--api-endpoints)
9. [Casos de Teste — Integração](#9-casos-de-teste--integração)
10. [Cenários de Usuários (E2E)](#10-cenários-de-usuários-e2e)
11. [Matriz de Regressão](#11-matriz-de-regressão)
12. [Critérios de Aceitação](#12-critérios-de-aceitação)
13. [Ferramentas e Ambiente](#13-ferramentas-e-ambiente)

---

## 1. Visão Geral

O FlyTracker é um sistema que unifica tarifas comerciais (R$) e tarifas award (milhas) em um único buscador inteligente, com alertas personalizados e notificações push. O objetivo deste plano de testes é garantir a qualidade de todas as camadas do sistema:

- **Backend (FastAPI + PostgreSQL)** — API RESTful, mock Amadeus, banco de dados
- **Frontend Mobile (React Native)** — Busca de voos, resultados, alertas
- **Integração** — Fluxo completo entre frontend e backend

---

## 2. Escopo

### 2.1 Incluído

| Funcionalidade | Descrição |
|---|---|
| Busca de voos | Origem/destino com suporte a múltiplas seleções, datas, companhias, classe |
| Precificação | Preço em R$ (comercial) + Preço em milhas (award) |
| Alertas | Configuração de rota + período + companhia + classe |
| Notificações | Push, email e in-app para alertas |
| API REST | Endpoints de busca, voos, alertas e health check |
| Banco de dados | Schema PostgreSQL com tabelas, índices, views e funções |

### 2.2 Excluído (para versões futuras)

- Web scraping de programas de milhagem brasileiros (Smiles, TudoAzul, LATAM Pass)
- Integração com Google Flights API / Skyscanner API
- Dashboard web (Next.js)
- Worker de busca agendada (Celery / Bull)
- Firebase Cloud Messaging (produção)

---

## 3. Arquitetura do Sistema

```
┌─────────────────┐       ┌──────────────────┐       ┌───────────────┐
│  React Native   │  HTTP │   FastAPI API    │  SQL  │  PostgreSQL   │
│  (Mobile App)   │◄─────►│   (Backend)      │◄─────►│  (Database)   │
│                 │       │                  │       │               │
│ - SearchScreen  │       │ /api/flights     │       │ - usuarios    │
│ - ResultsScreen │       │ /api/alerts      │       │ - voos        │
│ - AlertsScreen  │       │ /api/health      │       │ - precos      │
└─────────────────┘       └──────────────────┘       │ - alertas     │
                                                      │ - notificacoes│
                                                      └───────────────┘
```

### 3.1 Componentes

| Componente | Tecnologia | Finalidade |
|---|---|---|
| `backend/main.py` | FastAPI 0.115 | Endpoints REST, lógica de negócio |
| `backend/models.py` | Pydantic 2.10 | Schemas de dados e validação |
| `backend/mock_amadeus.py` | Python | Mock de API de voos (Amadeus) |
| `mobile/src/screens/SearchScreen.js` | React Native | Tela de busca |
| `mobile/src/screens/ResultsScreen.js` | React Native | Tela de resultados |
| `mobile/src/screens/AlertsScreen.js` | React Native | Tela de alertas |
| `mobile/src/data/mockData.js` | JavaScript | Dados mock do frontend |
| `schema.sql` | PostgreSQL 16+ | Schema completo do banco |

---

## 4. Casos de Teste — Busca de Voos

### CT-BUSCA-001: Busca com origem e destino válidos

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-001 |
| **Título** | Busca de voos com origem e destino válidos (rota doméstica) |
| **Pré-condição** | Backend rodando, mock Amadeus ativo |
| **Dados de entrada** | `origin=GRU`, `destination=GIG`, `date=2026-07-15` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=GIG&date=2026-07-15` |
| **Resultado esperado** | 1. HTTP 200 OK 2. `flights` array com 2-4 voos 3. Cada voo com `id`, `airline`, `flight_number`, `departure`, `arrival`, `price_brl`, `price_miles` 4. `total` >= 2 |
| **Pós-condição** | N/A |
| **Tipo** | Funcional / API |

### CT-BUSCA-002: Busca sem filtros (todos os voos)

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-002 |
| **Título** | Busca sem parâmetros de filtro |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /api/flights` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Retorna voos de todas as rotas cadastradas 3. Paginação aplicada (page=1, page_size=10 default) |
| **Tipo** | Funcional / API |

### CT-BUSCA-003: Busca com paginação

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-003 |
| **Título** | Paginação de resultados (page_size=3, page=2) |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `page=2`, `page_size=3` |
| **Procedimento** | 1. Chamar `GET /api/flights?page=2&page_size=3` 2. Comparar com `GET /api/flights?page=1&page_size=3` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Voos da página 2 são diferentes da página 1 3. `page` = 2, `page_size` = 3 4. Nenhum voo duplicado entre páginas |
| **Tipo** | Funcional / API |

### CT-BUSCA-004: Busca por rota internacional

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-004 |
| **Título** | Busca de voos internacionais (GRU → MIA) |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU`, `destination=MIA` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=MIA` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Preços R$ mais altos que rotas domésticas (~R$ 2.500+) 3. Milhas proporcionais 4. Duração de voo condizente com internacional |
| **Tipo** | Funcional / API |

### CT-BUSCA-005: Busca sem resultados

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-005 |
| **Título** | Busca por rota inexistente |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=XYZ`, `destination=ABC` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=XYZ&destination=ABC` |
| **Resultado esperado** | 1. HTTP 200 OK 2. `flights` array vazio `[]` 3. `total` = 0 |
| **Tipo** | Funcional / API |

### CT-BUSCA-006: Filtro por apenas origem

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-006 |
| **Título** | Busca filtrando apenas pela origem |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Todos os voos partindo de GRU 3. Destinos variados (GIG, BSB, REC, MIA, etc.) |
| **Tipo** | Funcional / API |

### CT-BUSCA-007: Filtro por apenas destino

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-007 |
| **Título** | Busca filtrando apenas pelo destino |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `destination=GIG` |
| **Procedimento** | 1. Chamar `GET /api/flights?destination=GIG` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Todos os voos com destino GIG 3. Origens variadas |
| **Tipo** | Funcional / API |

### CT-BUSCA-008: Detalhes de um voo específico

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-008 |
| **Título** | Consulta de voo individual por ID |
| **Pré-condição** | Backend rodando. Obter um `flight_id` válido via busca |
| **Dados de entrada** | `flight_id` = ID de voo existente |
| **Procedimento** | 1. Chamar `GET /api/flights/{flight_id}` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Retorna objeto Flight completo 3. Todos os campos preenchidos corretamente |
| **Tipo** | Funcional / API |

### CT-BUSCA-009: Voo inexistente retorna 404

| Campo | Valor |
|---|---|
| **ID** | CT-BUSCA-009 |
| **Título** | Consulta de voo com ID inexistente |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `flight_id` = `"non-existent-uuid"` |
| **Procedimento** | 1. Chamar `GET /api/flights/non-existent-uuid` |
| **Resultado esperado** | 1. HTTP 404 Not Found 2. Mensagem de erro: `"Flight non-existent-uuid not found"` |
| **Tipo** | Exceção / API |

---

## 5. Casos de Teste — Validação de Preços (R$ + Milhas)

### CT-PRECO-001: Preço em R$ está no formato correto

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-001 |
| **Título** | Validação do formato de preço em Reais |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU`, `destination=GIG` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=GIG` 2. Para cada flight, verificar `price_brl` |
| **Resultado esperado** | 1. `price_brl.currency` = `"BRL"` 2. `price_brl.amount` é Decimal com 2 casas decimais 3. Valor dentro da faixa esperada para a rota (R$ 280 — R$ 490 para GRU-GIG) |
| **Tipo** | Validação / Dados |

### CT-PRECO-002: Preço em milhas está no formato correto

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-002 |
| **Título** | Validação do formato de preço em Milhas |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU`, `destination=GIG` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=GIG` 2. Para cada flight, verificar `price_miles` |
| **Resultado esperado** | 1. `price_miles.currency` = `"MILES"` 2. `price_miles.amount` é inteiro positivo 3. Proporção milhas/R$ dentro de ~0,015–0,025 |
| **Tipo** | Validação / Dados |

### CT-PRECO-003: Consistência entre preços de mesma rota

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-003 |
| **Título** | Preços de voos diferentes na mesma rota têm variação realista |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU`, `destination=GIG` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=GIG` 2. Coletar todos os `price_brl.amount` e `price_miles.amount` |
| **Resultado esperado** | 1. Variação entre voos normalmente 0.8x–1.4x do preço base 2. Nenhum preço zero ou negativo 3. Companhias diferentes podem ter preços diferentes |
| **Tipo** | Validação / Dados |

### CT-PRECO-004: Preço de rota internacional

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-004 |
| **Título** | Preços de rota internacional (GRU-LIS) |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `origin=GRU`, `destination=LIS` |
| **Procedimento** | 1. Chamar `GET /api/flights?origin=GRU&destination=LIS` |
| **Resultado esperado** | 1. `price_brl.amount` entre R$ 2.800 e R$ 4.900 (base R$ 3.500) 2. `price_miles.amount` proporcional 3. Duração 50–720 min (realista para internacional) |
| **Tipo** | Validação / Dados |

### CT-PRECO-005: Milhas são calculadas com taxa de conversão realista

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-005 |
| **Título** | Taxa de conversão milha/R$ dentro do esperado |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Qualquer rota |
| **Procedimento** | 1. Buscar voos 2. Calcular `price_miles.amount / price_brl.amount` 3. Verificar se a taxa está entre 40–67 (milhas por real) |
| **Resultado esperado** | 1. Taxa de conversão entre ~40 e ~67 milhas/R$ (equivalente a 1 milha = R$ 0,015–0,025) 2. Consistente com o mercado brasileiro de milhas |
| **Tipo** | Validação / Dados |

### CT-PRECO-006: Assentos disponíveis são consistentes

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-006 |
| **Título** | Assentos disponíveis dentro do intervalo esperado |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Qualquer rota |
| **Procedimento** | 1. Buscar voos 2. Verificar `seats_available` |
| **Resultado esperado** | 1. `seats_available` entre 0 e 120 2. Campo é inteiro não-negativo |
| **Tipo** | Validação / Dados |

### CT-PRECO-007: Exibição de preços no frontend (ResultsScreen)

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-007 |
| **Título** | Exibição correta de preços R$ e milhas no frontend mobile |
| **Pré-condição** | App mobile rodando, dados mock carregados |
| **Dados de entrada** | Buscar GRU → GIG |
| **Procedimento** | 1. Abrir SearchScreen 2. Selecionar origem GRU, destino GIG 3. Tocar "Buscar voos" 4. Verificar ResultsScreen |
| **Resultado esperado** | 1. Preços em R$ exibidos como `R$ 289,90` (formato brasileiro) 2. Milhas exibidas como `12.000 milhas` 3. Score de migração (0–100) exibido 4. Ordenação por preço (padrão) funciona |
| **Tipo** | Frontend / UI |

### CT-PRECO-008: Ordenação por milhas no frontend

| Campo | Valor |
|---|---|
| **ID** | CT-PRECO-008 |
| **Título** | Ordenação de resultados por menor quantidade de milhas |
| **Pré-condição** | App mobile rodando, na ResultsScreen com resultados |
| **Dados de entrada** | Resultados da busca GRU → GIG |
| **Procedimento** | 1. Tocar no botão "🏆 Menos milhas" |
| **Resultado esperado** | 1. Lista reordenada do menor para maior milhagem 2. Primeiro item deve ser o voo com menos milhas 3. Interface reflete a ordenação |
| **Tipo** | Frontend / UI |

---

## 6. Casos de Teste — Criação/Gatilho de Alertas

### CT-ALERTA-001: Criar alerta via API (price_drop em R$)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-001 |
| **Título** | Criar alerta de queda de preço (R$) via API |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"GIG","alert_type":"price_drop","channel":"email","target_price_brl":300.00,"email":"user@example.com"}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` com o body acima |
| **Resultado esperado** | 1. HTTP 201 Created 2. `alert.id` é UUID não-nulo 3. `alert.active` = true 4. `alert.origin` = "GRU", `alert.destination` = "GIG" 5. `alert.target_price_brl` = 300.00 6. `alert.channel` = "email" 7. Mensagem "Alert created successfully" |
| **Pós-condição** | Alerta armazenado em memória (`_alerts`) |
| **Tipo** | Funcional / API |

### CT-ALERTA-002: Criar alerta de milhas (miles_promo)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-002 |
| **Título** | Criar alerta de promoção de milhas |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"REC","alert_type":"miles_promo","channel":"push","target_price_miles":15000}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` com o body acima |
| **Resultado esperado** | 1. HTTP 201 Created 2. `alert.alert_type` = "miles_promo" 3. `alert.target_price_miles` = 15000 4. `alert.target_price_brl` = null |
| **Tipo** | Funcional / API |

### CT-ALERTA-003: Criar alerta com ambos os preços alvo

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-003 |
| **Título** | Criar alerta com alvo em R$ e milhas simultaneamente |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"MIA","alert_type":"price_drop","channel":"email","target_price_brl":2000.00,"target_price_miles":80000,"email":"user@example.com"}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` |
| **Resultado esperado** | 1. HTTP 201 Created 2. Ambos `target_price_brl` e `target_price_miles` populados 3. Alerta válido |
| **Tipo** | Funcional / API |

### CT-ALERTA-004: Criar alerta sem preço alvo (deve falhar)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-004 |
| **Título** | Tentativa de criar alerta sem nenhum preço alvo |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"GIG","alert_type":"price_drop","channel":"email"}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` sem `target_price_brl` e `target_price_miles` |
| **Resultado esperado** | 1. HTTP 422 Unprocessable Entity 2. Erro de validação indicando que ao menos um alvo deve ser informado |
| **Tipo** | Exceção / API |

### CT-ALERTA-005: Criar alerta sem origem (deve falhar)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-005 |
| **Título** | Tentativa de criar alerta sem campo origin |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"destination":"GIG","alert_type":"price_drop","target_price_brl":300.00}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` sem `origin` |
| **Resultado esperado** | 1. HTTP 422 Unprocessable Entity 2. Erro de validação: `origin` é obrigatório (min_length=3) |
| **Tipo** | Exceção / API |

### CT-ALERTA-006: Criar alerta com código IATA inválido

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-006 |
| **Título** | Tentativa de criar alerta com código de aeroporto inválido (mais de 3 caracteres) |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRUU","destination":"GIG","alert_type":"price_drop","target_price_brl":300.00}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` com `origin` de 4 caracteres |
| **Resultado esperado** | 1. HTTP 422 Unprocessable Entity 2. Erro de validação: `origin` deve ter exatamente 3 caracteres |
| **Tipo** | Exceção / API |

### CT-ALERTA-007: Listar alertas

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-007 |
| **Título** | Listar todos os alertas criados |
| **Pré-condição** | Backend rodando, ao menos 2 alertas criados via CT-ALERTA-001 e CT-ALERTA-002 |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /api/alerts` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Array com todos os alertas 3. Cada alerta com todos os campos preenchidos |
| **Tipo** | Funcional / API |

### CT-ALERTA-008: Listar alertas vazia

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-008 |
| **Título** | Listar alertas quando não há nenhum cadastrado |
| **Pré-condição** | Backend rodando, nenhum alerta criado (ou reiniciado) |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /api/alerts` |
| **Resultado esperado** | 1. HTTP 200 OK 2. Array vazio `[]` |
| **Tipo** | Funcional / API |

### CT-ALERTA-009: Deletar alerta existente

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-009 |
| **Título** | Excluir alerta existente |
| **Pré-condição** | Backend rodando. Criar alerta via CT-ALERTA-001, obter `alert_id` |
| **Dados de entrada** | `alert_id` do alerta criado |
| **Procedimento** | 1. Chamar `DELETE /api/alerts/{alert_id}` |
| **Resultado esperado** | 1. HTTP 204 No Content 2. Ao listar `GET /api/alerts`, o alerta não está mais presente |
| **Tipo** | Funcional / API |

### CT-ALERTA-010: Deletar alerta inexistente

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-010 |
| **Título** | Excluir alerta que não existe |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `alert_id` = `"uuid-inexistente"` |
| **Procedimento** | 1. Chamar `DELETE /api/alerts/uuid-inexistente` |
| **Resultado esperado** | 1. HTTP 404 Not Found 2. Mensagem: `"Alert uuid-inexistente not found"` |
| **Tipo** | Exceção / API |

### CT-ALERTA-011: Criar alerta via frontend (AlertsScreen)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-011 |
| **Título** | Criar alerta de preço pela interface mobile |
| **Pré-condição** | App mobile rodando |
| **Dados de entrada** | Origem: GRU, Destino: GIG, Preço máx: R$ 350, Milhas máx: 12000 |
| **Procedimento** | 1. Abrir AlertsScreen 2. Tocar "+ Novo" 3. Selecionar origem GRU 4. Selecionar destino GIG 5. Inserir R$ 350 e 12000 milhas 6. Tocar "Criar alerta" |
| **Resultado esperado** | 1. Modal de sucesso "Alerta de preço criado com sucesso!" 2. Novo alerta aparece no topo da lista 3. Campos exibidos corretamente (origem, destino, preços) |
| **Tipo** | Frontend / UI |

### CT-ALERTA-012: Ativar/desativar alerta (toggle)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-012 |
| **Título** | Alternar status ativo/inativo de um alerta |
| **Pré-condição** | App mobile rodando, ao menos um alerta na lista |
| **Dados de entrada** | Alerta existente (ativo) |
| **Procedimento** | 1. Localizar o switch do alerta 2. Tocar no switch para desativar 3. Tocar novamente para ativar |
| **Resultado esperado** | 1. Ao desativar: indicador visual muda para inativo (bolinha cinza, texto "Inativo") 2. Ao ativar: indicador visual muda para ativo (bolinha verde, texto "Ativo") 3. Estado reflete corretamente na UI |
| **Tipo** | Frontend / UI |

### CT-ALERTA-013: Excluir alerta pelo frontend

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-013 |
| **Título** | Excluir alerta pela interface mobile |
| **Pré-condição** | App mobile rodando, ao menos um alerta |
| **Dados de entrada** | Alerta existente |
| **Procedimento** | 1. Tocar no botão "✕" do alerta 2. Confirmar exclusão no diálogo |
| **Resultado esperado** | 1. Diálogo de confirmação "Tem certeza que deseja excluir este alerta?" 2. Após confirmar, alerta removido da lista 3. Se era o último, exibir "Nenhum alerta ativo" |
| **Tipo** | Frontend / UI |

### CT-ALERTA-014: Validação de formulário de alerta (origem = destino)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-014 |
| **Título** | Impedir criação de alerta com origem e destino iguais |
| **Pré-condição** | App mobile rodando, formulário de novo alerta aberto |
| **Dados de entrada** | Origem: GRU, Destino: GRU |
| **Procedimento** | 1. Selecionar origem GRU 2. Selecionar destino GRU 3. Tocar "Criar alerta" |
| **Resultado esperado** | 1. Mensagem de erro: "Origem e destino devem ser diferentes" 2. Alerta não é criado |
| **Tipo** | Frontend / Validação |

### CT-ALERTA-015: Alerta sem R$ nem milhas (deve falhar no frontend)

| Campo | Valor |
|---|---|
| **ID** | CT-ALERTA-015 |
| **Título** | Impedir criação de alerta sem preço máximo ou milhas |
| **Pré-condição** | App mobile rodando, formulário de novo alerta aberto |
| **Dados de entrada** | Origem: GRU, Destino: GIG, Preço: (vazio), Milhas: (vazio) |
| **Procedimento** | 1. Preencher origem e destino 2. Deixar preço e milhas em branco 3. Tocar "Criar alerta" |
| **Resultado esperado** | 1. Mensagem de erro: "Defina o preço máximo ou milhas" 2. Alerta não é criado |
| **Tipo** | Frontend / Validação |

---

## 7. Casos de Teste — Notificações

### CT-NOTIF-001: Estrutura da tabela de notificações no BD

| Campo | Valor |
|---|---|
| **ID** | CT-NOTIF-001 |
| **Título** | Verificar schema da tabela `notificacoes` |
| **Pré-condição** | Banco PostgreSQL com schema aplicado |
| **Dados de entrada** | `notificacoes` table |
| **Procedimento** | 1. Conectar ao BD 2. `\d notificacoes` 3. Verificar colunas |
| **Resultado esperado** | Colunas presentes: `id`, `usuario_id`, `alerta_id`, `voo_id`, `titulo`, `mensagem`, `canal`, `tipo`, `lida`, `lida_em`, `entregue`, `entregue_em`, `erro_entrega`, `criado_em`. Índices: `idx_notificacoes_usuario`, `idx_notificacoes_alerta`, `idx_notificacoes_nao_lidas`, `idx_notificacoes_criacao` |
| **Tipo** | Schema / BD |

### CT-NOTIF-002: Canal de notificação PUSH

| Campo | Valor |
|---|---|
| **ID** | CT-NOTIF-002 |
| **Título** | Alerta com canal PUSH é aceito pela API |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"GIG","alert_type":"price_drop","channel":"push","target_price_brl":300.00}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` com `channel: "push"` |
| **Resultado esperado** | 1. HTTP 201 Created 2. `alert.channel` = "push" |
| **Tipo** | Funcional / API |

### CT-NOTIF-003: Canal de notificação SMS

| Campo | Valor |
|---|---|
| **ID** | CT-NOTIF-003 |
| **Título** | Alerta com canal SMS |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `{"origin":"GRU","destination":"GIG","alert_type":"miles_promo","channel":"sms","target_price_miles":10000}` |
| **Procedimento** | 1. Chamar `POST /api/alerts` |
| **Resultado esperado** | 1. HTTP 201 Created 2. `alert.channel` = "sms" |
| **Tipo** | Funcional / API |

### CT-NOTIF-004: Notificação marcada como lida

| Campo | Valor |
|---|---|
| **ID** | CT-NOTIF-004 |
| **Título** | Marcar notificação como lida (futuro endpoint) |
| **Pré-condição** | Notificação existente no BD com `lida = false` |
| **Dados de entrada** | `notificacao_id` |
| **Procedimento** | 1. Query: `UPDATE notificacoes SET lida = true, lida_em = NOW() WHERE id = x` 2. Verificar resultado |
| **Resultado esperado** | 1. `lida` = true 2. `lida_em` preenchido com timestamp |
| **Tipo** | BD / Funcional |

### CT-NOTIF-005: Verificação de alerta via função `verificar_alertas_usuario`

| Campo | Valor |
|---|---|
| **ID** | CT-NOTIF-005 |
| **Título** | Executar função PL/pgSQL `verificar_alertas_usuario` |
| **Pré-condição** | Banco populado com usuário, alertas e histórico de preços |
| **Dados de entrada** | `p_usuario_id` = UUID de usuário existente |
| **Procedimento** | 1. Executar `SELECT * FROM verificar_alertas_usuario('{uuid}')` |
| **Resultado esperado** | 1. Retorna tabela com alertas que tiveram condição atingida 2. Colunas: `alerta_id`, `titulo`, `mensagem`, `voo_numero`, `origem`, `destino`, `preco_atual_r$`, `milhas_atuais` 3. Se nenhuma condição atingida, retorna vazio |
| **Tipo** | BD / Funcional |

---

## 8. Casos de Teste — API (Endpoints)

### 8.1 Mapeamento de Endpoints

| Método | Endpoint | Descrição | Coberto por |
|---|---|---|---|
| GET | `/api/health` | Health check | CT-API-001 |
| GET | `/api/flights` | Busca de voos | CT-BUSCA-001 a 007 |
| GET | `/api/flights/{id}` | Detalhe do voo | CT-BUSCA-008, 009 |
| POST | `/api/alerts` | Criar alerta | CT-ALERTA-001 a 006 |
| GET | `/api/alerts` | Listar alertas | CT-ALERTA-007, 008 |
| DELETE | `/api/alerts/{id}` | Excluir alerta | CT-ALERTA-009, 010 |

### CT-API-001: Health Check

| Campo | Valor |
|---|---|
| **ID** | CT-API-001 |
| **Título** | Endpoint de health check |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /api/health` |
| **Resultado esperado** | 1. HTTP 200 OK 2. `{"status": "ok", "service": "flytracker-backend", "version": "0.1.0"}` |
| **Tipo** | API / Smoke |

### CT-API-002: CORS headers presentes

| Campo | Valor |
|---|---|
| **ID** | CT-API-002 |
| **Título** | Verificar headers CORS nas respostas |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Requisição com `Origin: http://localhost:3000` |
| **Procedimento** | 1. Chamar qualquer endpoint com header `Origin` 2. Verificar response headers |
| **Resultado esperado** | 1. `Access-Control-Allow-Origin: *` 2. `Access-Control-Allow-Methods: *` 3. `Access-Control-Allow-Headers: *` |
| **Tipo** | API / Segurança |

### CT-API-003: Content-Type correto (JSON)

| Campo | Valor |
|---|---|
| **ID** | CT-API-003 |
| **Título** | Verificar Content-Type nas respostas |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Qualquer requisição |
| **Procedimento** | 1. Chamar `GET /api/flights` 2. Verificar header `Content-Type` |
| **Resultado esperado** | 1. `Content-Type: application/json` |
| **Tipo** | API / Contrato |

### CT-API-004: OpenAPI/Swagger UI disponível

| Campo | Valor |
|---|---|
| **ID** | CT-API-004 |
| **Título** | Documentação interativa Swagger |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /docs` |
| **Resultado esperado** | 1. HTTP 200 OK 2. HTML da interface Swagger UI 3. Todos os endpoints listados |
| **Tipo** | API / Documentação |

### CT-API-005: ReDoc UI disponível

| Campo | Valor |
|---|---|
| **ID** | CT-API-005 |
| **Título** | Documentação ReDoc |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Chamar `GET /redoc` |
| **Resultado esperado** | 1. HTTP 200 OK 2. HTML da interface ReDoc |
| **Tipo** | API / Documentação |

### CT-API-006: Validação de tipos (page_size > 100)

| Campo | Valor |
|---|---|
| **ID** | CT-API-006 |
| **Título** | Validar constraint `page_size <= 100` |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | `page_size=200` |
| **Procedimento** | 1. Chamar `GET /api/flights?page_size=200` |
| **Resultado esperado** | 1. HTTP 422 Unprocessable Entity 2. Erro de validação: `page_size` must be <= 100 |
| **Tipo** | API / Validação |

---

## 9. Casos de Teste — Integração

### CT-INT-001: Fluxo completo: busca → seleciona voo → cria alerta

| Campo | Valor |
|---|---|
| **ID** | CT-INT-001 |
| **Título** | Fluxo completo de busca e criação de alerta via API |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Busca GRU→GIG, cria alerta no primeiro voo |
| **Procedimento** | 1. `GET /api/flights?origin=GRU&destination=GIG` → obter `flight_id` 2. `GET /api/flights/{flight_id}` → confirmar detalhes 3. `POST /api/alerts` com `origin=GRU`, `destination=GIG`, `target_price_brl=300.00` 4. `GET /api/alerts` → listar alertas |
| **Resultado esperado** | 1. Passo 1: 200 OK, voos retornados 2. Passo 2: 200 OK, voo individual 3. Passo 3: 201 Created, alerta criado 4. Passo 4: 200 OK, alerta presente na lista |
| **Tipo** | Integração |

### CT-INT-002: Fluxo: criar → listar → deletar → listar (alerta)

| Campo | Valor |
|---|---|
| **ID** | CT-INT-002 |
| **Título** | Ciclo completo CRUD de alerta via API |
| **Pré-condição** | Backend rodando |
| **Dados de entrada** | Alerta GRU→GIG, R$ 350 |
| **Procedimento** | 1. `POST /api/alerts` → criar (201) 2. `GET /api/alerts` → listar (200, array não vazio) 3. `DELETE /api/alerts/{id}` → deletar (204) 4. `GET /api/alerts` → listar (200, alerta removido) |
| **Resultado esperado** | Ciclo completo sem erros. Estado consistente. |
| **Tipo** | Integração |

### CT-INT-003: Inicialização do backend com uvicorn

| Campo | Valor |
|---|---|
| **ID** | CT-INT-003 |
| **Título** | Servidor FastAPI inicia sem erros |
| **Pré-condição** | Dependências instaladas (requirements.txt), .venv ativo |
| **Dados de entrada** | Comando: `uvicorn main:app --host 0.0.0.0 --port 8000` |
| **Procedimento** | 1. Ativar virtualenv 2. Iniciar uvicorn 3. Verificar log de startup |
| **Resultado esperado** | 1. Servidor sobe sem tracebacks 2. Log: "Uvicorn running on http://0.0.0.0:8000" 3. Health check retorna 200 |
| **Tipo** | Integração / Deploy |

### CT-INT-004: BD — Aplicar schema.sql sem erros

| Campo | Valor |
|---|---|
| **ID** | CT-INT-004 |
| **Título** | Schema PostgreSQL é aplicado sem falhas |
| **Pré-condição** | PostgreSQL 16+ rodando, extensões pgvector e uuid-ossp disponíveis |
| **Dados de entrada** | Arquivo `schema.sql` |
| **Procedimento** | 1. Executar `psql -f schema.sql` 2. Verificar criação de tabelas |
| **Resultado esperado** | 1. Sem erros de sintaxe 2. 9 tabelas criadas: `usuarios`, `companhias_aereas`, `programas_milhagem`, `rotas`, `voos`, `precos`, `historico_precos`, `alertas`, `notificacoes` 3. 2 views criadas: `vw_historico_completo`, `vw_melhores_precos_rota` 4. 3 funções: `trigger_atualizado_em`, `registrar_historico_preco`, `verificar_alertas_usuario` 5. Constraints `chk_preco_ou_milhas`, `chk_alerta_alvo`, `chk_alerta_escopo` criadas |
| **Tipo** | Integração / BD |

### CT-INT-005: BD — Inserir dados de teste e validar constraints

| Campo | Valor |
|---|---|
| **ID** | CT-INT-005 |
| **Título** | Constraints do banco são respeitadas |
| **Pré-condição** | Schema aplicado |
| **Dados de entrada** | INSERT em `precos` sem `preco_r$` nem `milhas` |
| **Procedimento** | 1. `INSERT INTO precos (voo_id, classe) VALUES ('{uuid}', 'Econômica')` |
| **Resultado esperado** | 1. Erro: `new row for relation "precos" violates check constraint "chk_preco_ou_milhas"` 2. Dados não inseridos |
| **Tipo** | BD / Validação |

### CT-INT-006: BD — Função `registrar_historico_preco` calcula variação

| Campo | Valor |
|---|---|
| **ID** | CT-INT-006 |
| **Título** | Função de registro de histórico calcula variação corretamente |
| **Pré-condição** | Schema aplicado, voo existente com preço anterior |
| **Dados de entrada** | Chamar `registrar_historico_preco` duas vezes para o mesmo voo |
| **Procedimento** | 1. Inserir preço R$ 500 para um voo 2. Inserir preço R$ 400 para o mesmo voo |
| **Resultado esperado** | 1. Segundo registro: `variacao_r$` = -100.00 2. `variacao_percentual` = -20.0000 (queda de 20%) |
| **Tipo** | BD / Funcional |

### CT-INT-007: Frontend — Navegação SearchScreen → ResultsScreen

| Campo | Valor |
|---|---|
| **ID** | CT-INT-007 |
| **Título** | Navegação entre telas de busca e resultados |
| **Pré-condição** | App mobile rodando |
| **Dados de entrada** | Origem: GRU, Destino: GIG, Data: 2026-07-15 |
| **Procedimento** | 1. Abrir SearchScreen 2. Preencher campos 3. Tocar "Buscar voos" |
| **Resultado esperado** | 1. Navega para ResultsScreen 2. Header mostra "GRU → GIG" 3. Data exibida: "2026-07-15" 4. Lista de voos carregada |
| **Tipo** | Integração / Frontend |

### CT-INT-008: Frontend — Voltar da ResultsScreen para SearchScreen

| Campo | Valor |
|---|---|
| **ID** | CT-INT-008 |
| **Título** | Botão "Nova busca" retorna à tela de busca |
| **Pré-condição** | App na ResultsScreen |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Tocar em "← Nova busca" |
| **Resultado esperado** | 1. Retorna para SearchScreen 2. Campos de busca resetados ou preservados (conforme implementação) |
| **Tipo** | Integração / Frontend |

### CT-INT-009: Frontend — Atalhos de rotas populares preenchem campos

| Campo | Valor |
|---|---|
| **ID** | CT-INT-009 |
| **Título** | Atalhos de rotas populares na SearchScreen |
| **Pré-condição** | App na SearchScreen |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Rolar para seção "Rotas populares" 2. Tocar em "SP → RJ" |
| **Resultado esperado** | 1. Origem preenchida: "GRU" 2. Destino preenchido: "GIG" |
| **Tipo** | Frontend / UI |

### CT-INT-010: Frontend — Botão swap troca origem e destino

| Campo | Valor |
|---|---|
| **ID** | CT-INT-010 |
| **Título** | Botão ⇅ troca origem e destino |
| **Pré-condição** | App na SearchScreen, origem e destino preenchidos |
| **Dados de entrada** | Origem: GRU, Destino: GIG |
| **Procedimento** | 1. Tocar no botão ⇅ |
| **Resultado esperado** | 1. Origem passa a ser "GIG" 2. Destino passa a ser "GRU" |
| **Tipo** | Frontend / UI |

### CT-INT-011: App — Estado vazio na tela de alertas

| Campo | Valor |
|---|---|
| **ID** | CT-INT-011 |
| **Título** | Tela de alertas sem alertas cadastrados |
| **Pré-condição** | App com lista de alertas vazia (ou após excluir todos) |
| **Dados de entrada** | Nenhum |
| **Procedimento** | 1. Navegar para AlertsScreen |
| **Resultado esperado** | 1. Ícone de sino 2. "Nenhum alerta ativo" 3. Texto explicativo 4. Botão "+ Novo" disponível |
| **Tipo** | Frontend / UI |

---

## 10. Cenários de Usuários (E2E)

### CENÁRIO-001: Viajante casual — busca e compara preços

**Perfil:** Usuário que quer viajar de São Paulo ao Rio de Janeiro

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Abre o FlyTracker | SearchScreen exibida |
| 2 | Toca em "Origem" e seleciona GRU | Campo origem preenchido |
| 3 | Toca em "Destino" e seleciona GIG | Campo destino preenchido |
| 4 | Insere data 2026-07-15 | Campo data preenchido |
| 5 | Toca "Buscar voos" | Navega para ResultsScreen |
| 6 | Visualiza resultados | Vê lista de voos com preços R$ e milhas |
| 7 | Toca "🏆 Menos milhas" | Lista reordenada por milhagem |
| 8 | Encontra voo GOL: R$ 349,90 / 8.000 milhas | Vê detalhes na tela |
| 9 | Volta para SearchScreen | Pode fazer nova busca |

**Critério de sucesso:** Usuário conseguiu comparar ofertas em R$ e milhas e tomar uma decisão.

---

### CENÁRIO-002: Monitor de preços — cria alerta para rota desejada

**Perfil:** Usuário que quer monitorar preço de uma rota específica

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Navega para AlertsScreen | Lista de alertas (vazia inicialmente) |
| 2 | Toca "+ Novo" | Formulário de criação exibido |
| 3 | Seleciona origem GRU | Campo origem preenchido |
| 4 | Seleciona destino MIA | Campo destino preenchido |
| 5 | Insere preço máx: R$ 2.200 | Campo preço preenchido |
| 6 | Insere milhas máx: 70.000 | Campo milhas preenchido |
| 7 | Toca "Criar alerta" | Alerta criado, feedback de sucesso |
| 8 | Verifica alerta na lista | Vê "GRU → MIA", R$ 2.200,00, 70.000 milhas, "Ativo" |

**Critério de sucesso:** Alerta criado e exibido corretamente. Usuário será notificado quando condições forem atingidas.

---

### CENÁRIO-003: Admin QA — valida consistência de dados via API

**Perfil:** QA testando a API REST

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | `GET /api/health` | `{"status": "ok"}` |
| 2 | `GET /api/flights?origin=GRU&destination=GIG` | 3 voos, preços entre R$ 280–490, milhas entre 6.000–20.000 |
| 3 | `POST /api/alerts` (price_drop, R$ 300) | 201 Created, alerta com UUID |
| 4 | `GET /api/alerts` | Lista com 1 alerta |
| 5 | `DELETE /api/alerts/{id}` | 204 No Content |
| 6 | `GET /api/alerts` | Lista vazia |
| 7 | Testa exceções: sem origin, com page_size=200 | 422 Unprocessable Entity |

**Critério de sucesso:** Todos os endpoints respondem conforme especificação. Validações funcionam.

---

### CENÁRIO-004: DBA — verifica integridade do banco

**Perfil:** DBA validando o schema

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Aplicar `schema.sql` | Sem erros |
| 2 | `\dt` | 9 tabelas listadas |
| 3 | `\dv` | 2 views listadas |
| 4 | `\df` | 3 funções listadas |
| 5 | Inserir registro em `companhias_aereas` (LA, LATAM) | Inserido |
| 6 | Inserir `precos` sem preço nem milhas | Violação da constraint `chk_preco_ou_milhas` |
| 7 | Inserir `alertas` sem voo_id nem rota_id | Violação da constraint `chk_alerta_escopo` |

**Critério de sucesso:** Schema completo, índices criados, constraints funcionais.

---

## 11. Matriz de Regressão

| Módulo | CTs | Prioridade | Frequência |
|---|---|---|---|
| Busca de voos | CT-BUSCA-001 a 009 | Crítica | A cada PR |
| Validação de preços | CT-PRECO-001 a 008 | Alta | A cada PR |
| Criação de alertas | CT-ALERTA-001 a 015 | Crítica | A cada PR |
| Notificações | CT-NOTIF-001 a 005 | Média | Semanal |
| API | CT-API-001 a 006 | Crítica | A cada PR |
| Integração | CT-INT-001 a 011 | Alta | A cada release |
| Cenários E2E | CENÁRIO-001 a 004 | Crítica | A cada release |

### Smoke Test (PR mínimo)

```
1. CT-API-001  (health check)
2. CT-BUSCA-001 (busca básica)
3. CT-PRECO-001 + CT-PRECO-002 (preços R$ e milhas)
4. CT-ALERTA-001 + CT-ALERTA-007 + CT-ALERTA-009 (CRUD alertas)
5. CT-INT-001 (fluxo completo)
```

---

## 12. Critérios de Aceitação

### 12.1 Geral
- [ ] Todos os testes críticos (P0) passam
- [ ] 100% dos endpoints documentados no Swagger
- [ ] Schema do banco aplica sem warnings

### 12.2 Busca de Voos
- [ ] Retorna voos para todas as rotas cadastradas (29 rotas)
- [ ] Paginação funcional (page, page_size)
- [ ] Filtros por origem e destino funcionam independentemente
- [ ] Voo individual retorna por ID

### 12.3 Preços
- [ ] Preço em R$ é Decimal com 2 casas (formato brasileiro)
- [ ] Milhas é valor inteiro positivo
- [ ] Conversão milha/R$ realista (1 milha = R$ 0,015–0,025)
- [ ] Variação entre voos na mesma rota é natural (0.8x–1.4x)

### 12.4 Alertas
- [ ] CRUD completo: criar, listar, deletar
- [ ] Validação de campos obrigatórios (origin, destination, alert_type)
- [ ] Validação de tamanho de campos (IATA = 3 caracteres)
- [ ] Ao menos um target price informado
- [ ] Toggle ativo/inativo no frontend
- [ ] Exclusão com confirmação no frontend

### 12.5 Notificações
- [ ] Schema `notificacoes` completo com índices
- [ ] Suporte a canais: email, push, sms
- [ ] Função de verificação de alertas funcional

### 12.6 API
- [ ] CORS habilitado para todos origins
- [ ] Content-Type: application/json
- [ ] Status codes corretos (200, 201, 204, 404, 422)
- [ ] OpenAPI/Swagger disponível

---

## 13. Ferramentas e Ambiente

### 13.1 Stack de Testes

| Ferramenta | Finalidade |
|---|---|
| pytest + httpx | Testes de API (Python) |
| pytest-asyncio | Testes assíncronos |
| PostgreSQL 16+ | Banco de dados |
| React Native Testing Library | Testes de frontend |
| Postman / Insomnia | Testes manuais de API |
| curl / httpie | Testes rápidos de CLI |

### 13.2 Comandos Úteis

```bash
# Iniciar backend
cd /opt/data/flytracker/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Health check
curl http://localhost:8000/api/health

# Buscar voos
curl "http://localhost:8000/api/flights?origin=GRU&destination=GIG"

# Criar alerta
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"origin":"GRU","destination":"GIG","alert_type":"price_drop","channel":"email","target_price_brl":300.00}'

# Listar alertas
curl http://localhost:8000/api/alerts

# Deletar alerta
curl -X DELETE http://localhost:8000/api/alerts/{id}

# Aplicar schema do BD
psql -U postgres -d flytracker -f schema.sql
```

### 13.3 Ambientes de Teste

| Ambiente | URL / Caminho | Observação |
|---|---|---|
| Desenvolvimento | `localhost:8000` | Backend FastAPI |
| Mobile (dev) | `npx react-native run-ios/android` | Emulador |
| Banco (dev) | `localhost:5432` | PostgreSQL local |

---

## Histórico de Revisões

| Data | Versão | Autor | Descrição |
|---|---|---|---|
| 2026-06-30 | 1.0 | Maurício (QA) | Versão inicial do plano de testes |
