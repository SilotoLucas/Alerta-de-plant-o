package com.silotolucas.alertaplantao

import android.content.Context

/** Chamadas ao servidor que a tela e o botao rapido compartilham. Bloqueantes: use thread de fundo. */
object Acoes {
    /** "Vi": silencia o alarme e confirma ao servidor (com reenvio se estiver sem rede). Aviso de teste so silencia. */
    fun visto(context: Context, avisoId: String, idNotificacao: Int) {
        Alarme.silenciar(context, idNotificacao)
        if (!Preparo.ehTeste(avisoId)) EntregaWorker.agendarVisto(context, avisoId)
    }

    /**
     * Manda "sai", "voltei" ou "status" e guarda o estado devolvido. Devolve null se deu certo, ou o
     * texto do problema para mostrar ao usuario.
     */
    fun plantao(cfg: Config, comando: String): String? {
        if (!cfg.ehPessoal) return "Aparelho não pareado."
        val resposta = Api(cfg.servidor, cfg.token).plantao(comando)
        return when (resposta) {
            is Resposta.SemRede -> "Sem conexão com o servidor."
            is Resposta.Recebida -> when (Protocolo.destinoDoStatus(resposta.http)) {
                Destino.OK -> {
                    Protocolo.lerPlantao(resposta.corpo)?.let { cfg.plantaoAtivo = it.ativo }
                    null
                }
                Destino.NAO_PAREADO -> { cfg.limparPareamento(); "Este aparelho foi desligado do servidor. Pareie de novo." }
                else -> Protocolo.lerMensagemDeErro(resposta.corpo) ?: "O servidor recusou (HTTP ${resposta.http})."
            }
        }
    }
}
