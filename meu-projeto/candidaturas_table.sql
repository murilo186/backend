-- Tabela para armazenar candidaturas de motoristas para fretes terceirizados
CREATE TABLE IF NOT EXISTS candidaturas_fretes (
  id SERIAL PRIMARY KEY,
  frete_id INTEGER NOT NULL REFERENCES fretes(id) ON DELETE CASCADE,
  motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  status_candidatura VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_candidatura IN ('pendente', 'aprovado', 'recusado')),
  observacoes_motorista TEXT,
  observacoes_empresa TEXT,
  data_candidatura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_resposta TIMESTAMP,
  respondido_por VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Evitar candidaturas duplicadas
  UNIQUE(frete_id, motorista_id),

  -- Índices para performance
  INDEX idx_candidaturas_frete (frete_id),
  INDEX idx_candidaturas_motorista (motorista_id),
  INDEX idx_candidaturas_empresa (empresa_id),
  INDEX idx_candidaturas_status (status_candidatura)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_candidaturas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_candidaturas_updated_at
    BEFORE UPDATE ON candidaturas_fretes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_candidaturas();

-- Comentários das colunas
COMMENT ON TABLE candidaturas_fretes IS 'Candidaturas de motoristas para fretes terceirizados';
COMMENT ON COLUMN candidaturas_fretes.status_candidatura IS 'Status da candidatura: pendente, aprovado, recusado';
COMMENT ON COLUMN candidaturas_fretes.observacoes_motorista IS 'Observações do motorista ao se candidatar';
COMMENT ON COLUMN candidaturas_fretes.observacoes_empresa IS 'Observações da empresa ao aprovar/recusar';
COMMENT ON COLUMN candidaturas_fretes.respondido_por IS 'Nome do colaborador que aprovou/recusou a candidatura';