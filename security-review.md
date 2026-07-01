# 🔒 Análise de Segurança — FlyTracker

> **Perfil:** Caio (Security, AppSec)  
> **Versão do documento:** 1.0  
> **Data:** 30 de junho de 2026  
> **Escopo:** Backend (Python/FastAPI), Mobile (React Native), Schema PostgreSQL

---

## Sumário Executivo

O FlyTracker encontra-se em fase inicial de desenvolvimento (MVP) e **não possui controles de segurança básicos implementados**. A aplicação atual expõe endpoints públicos sem autenticação, sem rate limiting, sem proteção de segredos, e com configuração CORS permissiva. Recomenda-se a implementação gradual das correções descritas neste documento antes da publicação em produção.

**Risco geral atual:** 🔴 **Crítico** para exposição pública; 🟡 **Médio** para ambiente de desenvolvimento local.

---

## 1. Análise de Riscos

### 1.1 Matriz de Riscos

| # | Risco | Probabilidade | Impacto | Prioridade | Componente Afetado |
|---|-------|:------------:|:-------:|:----------:|--------------------|
| R1 | Exposição da **chave da Amadeus API** em código-fonte ou logs | Alta | Crítico | 🔴 **Imediata** | Backend, CI/CD |
| R2 | Acesso não autenticado a todos os endpoints da API | Alta | Alto | 🔴 **Imediata** | Backend |
| R3 | Abuso da API via **ausência de rate limiting** | Alta | Médio | 🟡 **Alta** | Backend |
| R4 | **CORS aberto** (`*`) permitindo requisições de qualquer origem | Alta | Médio | 🟡 **Alta** | Backend |
| R5 | Vazamento de **dados de usuários** (email, preferências, alertas) | Média | Crítico | 🔴 **Imediata** | Backend, BD |
| R6 | **Scraping de sites de milhagem** sem proteção (bloqueio de IP, ações legais) | Alta | Médio | 🟡 **Alta** | Worker, Scraping |
| R7 | **Notificações push** sem validação de identidade do destinatário | Média | Médio | 🟡 **Média** | Push Service |
| R8 | **Injeção SQL** via consultas dinâmicas no worker de scraping | Baixa | Alto | 🟡 **Média** | Backend (futuro) |
| R9 | **Armazenamento de senhas** — schema prevê `senha_hash`, mas sem algoritmo definido | Média | Crítico | 🟡 **Alta** | Schema BD |
| R10 | **Logs expondo dados sensíveis** (emails, tokens, preços de consultas) | Média | Médio | 🟡 **Média** | Backend |

### 1.2 Descrição Detalhada dos Riscos

#### 🔴 R1 — Exposição da Chave Amadeus API
- **Cenário:** A chave da API Amadeus será necessária para consultar tarifas reais. Se hardcoded ou armazenada sem criptografia, pode ser extraída do binário mobile, de logs, ou do repositório.
- **Impacto:** Uso indevido da conta Amadeus, custos financeiros não autorizados, bloqueio da integração.
- **Mitigação:** Gerenciamento de segredos (Secrets Manager / vault) + variáveis de ambiente + ofuscação no client-side.

#### 🔴 R2 — Ausência de Autenticação
- **Cenário atual:** Todos os endpoints (`/api/flights`, `/api/alerts`, `/api/health`) estão públicos. Qualquer pessoa pode criar, listar e deletar alerts.
- **Prova:** `main.py` não importa ou utiliza qualquer mecanismo de auth (`Depends`, `APIKeyHeader`, JWT, OAuth2).
- **Impacto:** Criação massiva de alerts falsos, vazamento de dados sensíveis, negação de serviço.

#### 🟡 R3 — Sem Rate Limiting
- **Cenário:** Atacante pode bombardear `/api/flights` com requisições, sobrecarregando a API Amadeus (real) ou o backend.
- **Impacto:** Custos elevados de API terceira, degradação de serviço para usuários legítimos.

#### 🟡 R4 — CORS Aberto
- **Cenário atual:** `allow_origins=["*"]` combinado com `allow_credentials=True`.
- **Problema:** Navegadores bloqueiam `Access-Control-Allow-Origin: *` com `withCredentials`, mas a configuração permite que qualquer site leia respostas da API.
- **Impacto:** Potencial exfiltração de dados via ataques CSRF ou cross-origin.

