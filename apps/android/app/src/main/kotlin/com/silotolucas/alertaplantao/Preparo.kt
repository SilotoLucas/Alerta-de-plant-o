package com.silotolucas.alertaplantao

/** O que o celular pessoal precisa para o alarme tocar de verdade. Cada item vira uma linha e um botao na tela. */
enum class Pendencia { NOTIFICACOES, NAO_PERTURBE, TELA_CHEIA, BATERIA }

/** Retrato das permissoes do celular pessoal, lido do sistema (`Alarme.situacao`). */
data class Situacao(
    val notificacoes: Boolean,
    val naoPerturbe: Boolean,
    val telaCheia: Boolean,
    val bateria: Boolean,
)

object Preparo {
    /** Avisos de teste nascem com este prefixo: nunca existem no servidor, entao nao ha "Vi" a confirmar. */
    const val PREFIXO_TESTE = "teste-"

    /** Por quanto tempo o alarme insiste sozinho; depois a notificacao some e o aviso fica no servidor. */
    const val TEMPO_MAXIMO_MS = 10 * 60 * 1000L

    fun ehTeste(avisoId: String): Boolean = avisoId.startsWith(PREFIXO_TESTE)

    /** Do mais grave ao menos grave: sem notificacao nada toca; sem tela cheia ainda toca e vibra. */
    fun pendencias(s: Situacao): List<Pendencia> = buildList {
        if (!s.notificacoes) add(Pendencia.NOTIFICACOES)
        if (!s.naoPerturbe) add(Pendencia.NAO_PERTURBE)
        if (!s.bateria) add(Pendencia.BATERIA)
        if (!s.telaCheia) add(Pendencia.TELA_CHEIA)
    }
}
