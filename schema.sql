-- ============================================================================
-- FlyTracker — Esquema Completo do Banco PostgreSQL
-- Perfil: lara (DBA)
-- Tecnologias: PostgreSQL 16+ com pgvector
-- Nomes em português (pt-BR)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Extensão obrigatória: pgvector (para similaridade de embeddings)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USUARIOS
-- ============================================================================
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(160) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    preferencias    JSONB DEFAULT '{}'::jsonb,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_usuarios_ativo ON usuarios (ativo);

-- Trigger de atualização automática
CREATE OR REPLACE FUNCTION trigger_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_atualizado_em
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizado_em();

-- ============================================================================
-- 2. COMPANHIAS_AEREAS
-- ============================================================================
CREATE TABLE companhias_aereas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_iata     CHAR(2) NOT NULL UNIQUE,          -- ex: 'LA', 'G3', 'AA'
    codigo_icao     CHAR(3) UNIQUE,                   -- ex: 'LAN', 'GLO', 'AAL'
    nome            VARCHAR(160) NOT NULL,
    nome_curto      VARCHAR(40),                       -- ex: 'Latam', 'Gol', 'American'
    pais_origem     CHAR(2),                           -- ISO 3166-1 alpha-2
    alianca         VARCHAR(20),                       -- 'Star Alliance', 'oneworld', 'SkyTeam', null
    logo_url        TEXT,
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companhias_iata ON companhias_aereas (codigo_iata);

-- ============================================================================
-- 3. PROGRAMAS_MILHAGEM
-- ============================================================================
CREATE TABLE programas_milhagem (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companhia_id    UUID NOT NULL REFERENCES companhias_aereas(id) ON DELETE CASCADE,
    nome            VARCHAR(160) NOT NULL,
    nome_curto      VARCHAR(40),                       -- ex: 'Latam Pass', 'Smiles', 'AAdvantage'
    moeda           VARCHAR(10) NOT NULL DEFAULT 'milhas', -- 'milhas', 'pontos', etc.
    taxa_conversao  NUMERIC(12,4) DEFAULT 1.0,         -- fator p/ milha padrão
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programas_companhia ON programas_milhagem (companhia_id);

-- ============================================================================
-- 4. ROTAS
-- ============================================================================
CREATE TABLE rotas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origem_iata     CHAR(3) NOT NULL,                  -- aeroporto origem
    destino_iata    CHAR(3) NOT NULL,                  -- aeroporto destino
    origem_cidade   VARCHAR(120),
    destino_cidade  VARCHAR(120),
    origem_pais     CHAR(2),
    destino_pais    CHAR(2),
    distancia_km    INTEGER,                           -- distância em linha reta (grande círculo)
    UNIQUE (origem_iata, destino_iata),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rotas_origem ON rotas (origem_iata);
CREATE INDEX idx_rotas_destino ON rotas (destino_iata);

-- ============================================================================
-- 5. VOOS
-- ============================================================================
CREATE TABLE voos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rota_id             UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    companhia_id        UUID NOT NULL REFERENCES companhias_aereas(id) ON DELETE CASCADE,
    numero_voo          VARCHAR(10) NOT NULL,           -- ex: 'LA8093', 'G31234'
    data_partida        DATE NOT NULL,                  -- data local da partida
    horario_partida     TIME NOT NULL,
    horario_chegada     TIME NOT NULL,
    timezone_partida    VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    timezone_chegada    VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    duracao_minutos     SMALLINT,                       -- duração total programada
    assentos_total      SMALLINT,
    aeronave_tipo       VARCHAR(20),                    -- 'Boeing 737-800', 'Airbus A320', etc.
    escala              BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE se voo com escala(s)
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (companhia_id, numero_voo, data_partida)
);

CREATE INDEX idx_voos_rota ON voos (rota_id);
CREATE INDEX idx_voos_companhia ON voos (companhia_id);
CREATE INDEX idx_voos_data ON voos (data_partida);
CREATE INDEX idx_voos_numero ON voos (numero_voo);