#### 🔴 R5 — Vazamento de Dados de Usuários
- **Armazenamento atual:** Alerts em memória (`_alerts: dict[str, Alert]`), sem persistência e sem autenticação.
- **Schema futuro:** `usuarios` com `senha_hash`, `email`, `preferencias` (JSONB). Sem proteção de dados sensíveis em repouso.
- **Impacto:** Exposição de emails, preferências de viagem, alertas financeiros (preço alvo em R$ e milhas).

---

## 2. Recomendações de Proteção de API Keys

### 2.1 Amadeus API Key

```python
# RECOMENDADO: Usar pydantic-settings (já no requirements.txt)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    amadeus_api_key: str = ""
    amadeus_api_secret: str = ""
    database_url: str = "postgresql://localhost:5432/flytracker"
    fcm_server_key: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

### 2.2 Práticas Obrigatórias

| Prática | Descrição | Prioridade |
|---------|-----------|:----------:|
| **Ambiente Segregado** | Usar `.env` ou variáveis de ambiente do sistema — nunca hardcoded | 🔴 |
| **.gitignore** | Adicionar `.env` ao `.gitignore` imediatamente | 🔴 |
| **Secrets Manager** | Produção: AWS Secrets Manager / HashiCorp Vault / Doppler | 🟡 |
| **Rotação de Chaves** | Rotacionar a cada 90 dias ou imediatamente se comprometida | 🟡 |
| **Escopo Mínimo** | Usar chave Amadeus com permissões apenas de leitura (`Flight Offers Search`) | 🔴 |
| **Auditoria** | Logar uso da API key sem expor o valor completo (ex: `ama*****123`) | 🟡 |
| **Client-side (mobile)** | Usar proxy backend para chamadas Amadeus — **nunca** embutir a chave no app | 🔴 |

### 2.3 Proteção Contra Exposição em Logs

- Implementar **filtro de logs** (middleware FastAPI) para mascarar headers `Authorization`, `X-API-Key`
- Usar `python-json-logger` com campos redactados
- Não logar `request.body` ou `request.headers` em produção

---

## 3. Rate Limiting

### 3.1 Implementação Recomendada

```python
# Adicionar ao main.py (FastAPI)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.get("/api/flights")
@limiter.limit("30/minute")
def list_flights(..., request: Request):
    ...
```

### 3.2 Políticas Sugeridas

| Endpoint | Limite | Janela | Justificativa |
|----------|--------|--------|---------------|
| `GET /api/flights` | 30 req | 1 minuto | Evita abuso da API Amadeus (custo por chamada) |
| `POST /api/alerts` | 10 req | 1 minuto | Previne criação massiva de alerts |
| `DELETE /api/alerts` | 20 req | 1 minuto | Proteção contra deleção em massa |
| `GET /api/health` | 60 req | 1 minuto | Saúde pública (limite mais generoso) |

### 3.3 Medidas Adicionais

- **Redis** como backend de rate limiting distribuído (escalabilidade horizontal)
- **Throttling por usuário** quando autenticação for implementada
- **Throttling por IP** para endpoints não autenticados
- **Exponential backoff** para scraping de programas de milhagem
- **User-Agent rotation + proxy rotation** para scraping (evitar bloqueio)

---

## 4. Autenticação

### 4.1 Estado Atual
- **Nenhuma autenticação implementada** no backend.
- `pydantic-settings` está instalado mas não utilizado.
- Schema BD já estrutura `usuarios` com `senha_hash`.

### 4.2 Stack Recomendada

| Componente | Tecnologia | Motivo |
|------------|-----------|--------|
| **Hash de senha** | `bcrypt` (via `passlib`) | Argon2 também é aceitável; bcrypt é standard |
| **JWT** | `python-jose[cryptography]` + OAuth2 password flow | Stateless, padrão FastAPI |
| **Access Token** | 15-30 minutos | Curta duração reduz risco de replay |
| **Refresh Token** | 7-30 dias, armazenado em httpOnly cookie | Renovação segura |
| **MFA** | Opcional (TOTP via `pyotp`) | Recomendado para produção |
| **API Key (mobile)** | Cliente recebe API Key curta via login | Permite rate limiting por usuário |

### 4.3 Modelo de Implementação

```python
# Exemplo: FastAPI OAuth2 com JWT
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = settings.jwt_secret  # via env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### 4.4 Endpoints de Autenticação

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/register` | POST | Criar conta (nome, email, senha) |
| `/api/auth/login` | POST | Retorna access + refresh token |
| `/api/auth/refresh` | POST | Renova access token |
| `/api/auth/logout` | POST | Invalida refresh token |
| `/api/auth/me` | GET | Perfil do usuário autenticado |

### 4.5 Proteção de Senhas (Schema)

O schema atual prevê `senha_hash VARCHAR(255)` — recomenda-se:

```sql
-- Nunca armazenar senha em plaintext
-- Usar bcrypt (72 bytes máx input, saída ~60 chars)
-- Portanto VARCHAR(255) é adequado

