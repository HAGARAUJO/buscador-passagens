# 🛩️ Buscador de Passagens (FlyTracker)

Buscador inteligente de passagens aéreas **award (milhas)** com alertas via WhatsApp.

**🔗 https://buscador.pelagus.com.br**

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | HTML/CSS/JS estático |
| Backend | Python/FastAPI |
| Database | PostgreSQL + Redis |
| Infra | Docker Swarm + Traefik + Let's Encrypt |
| API | Seats.aero Pro |
| Notificações | Chatwoot (WhatsApp) |

## Diferencial

Alertas de award disponível via WhatsApp — **nenhuma ferramenta brasileira faz isso**.

## Roadmap

- [x] MVP com frontend + auth + deploy
- [x] Filtros por programa + links de compra
- [ ] Dados reais via Seats.aero Pro API
- [ ] Alertas WhatsApp via Chatwoot
- [ ] Calendário visual de melhor época
- [ ] Comparação cruzada de programas

## Repositório

Migrado para `composio-mcp-flytracker` — parte do ecossistema Composio MCP.