-- ============================================================================
-- 6. PRECOS
-- Tabela principal de preços para um voo específico.
-- Suporta preço comercial (R$) e award (milhas) num mesmo registro.
-- ============================================================================
CREATE TABLE precos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voo_id              UUID NOT NULL REFERENCES voos(id) ON DELETE CASCADE,
    programa_id         UUID REFERENCES programas_milhagem(id) ON DELETE SET NULL,

    -- Preço comercial em reais
    preco_r$            NUMERIC(12,2),                  -- valor em reais (pode ser NULL p/ award-only)
    moeda_r$            CHAR(3) DEFAULT 'BRL',

    -- Preço award em milhas
    milhas              INTEGER,                        -- quantidade de milhas/pontos necessária
    taxa_r$             NUMERIC(10,2),                  -- taxa de emissão em reais (quando aplicável)
    classe_award        VARCHAR(30),                    -- ex: 'Econômica Promocional', 'Executiva', 'Primeira'

    -- Metadados da busca
    classe              VARCHAR(30) NOT NULL DEFAULT 'Econômica',  -- 'Econômica', 'Executiva', 'Primeira'
    cabine              VARCHAR(20) DEFAULT 'Y',        -- Y=eco, J=business, F=first
    assentos_disponiveis SMALLINT,                      -- assentos restantes nessa tarifa
    origem_preco        VARCHAR(30) DEFAULT 'manual',   -- 'manual', 'web-scraping', 'api', 'crowdsource'
    url_origem          TEXT,                            -- link da oferta original

    -- Escopo temporal
    valido_a_partir_de  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valido_ate          TIMESTAMPTZ,                     -- NULL = válido até novo aviso
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_precos_voo ON precos (voo_id);
CREATE INDEX idx_precos_programa ON precos (programa_id);
CREATE INDEX idx_precos_valor ON precos (preco_r$, milhas);
CREATE INDEX idx_precos_validade ON precos (valido_a_partir_de, valido_ate);
CREATE INDEX idx_precos_classe ON precos (classe);

-- Garantir que ao menos um dos dois preços esteja preenchido
ALTER TABLE precos ADD CONSTRAINT chk_preco_ou_milhas
    CHECK (preco_r$ IS NOT NULL OR milhas IS NOT NULL);

-- ============================================================================
-- 7. HISTORICO_PRECOS
-- Tabela de imutável (append-only) para séries temporais de preços.
-- Essencial para alertas de queda de preço e análises preditivas.
-- ============================================================================
CREATE TABLE historico_precos (
    id                  BIGSERIAL PRIMARY KEY,
    preco_id            UUID REFERENCES precos(id) ON DELETE SET NULL,
    voo_id              UUID NOT NULL REFERENCES voos(id) ON DELETE CASCADE,
    programa_id         UUID REFERENCES programas_milhagem(id) ON DELETE SET NULL,

    -- Snapshot do preço
    preco_r$            NUMERIC(12,2),
    milhas              INTEGER,
    taxa_r$             NUMERIC(10,2),
    assentos_disponiveis SMALLINT,

    -- Variação em relação ao registro imediatamente anterior (mesma combinação voo+classe+programa)
    variacao_r$         NUMERIC(12,2),                  -- positiva = aumento, negativa = queda
    variacao_milhas     INTEGER,
    variacao_percentual NUMERIC(6,4),                   -- (atual - anterior) / anterior * 100

    -- Metadados
    classe              VARCHAR(30),
    cabine              VARCHAR(20),
    origem_coleta       VARCHAR(30) DEFAULT 'web-scraping',
    coletado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Embedding pgvector para busca semântica de padrões de preço
    embedding           vector(384),

    -- Particionamento implícito por mês (via trigger RULE ou table inheritance futuramente)
    coleta_mes          DATE GENERATED ALWAYS AS (DATE_TRUNC('month', coletado_em)) STORED
);

