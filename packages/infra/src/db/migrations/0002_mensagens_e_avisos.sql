create table mensagens_vistas (
  aparelho_id uuid not null references aparelhos (id) on delete cascade,
  assinatura text not null,
  registrada_em timestamptz not null,
  primary key (aparelho_id, assinatura)
);

create index mensagens_vistas_por_data on mensagens_vistas (registrada_em);

create table avisos (
  id uuid primary key,
  aparelho_id uuid not null references aparelhos (id) on delete cascade,
  titulo text not null,
  texto text not null,
  criado_em timestamptz not null,
  visto_em timestamptz
);

create index avisos_pendentes on avisos (aparelho_id, id) where visto_em is null;