-- Adicionar coluna para refresh token
ALTER TABLE usuarios ADD COLUMN refresh_token_hash VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN ultimo_login TIMESTAMPTZ;
```

---

## 5. Checklist OWASP Top 10 (2021)

### A01: Broken Access Control
- [🔴] **Controle de acesso ausente** — implementar autenticação JWT + roles (`user`, `admin`)
- [🔴] APIs públicas sem proteção — adicionar dependência `Depends(get_current_user)` em todas as rotas
- [🟡] Validar que usuários só acessam seus próprios alerts (`usuario_id` no token)

### A02: Cryptographic Failures
- [🔴] **Senhas armazenadas sem hash** — usar bcrypt ou Argon2 imediatamente
- [🟡] Dados sensíveis (email, preferências) sem criptografia em repouso
- [🟡] Conexão BD sem TLS — configurar `sslmode=require`
- [🟡] Transporte — forçar HTTPS (FastAPI + reverse proxy)

### A03: Injection
- [🟢] Pydantic já valida tipos e tamanhos nas models
- [🟡] **SQL dinâmico no worker de scraping** — usar consultas parametrizadas (SQLAlchemy / asyncpg)
- [🟡] Sanitizar inputs de scraping antes de persistir no BD
- [🟢] `precos.url_origem` (TEXT) — validar URL para evitar XSS em dashboards

### A04: Insecure Design
- [🔴] **Sem rate limiting** — implementar no middleware FastAPI
- [🟡] **Alerts notification sem throttling** — limitar notificações por hora/dia por usuário
- [🟡] **In-memory store** em produção — migrar para PostgreSQL imediatamente
- [🟡] **Sem limites de página** — `page_size` já tem `le=100` (bom); validar total de alerts por usuário

### A05: Security Misconfiguration
- [🔴] **CORS `*`** — restringir para origens específicas (ex: domínio do web app)
- [🔴] **Debug endpoints expostos** — remover `/docs` e `/redoc` em produção ou proteger com auth
- [🟡] `allow_credentials=True` com `allow_origins=["*"]` — viola especificação CORS
- [🟡] Sem headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, CSP)

### A06: Vulnerable and Outdated Components
- [🟡] FastAPI 0.115.6, Uvicorn 0.34.0, Pydantic 2.10.4 — versões recentes (OK)
- [🟡] Sem `pip-audit` ou `safety` no CI — adicionar verificação de vulnerabilidades
- [🟡] Dependências do mobile (Expo 52) — verificar CVS conhecidos regularmente

### A07: Identification and Authentication Failures
- [🔴] **Endpoint `/api/alerts` — qualquer um pode criar/deletar alerts de qualquer "usuário"**
- [🔴] **UUID de alerta é previsível** (`uuid4()` é aleatório, OK), mas sem dono vinculado
- [🟡] **Sem política de senha forte** — exigir mínimo 8 caracteres, maiúscula, número
- [🟡] **Sem proteção contra brute force** — rate limiting + account lockout após 5 tentativas

### A08: Software and Data Integrity Failures
- [🟡] **CI/CD pipeline** sem verificação de assinatura de commits ou SBOM
- [🟡] **Atualizações automáticas** — validar integridade dos pacotes npm/PyPI (hash lock files)
- [🟢] `package-lock.json` presente (boa prática)

### A09: Security Logging and Monitoring Failures
- [🔴] **Sem logging estruturado** — implementar `structlog` ou `python-json-logger`
- [🔴] **Sem alertas de segurança** — monitorar tentativas de auth falhas, rate limiting hits
- [🟡] **Sem auditoria de acesso aos alerts** — logar toda operação CRUD em alerts
- [🟡] **Sem correlação de eventos** — implementar ELK/Datadog/Sentry para produção

### A10: Server-Side Request Forgery (SSRF)
- [🟡] **Scraping de sites externos** — validar e restringir URLs para evitar SSRF
- [🟡] Usar whitelist de domínios para scraping (ex: `*.smiles.com.br`, `*.tudoazul.com`)
- [🟡] Timeout de conexão (ex: 10s) para evitar hanging requests
- [🟡] Não seguir redirecionamentos automaticamente sem validação

---

## 6. Recomendações Específicas por Componente

### 6.1 Backend (FastAPI)

```yaml
# security.yaml - Configuração de segurança recomendada
app:
  cors_origins: ["https://flytracker.app", "https://admin.flytracker.app"]
  rate_limit: "30/minute"
  max_alerts_per_user: 50
  jwt_expire_minutes: 30
  bcrypt_rounds: 12