-- Índices essenciais para performance analítica
CREATE INDEX idx_historico_voo ON historico_precos (voo_id);
CREATE INDEX idx_historico_preco_id ON historico_precos (preco_id);
CREATE INDEX idx_historico_programa ON historico_precos (programa_id);
CREATE INDEX idx_historico_coleta ON historico_precos (coletado_em DESC);
CREATE INDEX idx_historico_mes ON historico_precos (coleta_mes DESC);
CREATE INDEX idx_historico_variacao ON historico_precos (variacao_r$, variacao_milhas);
CREATE INDEX idx_historico_classe ON historico_precos (classe);

-- Índice IVFFlat para pgvector (busca aproximada por similaridade de embeddings)
CREATE INDEX idx_historico_embedding ON historico_precos
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================================
-- 8. ALERTAS
-- Usuário define condições para ser notificado (ex: queda de preço)
-- ============================================================================
CREATE TABLE alertas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    voo_id              UUID REFERENCES voos(id) ON DELETE CASCADE,
    rota_id             UUID REFERENCES rotas(id) ON DELETE CASCADE,

    -- Condições do alerta
    tipo                VARCHAR(20) NOT NULL DEFAULT 'preco',
    -- 'preco', 'milhas', 'percentual', 'disponibilidade'
    condicao            VARCHAR(10) NOT NULL DEFAULT 'abaixo_de',
    -- 'abaixo_de', 'acima_de', 'igual_a'

    -- Limiares (pelo menos um deve ser preenchido)
    valor_r$_alvo       NUMERIC(12,2),
    milhas_alvo         INTEGER,
    percentual_queda    NUMERIC(6,4),                   -- ex: 0.15 = 15% de queda do menor preço histórico
    assentos_minimos    SMALLINT,

    -- Escopo
    classe              VARCHAR(30),
    programa_id         UUID REFERENCES programas_milhagem(id) ON DELETE CASCADE,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    intervalo_checagem  INTERVAL NOT NULL DEFAULT '1 hour',  -- frequência de reavaliação

    -- Controle de disparo (evita notificação repetida)
    ultima_verificacao  TIMESTAMPTZ,
    ultimo_disparo      TIMESTAMPTZ,
    vezes_disparado     INTEGER NOT NULL DEFAULT 0,
    max_disparos        INTEGER DEFAULT 1,              -- NULL = sem limite

    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Garantir que ao menos um alvo foi informado
    CONSTRAINT chk_alerta_alvo CHECK (
        valor_r$_alvo IS NOT NULL OR
        milhas_alvo IS NOT NULL OR
        percentual_queda IS NOT NULL OR
        assentos_minimos IS NOT NULL
    ),

    -- Garantir que ao menos um voo ou rota foi referenciado
    CONSTRAINT chk_alerta_escopo CHECK (
        voo_id IS NOT NULL OR rota_id IS NOT NULL
    )
);

CREATE INDEX idx_alertas_usuario ON alertas (usuario_id);
CREATE INDEX idx_alertas_voo ON alertas (voo_id);
CREATE INDEX idx_alertas_rota ON alertas (rota_id);
CREATE INDEX idx_alertas_ativo ON alertas (ativo) WHERE ativo = TRUE;

CREATE TRIGGER trg_alertas_atualizado_em
    BEFORE UPDATE ON alertas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizado_em();

