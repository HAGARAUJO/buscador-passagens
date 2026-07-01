# Award Data Research - Plataformas de Busca de Tarifas Award (Milhas)

> Data da pesquisa: 2026-07-30
> Projeto: FlyTracker

---

## 1. Seats.aero (https://seats.aero)

### Dados públicos acessíveis sem login
- **Homepage com search form**: É uma SPA em Vue.js que permite buscar rotas de award (ex: LHR-JFK pré-preenchido).
- **Explore deals**: Seção na homepage que mostra deals de regiões (e.g., "Explore deals from Europe") com cards de ofertas.
- **API Partners**: Documentação pública da API em https://seats.aero/skill.md (API base: https://seats.aero/partnerapi).
- **Search gratuito**: Permite buscar voos nos próximos 2 meses sem registro.
- **Busca avançada (PRO)**: Requer assinatura ($9.99/mês) para busca ao vivo e dados de até 1 ano.

### Formato dos dados
- **SPA em Vue.js** (aplicação single-page, dados carregados via XHR/fetch).
- **API REST** documentada publicamente, retorna JSON.
- Endpoint: GET /partnerapi/search?origin_airport=GRU&destination_airport=JFK (requer chave de API PRO).
- Endpoint: GET /partnerapi/availability?source=aeroplan&cabin=business (dados em massa por programa).

### Endpoints de API interna (descobertos)
- https://seats.aero/partnerapi/search - Busca de disponibilidade (requer Partner-Authorization header)
- https://seats.aero/partnerapi/availability - Disponibilidade em massa por programa
- https://seats.aero/partnerapi/routes - Verificar rotas trackeadas
- https://seats.aero/partnerapi/trips - Detalhes de voo específicos
- A API aceita parametros: origin_airport, destination_airport, start_date, end_date, cabins, carriers, only_direct_flights, source (programa de milhas), take, order_by, include_trips.

### Exemplo de tarifa award
- **SFO-NRT (SF-Tokyo)**: A partir de 60.000 milhas + taxas em business/first (documentado na API).
- **LHR-JFK (Londres-Nova York)**: disponivel na busca publica (precos variam por programa).
- **Rotas Brasil**: GRU/JFK/GIG sao aeroportos suportados pelo sistema, mas dados especificos requerem PRO account.

### URL exata
- Homepage: https://seats.aero/
- API Docs: https://seats.aero/skill.md
- Settings: https://seats.aero/settings

### Observacoes
- **Protecao Cloudflare**: Bloqueia bots/scripts apos varias requisicoes.
- API publica requer assinatura PRO ($9.99/mes) para obter chave.
- Dados sao CACHED (nao live) para API partners.

---

## 2. Point.me (https://point.me)

### Dados publicos acessiveis sem login
- **Marketing site**: https://www.point.me (Next.js SPA) - landing page com descricoes e depoimentos.
- **Deals na homepage**: O site mostra deals de exemplo no servidor (dados embedados no HTML via RSC).
- **app.point.me**: Subdominio do metabuscador real.
- **Blog**: artigos educativos sobre milhas.

### Formato dos dados
- **Next.js SPA** (React Server Components, dados embedados no HTML inicial).
- Dados embedados em JSON no formato RSC (self.__next_f.push).
- Estrutura de dados: origin, destination, airline, cabin, points, taxes, stops, date.
- **point.me deals**: Cards visuais mostrando origem -> destino, companhia, classe, pontos + taxas.

### Endpoints de API interna (descobertos)
- O app principal roda em subdominio separado (app.point.me).
- API de busca nao exposta publicamente sem autenticacao.
- Dados embedados no HTML da pagina inicial via RSC.

### Exemplos de tarifas award (extraidos do HTML da homepage)

| Rota | Classe | Cia Aerea | Milhas | Taxas |
|------|--------|-----------|--------|-------|
| SLC->AMS (Salt Lake City->Amsterdam) | Economy | - | **30.000 pts** | +$5.00 |
| JFK->LHR (New York->London) | Business | Virgin Atlantic | **29.000 pts** | +$688.00 |
| SLC->CDG (Salt Lake City->Paris) | Economy | Air France/KLM Flying Blue | **25.000 pts** | +$33.00 |
| ORD->CUN (Chicago->Cancun) | Economy | JetBlue | **7.000 pts** | +$62.00 |
| LAX->MAD (Los Angeles->Madrid) | Business | Virgin Atlantic Flying Club | **57.500 pts** | +$58.00 |
| DTW->LHR (Detroit->London) | Economy | Virgin Atlantic Flying Club | **25.000 pts** | +$33.00 |

### URL exata
- Homepage: https://www.point.me/
- App: https://app.point.me
- Product: https://www.point.me/product

### Observacoes
- Plataforma paga (membership), sem trial publico gratuito.
- Dados de exemplo sao "deals" promocionais, nao pesquisa ao vivo.
- Transfer bonuses de bancos (Chase, Amex, Citi) destacados nos deals.

---

## 3. ExpertFlyer (https://www.expertflyer.com)

### Dados publicos acessiveis sem login
- **Landing page**: Next.js SPA com informacoes do produto.
- **Features**: Descricoes de busca de award inventory, upgrade availability, seat maps.
- **Pricing**: Tabela de precos publica.
  - Free: Alertas basicos (1 alerta)
  - Basic: $6.99/mes (50 alertas, 250 queries/mes)
  - Premium: $12.99/mes (250 alertas, queries ilimitadas)
  - Elite: $19.99/mes (SWU search avancado)
  - Trial gratis de 5 dias disponivel.
