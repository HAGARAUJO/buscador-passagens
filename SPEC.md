# 🛩️ Buscador de Passagens (FlyTracker) — Sistema de Monitoramento de Passagens Aéreas

## Visão Geral
Plataforma que unifica tarifas award (milhas) em um buscador inteligente com alertas personalizados via WhatsApp, usando Seats.aero Pro API + fontes complementares.

## 🎯 Diferencial Comercial

### 🥇 Alerta Inteligente via WhatsApp (Chatwoot)
**"Cadastra o trecho no WhatsApp, recebe alerta no WhatsApp, compra pelo WhatsApp"**

- Nenhuma ferramenta brasileira faz isso hoje
- Usuário cadastra rota + período + classe + milhas máximas
- Toda vez que award disponível aparece → **WhatsApp na hora** 📱
- Bot responde com link de compra no programa certo
- Chatwoot já está rodando na infra — integração direta

Fluxo:
```
1. Usuário envia "Quero GRU-NY jan/26 executiva até 100k milhas" no WhatsApp
2. Sistema salva alerta no PostgreSQL (tabela `alertas`)
3. Cron 3x/dia consulta Seats.aero Pro API
4. Matching alerta × award disponível
5. Disparo via Chatwoot → WhatsApp → usuário
6. Usuário clica "Comprar" → link direto no programa (Smiles, TudoAzul, LATAM Pass)
```

### 🥈 Calendário Visual de Melhor Época
- Mês inteiro num grid colorido (verde = barato, vermelho = caro)
- "Maio 2026: melhor janela GRU-MCO usando Smiles"
- Perfeito pra quem tem flexibilidade de datas

### 🥉 Comparação Cruzada de Programas
| Programa | Milhas | Taxas | Total (R$) |
|---|---|---|---|
| Smiles | 65.000 | R$ 380 | R$ 1.180 |
| TudoAzul | 58.000 | R$ 520 | R$ 1.250 |
| LATAM Pass | 70.000 | R$ 290 | R$ 1.390 |

## Funcionalidades

### 1. Busca de Award
| Funcionalidade | Status |
|---|---|
| Origem/Destino | ✅ Implementado |
| Datas flexíveis | ✅ Implementado |
| Filtro por programa (Smiles, TudoAzul, LATAM Pass, etc.) | ✅ Implementado |
| Classe econômica/executiva | 🔄 Pendente |
| Link de compra por resultado | ✅ Implementado |
| Dados reais via Seats.aero API | 🔄 Aguardando chave API |

### 2. Fontes de Dados
| Fonte | Tipo | Custo | Status |
|---|---|---|---|
| **Seats.aero Pro API** | Award (milhas) | $99.99/ano | 🔄 Aguardando assinatura |
| AwardFares (X/Twitter) | Award (milhas) | Gratuito | 🔄 Scraper pendente |
| Programas brasileiros (Smiles, TudoAzul, LATAM Pass) | Award (milhas) | Gratuito | 📋 Planejado |

### 3. Alertas Inteligentes
- [ ] Cadastro de alerta: rota + período + classe + milhas máximas
- [ ] Matching automático com award disponível
- [ ] Notificação via WhatsApp (Chatwoot)
- [ ] Link de compra gerado automático
- [ ] Gerenciamento de alertas (pausar, editar, excluir)

## Stack Técnica

```
Frontend:    HTML/CSS/JS estático (servido pelo FastAPI)
Backend:     Python/FastAPI
BD:          PostgreSQL (buscador_passagens) + Redis (cache/sessões)
Infra:       Docker Swarm + Traefik + Let's Encrypt
Domínio:     buscador.pelagus.com.br
WhatsApp:    Chatwoot (já rodando na infra)
API Externa: Seats.aero Pro API (1.000 chamadas/dia)
Worker:      Cron jobs silenciosos (no_agent=true)
```

## Roadmap

### Fase 1 — MVP (✅ Concluído)
- [x] FastAPI com autenticação + PostgreSQL
- [x] Frontend estático servido pelo mesmo container
- [x] Deploy em Docker Swarm com Traefik + Let's Encrypt
- [x] Filtro por programa de fidelidade
- [x] Link de compra por resultado
- [x] Estrutura de backend preparada para dados reais

### Fase 2 — Dados Reais (🔄 Em Andamento)
- [ ] Assinar Seats.aero Pro anual ($99.99)
- [ ] Criar tabela `award_cache` no PostgreSQL
- [ ] Cron 3-6x/dia: consultar Seats.aero API → atualizar cache
- [ ] Conectar frontend ao banco de dados real
- [ ] Implementar scraper AwardFares (X/Twitter) como complemento

### Fase 3 — Alertas (📋 Planejado)
- [ ] Criar tabela `alertas` (rota, período, classe, milhas máximas, WhatsApp)
- [ ] Worker de matching alerta × award disponível
- [ ] Integração Chatwoot para disparo via WhatsApp
- [ ] Interface de gerenciamento de alertas
- [ ] Botão "Criar Alerta" no resultado da busca

### Fase 4 — Expansão (💡 Ideias)
- [ ] Calendário visual de melhor época
- [ ] Comparação cruzada de programas
- [ ] Múltiplos usuários com alertas próprios
- [ ] Histórico de preços e tendências
