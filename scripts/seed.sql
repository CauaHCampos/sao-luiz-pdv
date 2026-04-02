-- SCRIPT PARA CRIAR USUÁRIO ADMIN INICIAL
-- Execute no SQL Editor do Supabase Dashboard (https://supabase.com/dashboard/project/nswmqcvrwaphyeowdmyc/sql)

-- 1. Primeiro, crie o usuário na autenticação (substitua a senha!)
-- Você precisará fazer isso via interface ou usar a API de admin

-- Opção alternativa: Inserir diretamente na tabela funcionarios
-- (Depois você associa o user_id manualmente)

INSERT INTO public.funcionarios (
  nome, 
  email, 
  telefone, 
  cpf, 
  cargo, 
  is_admin, 
  ativo,
  user_id
) VALUES (
  'Administrador',
  'admin@saoluiz.com',  -- Mude para seu email
  '(00) 00000-0000',
  '000.000.000-00',
  'admin',
  true,
  true,
  NULL  -- O user_id será preenchido depois do primeiro login
);

-- 2. Criar algumas mesas para teste
INSERT INTO public.mesas (numero, nome, capacidade) VALUES
  (1, 'Mesa 1', 4),
  (2, 'Mesa 2', 4),
  (3, 'Mesa 3', 2),
  (4, 'Mesa 4', 6),
  (5, 'Mesa 5', 4),
  (6, 'Mesa 6', 2);

-- 3. Criar alguns produtos de exemplo
INSERT INTO public.produtos (
  codigo_barras, 
  nome, 
  descricao,
  preco_custo, 
  preco_venda, 
  quantidade_estoque,
  quantidade_minima,
  categoria
) VALUES
  ('7891234567890', 'Coca-Cola 350ml', 'Refrigerante lata', 3.50, 5.00, 50, 10, 'Bebidas')

-- 4. Criar um crediário de exemplo
INSERT INTO public.crediario (
  cliente_nome,
  cliente_telefone,
  valor_total,
  saldo,
  status
) VALUES 
  ('Caua henrique', '(47) 98926-5096', 150.00, 0.00, 'ativo');