-- ============================================================================
-- 9. NOTIFICACOES
-- Histórico de notificações entregues ao usuário.
-- ============================================================================
CREATE TABLE notificacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    alerta_id           UUID REFERENCES alertas(id) ON DELETE SET NULL,
    voo_id              UUID REFERENCES voos(id) ON DELETE SET NULL,

    -- Conteúdo
    titulo              VARCHAR(255) NOT NULL,
    mensagem            TEXT NOT NULL,
    canal               VARCHAR(20) NOT NULL DEFAULT 'email',
    -- 'email', 'push', 'sms', 'webhook', 'in_app'
    tipo                VARCHAR(20) NOT NULL DEFAULT 'alerta_preco',
    -- 'alerta_preco', 'alerta_milhas', 'confirmacao', 'promocao', 'sistema'

    -- Metadados de entrega
    lida                BOOLEAN NOT NULL DEFAULT FALSE,
    lida_em             TIMESTAMPTZ,
    entregue            BOOLEAN NOT NULL DEFAULT FALSE,
    entregue_em         TIMESTAMPTZ,
    erro_entrega        TEXT,                            -- mensagem de erro se falhou

    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_usuario ON notificacoes (usuario_id);
CREATE INDEX idx_notificacoes_alerta ON notificacoes (alerta_id);
CREATE INDEX idx_notificacoes_nao_lidas ON notificacoes (usuario_id, lida)
    WHERE lida = FALSE;
CREATE INDEX idx_notificacoes_criacao ON notificacoes (criado_em DESC);

-- ============================================================================
-- VIEWS AUXILIARES
-- ============================================================================

-- View: histórico de preços enriquecido com dados do voo e rota
CREATE VIEW vw_historico_completo AS
SELECT
    h.id               AS historico_id,
    h.coletado_em,
    h.preco_r$,
    h.milhas,
    h.taxa_r$,
    h.variacao_r$,
    h.variacao_milhas,
    h.variacao_percentual,
    h.classe,
    h.assentos_disponiveis,
    v.numero_voo,
    v.data_partida,
    v.horario_partida,
    v.horario_chegada,
    r.origem_iata,
    r.destino_iata,
    r.origem_cidade,
    r.destino_cidade,
    c.nome              AS companhia,
    c.codigo_iata       AS companhia_iata,
    p.nome_curto        AS programa
FROM historico_precos h
JOIN voos v ON v.id = h.voo_id
JOIN rotas r ON r.id = v.rota_id
JOIN companhias_aereas c ON c.id = v.companhia_id
LEFT JOIN programas_milhagem p ON p.id = h.programa_id;

-- View: menores preços atuais por rota
CREATE VIEW vw_melhores_precos_rota AS
SELECT DISTINCT ON (r.id, p.classe, p.programa_id)
    r.id                                AS rota_id,
    r.origem_iata,
    r.destino_iata,
    r.origem_cidade,
    r.destino_cidade,
    v.id                                AS voo_id,
    v.numero_voo,
    v.data_partida,
    c.nome                              AS companhia,
    c.codigo_iata                       AS companhia_iata,
    prg.nome_curto                      AS programa,
    p.classe,
    p.preco_r$,
    p.milhas,
    p.taxa_r$,
    p.assentos_disponiveis,
    p.valido_ate
FROM precos p
JOIN voos v ON v.id = p.voo_id
JOIN rotas r ON r.id = v.rota_id
JOIN companhias_aereas c ON c.id = v.companhia_id
LEFT JOIN programas_milhagem prg ON prg.id = p.programa_id
WHERE (p.valido_ate IS NULL OR p.valido_ate > NOW())
  AND (p.preco_r$ IS NOT NULL OR p.milhas IS NOT NULL)
ORDER BY r.id, p.classe, p.programa_id,
    COALESCE(p.preco_r$, 999999999),
    COALESCE(p.milhas, 999999999);

-- ============================================================================
-- FUNÇÕES ÚTEIS
-- ============================================================================

