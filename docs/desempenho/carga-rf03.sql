-- Teste de volume da consulta do RF03 ("coletas do motorista no dia").
-- Pré-requisito: schema criado no banco sigcf_test (rode `npm run test:e2e` no backend).
-- Execução: docker exec -i sigcf-mysql mysql -usigcf -psigcf < docs/desempenho/carga-rf03.sql

USE sigcf_test;
SET SESSION cte_max_recursion_depth = 300000;

INSERT INTO usuario (nome, email, senha_hash, perfil)
VALUES ('Gestor carga', 'gestor@carga.local', 'x', 'GESTOR');
SET @gestor = LAST_INSERT_ID();

INSERT INTO cliente (nome, endereco) VALUES ('Cliente carga', 'Endereço de carga');
SET @cliente = LAST_INSERT_ID();

INSERT INTO veiculo (placa, modelo, capacidade_kg) VALUES ('ZZZ9Z99', 'Veículo carga', 5000);
SET @veiculo = LAST_INSERT_ID();

INSERT INTO usuario (nome, email, senha_hash, perfil, telefone)
WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 50)
SELECT CONCAT('Motorista carga ', n), CONCAT('carga', n, '@carga.local'), 'x', 'MOTORISTA', '47900000000' FROM s;
SET @m0 = (SELECT MIN(id) FROM usuario WHERE email LIKE 'carga%@carga.local');

-- 200 mil ordens: 50 motoristas x 365 dias, ~11 coletas por motorista por dia
INSERT INTO ordem_coleta (cliente_id, veiculo_id, motorista_id, criado_por_id, endereco_coleta, data_coleta, status)
WITH RECURSIVE s(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM s WHERE n < 199999)
SELECT @cliente, @veiculo, @m0 + (n % 50), @gestor, 'Endereço de carga',
       CURDATE() - INTERVAL ((n DIV 50) % 365) DAY,
       ELT(1 + (n % 5), 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA')
FROM s;

ANALYZE TABLE ordem_coleta;
SET @alvo = @m0 + 7;

SELECT COUNT(*) AS total_ordens,
       SUM(motorista_id = @alvo AND data_coleta = CURDATE()) AS coletas_do_motorista_hoje
FROM ordem_coleta;

SELECT 'COM indice (motorista_id, data_coleta)' AS cenario;
EXPLAIN ANALYZE
SELECT o.*, c.nome, v.placa
FROM ordem_coleta o
JOIN cliente c ON c.id = o.cliente_id
JOIN veiculo v ON v.id = o.veiculo_id
WHERE o.motorista_id = @alvo AND o.data_coleta = CURDATE();

SELECT 'SEM indice (IGNORE INDEX)' AS cenario;
EXPLAIN ANALYZE
SELECT o.*, c.nome, v.placa
FROM ordem_coleta o IGNORE INDEX (idx_ordem_motorista_data)
JOIN cliente c ON c.id = o.cliente_id
JOIN veiculo v ON v.id = o.veiculo_id
WHERE o.motorista_id = @alvo AND o.data_coleta = CURDATE();