- **Blog**: https://www.expertflyer.com/blog

### Formato dos dados
- **Next.js SPA** com renderizacao do lado do servidor para landing page.
- Dados reais de award/upgrade **requerem login**.
- Interface web com features: busca de voos, mapas de assentos, alertas.
- API interna nao documentada publicamente.

### Endpoints de API interna (descobertos)
- API nao exposta publicamente (todo conteudo protegido por autenticacao).
- Endpoints de autenticacao: /auth/login, /auth/login?screen_hint=signup&returnTo=/subscription

### Exemplo de tarifa award
- **Nao foi possivel obter dados de award sem login**.
- Especializado em **Systemwide Upgrades (SWU)** e upgrades de cabine.
- Foco em: American Airlines, United, Delta.

### URL exata
- Homepage: https://www.expertflyer.com/
- Login: https://www.expertflyer.com/auth/login

### Observacoes
- **TODO o conteudo valioso esta atras de login**.
- Trial gratis de 5 dias disponivel para testar.
- Melhor plataforma para upgrades (Systemwide, eUpgrades, GUCs).
- Nao e especificamente um buscador de award fares como os outros.

---

## 4. SeatSpy (https://seatspy.com)

### Dados publicos acessiveis sem login
- **Homepage com search form**: Formulario funcional com tom-select.
- **Aeroporto GRU disponivel**: GRU (Guarulhos) e JFK estao na lista de aeroportos.
- **Template HTML server-side**: Paginas renderizadas no servidor.
- **Search requer login** (redireciona para sign-in ao clicar Search).
- **8 airlines**: British Airways, Air France, KLM, Iberia, Cathay Pacific, Etihad, JetBlue, Virgin Atlantic.
- **Pricing**: Planos pagos com trial gratis.
- **FAQ**: https://seatspy.com/faq

### Formato dos dados
- **HTML server-rendered** com JavaScript para interatividade (tom-select, flatpickr).
- Dados de search carregados via API interna apos autenticacao.
- API endpoints nao expostos publicamente.
- Static assets: SVG icons, CSS modules, bundled JS (Vite/rollup).

### Endpoints de API interna (descobertos)
- API privada nao documentada publicamente.
- Endpoints de autenticacao: /auth/sign-in
- Monitoramento: Sentry, Clarity (Microsoft).

### Exemplo de tarifa award
- **LON->NYC (Londres->Nova York)**: Mencionado na homepage como alerta disponivel.
- **British Airways (Avios)**: Especialista em BA Avios. Rotas LON->NYC tipicamente 25.000-50.000 Avios + taxas.
- **Dados especificos nao disponiveis sem login**.
- GRU->JFK via American Airlines (AAdvantage) a partir de ~30.000 milhas + taxas em promocao.

### URL exata
- Homepage: https://seatspy.com/
- Pricing: https://seatspy.com/pricing
- FAQ: https://seatspy.com/faq
- Sign in: https://seatspy.com/auth/sign-in

### Observacoes
- Foco em British Airways Avios, mas suporta 8 airlines.
- Trial gratis disponivel para testar funcionalidades.
- Alertas em tempo real via Email, WhatsApp, Telegram e SMS.

---

## Resumo Comparativo

| Plataforma | SPA/Framework | Dados publicos sem login | API publica | Acesso a GRU-JFK |
|---|---|---|---|---|
| **Seats.aero** | Vue.js SPA | Search basico (2 meses), Explore deals | Sim (PRO, $9.99/mes) | Potencial (requer PRO) |
| **Point.me** | Next.js SPA | Apenas marketing site, deals exemplos | Nao (app privado) | Nao disponivel |
| **ExpertFlyer** | Next.js SPA | Landing page, precos, blog | Nao | Requer assinatura |
| **SeatSpy** | HTML server + JS | Search form publico, resultado requer login | Nao | Requer login |

## Observacoes Gerais para o FlyTracker

1. **Rotas Brasil-USA (GRU-JFK)**: Tarifas award tipicas:
   - **Economy**: 30.000-40.000 milhas + taxas (AAdvantage, Delta SkyMiles, United MileagePlus)
   - **Business**: 60.000-85.000 milhas + taxas
   - **Promocoes sazonais**: Podem baixar para 22.000-25.000 (economy) ou 50.000 (business)

2. **Nenhuma plataforma expoe API REST publica gratuita** para dados de award.
   - Seats.aero e a unica com API documentada, mas requer PRO.
   - As demais sao aplicacoes web fechadas.

3. **Para integracao FlyTracker**:
   - **Seats.aero Partner API** e a melhor candidata (API REST documentada, paga).
   - **Web scraping** das plataformas e possivel mas arriscado (Cloudflare, rate limits).
   - **Point.me** e **ExpertFlyer** nao tem APIs publicas  viaveis.

4. **Deals de exemplo reais** (extraidos do point.me):
   - Melhor deal encontrado: ORD->CUN (Chicago->Cancun) a **7.000 pts + $62** via JetBlue.
   - Deal internacional: SLC->CDG (Salt Lake City->Paris) a **25.000 pts + $33** via Flying Blue.
