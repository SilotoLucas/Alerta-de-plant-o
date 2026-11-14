create table aparelhos (
  id uuid primary key,
  papel text not null check (papel in ('empresa', 'pessoal')),
  nome text not null check (char_length(nome) between 2 and 40),
  token_hash text not null unique,
  plantao_ativo boolean not null default false,
  plantao_alterado_em timestamptz,
  criado_em timestamptz not null,
  check (papel = 'pessoal' or plantao_ativo = false)
);

create index aparelhos_pessoais_em_plantao on aparelhos (id) where plantao_ativo;

create table pareamentos (
  codigo text primary key check (codigo ~ '^[0-9]{6}$'),
  papel text not null check (papel in ('empresa', 'pessoal')),
  criado_em timestamptz not null,
  expira_em timestamptz not null check (expira_em > criado_em)
);