-- Função: registrar um snapshot de preço no histórico (append-only)
-- Calcula automaticamente a variação em relação ao registro anterior.
CREATE OR REPLACE FUNCTION registrar_historico_preco(
    p_preco_id          UUID,
    p_voo_id            UUID,
    p_programa_id       UUID DEFAULT NULL,
    p_preco_r$          NUMERIC(12,2) DEFAULT NULL,
    p_milhas            INTEGER DEFAULT NULL,
    p_taxa_r$           NUMERIC(10,2) DEFAULT NULL,
    p_assentos          SMALLINT DEFAULT NULL,
    p_classe            VARCHAR(30) DEFAULT 'Econômica',
    p_cabine            VARCHAR(20) DEFAULT 'Y',
    p_origem            VARCHAR(30) DEFAULT 'web-scraping'
)
RETURNS BIGINT AS $$
DECLARE
    v_ultimo historico_precos%ROWTYPE;
    v_variacao_r$ NUMERIC(12,2);
    v_variacao_milhas INTEGER;
    v_variacao_pct NUMERIC(6,4);
    v_novo_id BIGINT;
BEGIN
    -- Buscar o registro imediatamente anterior para esta combinação
    SELECT * INTO v_ultimo
    FROM historico_precos
    WHERE voo_id = p_voo_id
      AND (classe IS NOT DISTINCT FROM p_classe)
      AND (programa_id IS NOT DISTINCT FROM p_programa_id)
    ORDER BY coletado_em DESC
    LIMIT 1;

    -- Calcular variações
    v_variacao_r$ := CASE
        WHEN v_ultimo.preco_r$ IS NOT NULL AND p_preco_r$ IS NOT NULL
            THEN p_preco_r$ - v_ultimo.preco_r$
        ELSE NULL
    END;

    v_variacao_milhas := CASE
        WHEN v_ultimo.milhas IS NOT NULL AND p_milhas IS NOT NULL
            THEN p_milhas - v_ultimo.milhas
        ELSE NULL
    END;

    v_variacao_pct := CASE
        WHEN v_ultimo.preco_r$ IS NOT NULL AND v_ultimo.preco_r$ > 0 AND p_preco_r$ IS NOT NULL
            THEN ROUND((p_preco_r$ - v_ultimo.preco_r$) / v_ultimo.preco_r$ * 100, 4)::NUMERIC(6,4)
        ELSE NULL
    END;

    -- Inserir o novo registro
    INSERT INTO historico_precos (
        preco_id, voo_id, programa_id,
        preco_r$, milhas, taxa_r$, assentos_disponiveis,
        variacao_r$, variacao_milhas, variacao_percentual,
        classe, cabine, origem_coleta
    ) VALUES (
        p_preco_id, p_voo_id, p_programa_id,
        p_preco_r$, p_milhas, p_taxa_r$, p_assentos,
        v_variacao_r$, v_variacao_milhas, v_variacao_pct,
        p_classe, p_cabine, p_origem
    )
    RETURNING id INTO v_novo_id;

    RETURN v_novo_id;
END;
$$ LANGUAGE plpgsql;