logging:
  level: "INFO"
  redact_fields: ["password", "token", "api_key", "authorization"]

headers:
  X-Content-Type-Options: "nosniff"
  X-Frame-Options: "DENY"
  Strict-Transport-Security: "max-age=63072000; includeSubDomains"
  Content-Security-Policy: "default-src 'self'"
```

### 6.2 Mobile (React Native / Expo)

| Item | Recomendação | Prioridade |
|------|-------------|:----------:|
| **SSL Pinning** | Fixar certificado do servidor no app | 🟡 |
| **App Transport Security** | Configurar ATS no iOS (requires `NSAllowsArbitraryLoads = false`) | 🟡 |
| **Armazenamento Local** | Usar `expo-secure-store` para tokens (não AsyncStorage) | 🔴 |
| **Proteção de Tela** | `expo-screen-capture` para prevenir screenshots | 🟢 |
| **Biometria** | `expo-local-authentication` para desbloquear o app | 🟢 |
| **Minificação** | Ofuscar código JS em release builds | 🟡 |
| **Mock data** | Remover `MOCK_ALERTS` e `MOCK_FLIGHTS` antes de produção | 🔴 |

### 6.3 Scraping (Programas de Milhagem)

| Prática | Descrição | Prioridade |
|---------|-----------|:----------:|
| **User-Agent Rotation** | Rotacionar entre lista de UAs reais | 🔴 |
| **Proxy Rotation** | Usar pool de proxies residenciais (evitar bloqueio por IP) | 🟡 |
| **Respeito ao robots.txt** | Verificar e honrar regras de scraping | 🟡 |
| **Delay entre requests** | Mínimo 2-5 segundos entre requisições | 🔴 |
| **Capped rate** | Máx 10 req/min por domínio | 🔴 |
| **Headless browser** | Usar Playwright/Puppeteer para sites com JS pesado | 🟡 |
| **Validação de dados** | Sanitizar HTML recebido antes de persistir (evitar XSS + injection) | 🔴 |
| **Termos de serviço** | Verificar legalidade do scraping de cada site alvo | 🟡 |

### 6.4 Notificações Push (FCM)

| Item | Recomendação | Prioridade |
|------|-------------|:----------:|
| **Server Key** | Armazenar FCM server key no Secrets Manager (nunca no app) | 🔴 |
| **Device Token** | Validar que o token pertence ao usuário logado | 🔴 |
| **Associação** | Vincular device token ao `usuario_id` no BD | 🟡 |
| **Opt-in** | Solicitar permissão de notificação explicitamente (iOS 14+) | 🟡 |
| **Throttling** | Máx 5 notificações push/hora por usuário | 🟡 |
| **Conteúdo** | Não incluir dados sensíveis no payload da notificação | 🔴 |

---

## 7. Dependências e Atualizações

### 7.1 Dependências Críticas do Backend

| Pacote | Versão Atual | Vulnerabilidades Conhecidas | Ação |
|--------|:-----------:|:---------------------------:|------|
| `fastapi` | 0.115.6 | Nenhuma crítica | Manter atualizado |
| `uvicorn` | 0.34.0 | Nenhuma crítica | Manter atualizado |
| `pydantic` | 2.10.4 | Nenhuma crítica | Manter atualizado |
| `pydantic-settings` | 2.7.1 | Nenhuma crítica | **IMPORTANTE:** Instalar e usar |
| `bcrypt` (a adicionar) | — | — | Adicionar para hash de senhas |
| `python-jose` (a adicionar) | — | — | Adicionar para JWT |
| `slowapi` (a adicionar) | — | — | Adicionar para rate limiting |

### 7.2 Dependências do Mobile

| Pacote | Versão | Observação |
|--------|:------:|------------|
| `expo` | ~52.0.0 | Framework estável, manter atualizado |
| `react-native` | 0.76.6 | Versão recente, OK |
| `@react-navigation/*` | ^7.0.0 | Navegação, sem vetor de ataque direto |

---

## 8. Plano de Ação (Roadmap de Segurança)

### Fase 1 — Imediata (antes de produção)

- [ ] Configurar `.env` para secrets e remover qualquer hardcode
- [ ] Adicionar `.env` ao `.gitignore`
- [ ] Implementar autenticação JWT + OAuth2 em todas as rotas
- [ ] Restringir CORS para origens específicas
- [ ] Implementar rate limiting (slowapi)
- [ ] Configurar HTTPS via reverse proxy (Nginx/Traefik)
- [ ] Migrar de in-memory store para PostgreSQL
- [ ] Adicionar middleware de segurança (headers HTTP)
- [ ] Remover mock data sensível do mobile

### Fase 2 — Curto Prazo (1-2 sprints)

- [ ] Integrar pydantic-settings para gestão de configuração
- [ ] Implementar hash de senhas com bcrypt
- [ ] Adicionar refresh tokens
- [ ] Configurar logging estruturado com redação de campos sensíveis
- [ ] Implementar proteção contra scraping (proxies, delays)
- [ ] Configurar FCM com validação de device token
- [ ] Adicionar pipeline de segurança no CI (bandit, safety, pip-audit)

### Fase 3 — Médio Prazo (3-6 sprints)

- [ ] MFA (TOTP) para contas de usuário
- [ ] Auditoria completa de acesso (CRUD logging)
- [ ] Criptografia de dados sensíveis em repouso
- [ ] SBOM e verificação de integridade de dependências
- [ ] Testes de penetração (interno ou terceirizado)
- [ ] Programa de bug bounty
- [ ] Certificação ISO 27001 / SOC 2 (se aplicável)

---

## 9. Conclusão

O FlyTracker tem uma base de código bem estruturada e usa um stack moderno (FastAPI + React Native + PostgreSQL), mas está **completamente exposto** em termos de segurança. As vulnerabilidades mais críticas são:

1. **Ausência total de autenticação** — qualquer endpoint pode ser chamado anonimamente
2. **Nenhuma proteção de API keys** — quando a chave Amadeus for integrada, estará vulnerável
3. **Sem rate limiting** — a API pode ser abusada facilmente
4. **CORS permissivo** — `allow_origins=["*"]` é inseguro para produção
5. **Mock data hardcoded** no mobile — vaza estrutura de dados e dados sensíveis

Recomenda-se não expor o FlyTracker à internet pública sem antes implementar as correções da **Fase 1** do plano de ação acima.

---

## Apêndice A — Comandos Úteis para Auditoria

```bash
# Verificar secrets expostos no repositório
git secrets --scan

# Verificar dependências vulneráveis (back-end)
cd backend && pip-audit

# Verificar dependências vulneráveis (mobile)
cd mobile && npm audit

# Análise estática de segurança (Python)
bandit -r backend/

# Scan de secrets no código
trufflehog filesystem --directory=.

# Verificar configuração HTTPS
nmap --script ssl-enum-ciphers -p 443 flytracker-api.example.com
```

## Apêndice B — Configuração de Exemplo para Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name api.flytracker.app;

    ssl_certificate /etc/letsencrypt/live/api.flytracker.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.flytracker.app/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req zone=api burst=50 nodelay;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

*Documento gerado como parte da análise de segurança do FlyTracker. Revisar e atualizar a cada release ou quando houver mudanças significativas na arquitetura.*
