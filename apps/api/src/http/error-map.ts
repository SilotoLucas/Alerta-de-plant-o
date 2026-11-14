import type { ErroDeAparelhos, ErroDePlantao } from '@plantao/domain'

export type CodigoDeErro = ErroDeAparelhos | ErroDePlantao | 'admin-invalido'

type Traducao = { readonly status: number; readonly mensagem: string }

export const MAPA_DE_ERROS: Readonly<Record<CodigoDeErro, Traducao>> = {
  'papel-invalido': { status: 422, mensagem: 'Papel inválido. Use empresa ou pessoal.' },
  'nome-invalido': { status: 422, mensagem: 'Informe um nome entre 2 e 40 caracteres.' },
  'codigo-invalido': {
    status: 422,
    mensagem: 'Código inválido ou vencido. Peça um código novo.',
  },
  'codigo-indisponivel': {
    status: 503,
    mensagem: 'Não foi possível gerar um código agora. Tente de novo.',
  },
  'aparelho-invalido': {
    status: 401,
    mensagem: 'Este aparelho não está pareado. Pareie de novo com um código.',
  },
  'aparelho-nao-encontrado': { status: 404, mensagem: 'Aparelho não encontrado.' },
  'evento-invalido': { status: 422, mensagem: 'Evento inválido.' },
  'comando-invalido': {
    status: 422,
    mensagem: 'Comando inválido. Use sai, voltei ou status.',
  },
  'aviso-nao-encontrado': { status: 404, mensagem: 'Aviso não encontrado.' },
  'papel-incorreto': { status: 404, mensagem: 'Não disponível para este aparelho.' },
  'admin-invalido': { status: 401, mensagem: 'Senha de administrador ausente ou incorreta.' },
}

export const corpoDeErro = (codigo: CodigoDeErro) => ({
  erro: { codigo, mensagem: MAPA_DE_ERROS[codigo].mensagem },
})

export const ROTA_INEXISTENTE = {
  erro: { codigo: 'rota-inexistente', mensagem: 'Rota inexistente.' },
}