-- Função: verificar alertas de um usuário específico
CREATE OR REPLACE FUNCTION verificar_alertas_usuario(
    p_usuario_id UUID
)
RETURNS TABLE (
    alerta_id       UUID,
    titulo          VARCHAR,
    mensagem        TEXT,
    voo_numero      VARCHAR,
    origem          CHAR(3),
    destino         CHAR(3),
    preco_atual_r$  NUMERIC(12,2),
    milhas_atuais   INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH precos_recentes AS (
        SELECT DISTINCT ON (h.voo_id, h.classe, h.programa_id)
            h.voo_id,
            h.classe,
            h.programa_id,
            h.preco_r$,
            h.milhas,
            h.taxa_r$,
            h.coletado_em,
            v.numero_voo,
            v.rota_id,
            v.companhia_id
        FROM historico_precos h
        JOIN voos v ON v.id = h.voo_id
        WHERE h.coletado_em > NOW() - INTERVAL '24 hours'
        ORDER BY h.voo_id, h.classe, h.programa_id, h.coletado_em DESC
    )
    SELECT
        a.id,
        CASE
            WHEN a.tipo = 'preco' THEN '💰 Preço abaixo do alvo!'
            WHEN a.tipo = 'milhas' THEN '🎯 Milhas abaixo do alvo!'
            WHEN a.tipo = 'percentual' THEN '📉 Queda percentual detectada!'
            ELSE '🔔 Alerta disparado!'
        END::VARCHAR,
        CASE
            WHEN a.tipo = 'preco' AND p.preco_r$ IS NOT NULL
                THEN 'Preço de R$ ' || p.preco_r$ || ' está abaixo do alvo de R$ ' || a.valor_r$_alvo
            WHEN a.tipo = 'milhas' AND p.milhas IS NOT NULL
                THEN 'Milhas: ' || p.milhas || ' está abaixo do alvo de ' || a.milhas_alvo
            WHEN a.tipo = 'percentual' AND p.preco_r$ IS NOT NULL AND a.percentual_queda IS NOT NULL
                THEN 'Preço caiu mais de ' || (a.percentual_queda * 100)::INT || '% para R$ ' || p.preco_r$
            ELSE 'Condição do alerta foi atingida.'
        END::TEXT,
        p.numero_voo,
        r.origem_iata,
        r.destino_iata,
        p.preco_r$,
        p.milhas
    FROM alertas a
    JOIN precos_recentes p ON
        (a.voo_id = p.voo_id OR a.rota_id = p.rota_id)
    JOIN rotas r ON r.id = COALESCE(p.rota_id, a.rota_id)
    WHERE a.usuario_id = p_usuario_id
      AND a.ativo = TRUE
      AND (a.max_disparos IS NULL OR a.vezes_disparado < a.max_disparos)
      AND (
          (a.tipo = 'preco' AND a.valor_r$_alvo IS NOT NULL AND p.preco_r$ IS NOT NULL AND p.preco_r$ <= a.valor_r$_alvo)
          OR
          (a.tipo = 'milhas' AND a.milhas_alvo IS NOT NULL AND p.milhas IS NOT NULL AND p.milhas <= a.milhas_alvo)
          OR
          (a.tipo = 'percentual' AND a.percentual_queda IS NOT NULL AND p.preco_r$ IS NOT NULL
               AND p.preco_r$ <= (
                   SELECT MIN(ph.preco_r$) * (1 - a.percentual_queda)
                   FROM historico_precos ph
                   WHERE ph.voo_id = p.voo_id AND ph.classe = p.classe
               ))
      )
      AND (a.ultimo_disparo IS NULL OR a.ultimo_disparo < NOW() - a.intervalo_checagem);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS E COLUNAS (DOCUMENTAÇÃO INLINE)
-- ============================================================================

COMMENT ON TABLE usuarios IS 'Usuários registrados no FlyTracker';
COMMENT ON TABLE companhias_aereas IS 'Companhias aéreas monitoradas';
COMMENT ON TABLE programas_milhagem IS 'Programas de fidelidade/milhagem vinculados a uma companhia';
COMMENT ON TABLE rotas IS 'Rotas (pares origem-destino) entre aeroportos';
COMMENT ON TABLE voos IS 'Voos individuais com data e horário vinculados a uma rota e companhia';
COMMENT ON TABLE precos IS 'Preços ativos (comercial R$ e/ou award em milhas) para um voo';
COMMENT ON TABLE historico_precos IS 'Série temporal imutável de preços para análises, alertas e predições';
COMMENT ON TABLE alertas IS 'Regras definidas pelo usuário para disparo de notificações';
COMMENT ON TABLE notificacoes IS 'Histórico de notificações enviadas aos usuários';

COMMENT ON COLUMN historico_precos.embedding IS 'Embedding pgvector(384) para similaridade semântica de padrões de precificação';
COMMENT ON COLUMN historico_precos.variacao_percentual IS 'Variação percentual em relação ao registro anterior (positivo = aumento, negativo = queda)';
COMMENT ON COLUMN alertas.percentual_queda IS 'Ex: 0.15 = dispara quando preço cair 15% abaixo do menor histórico registrado';

COMMIT;
