package com.silotolucas.alertaplantao

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Entrega ao servidor o que nao pode se perder: um evento do WhatsApp (modo Empresa) ou a
 * confirmacao "Vi" (modo Pessoal). Fica na fila do WorkManager: sem internet, tenta de novo (a cada
 * 30 s, crescendo) ate [MAX_TENTATIVAS]; depois disso o aviso esta velho demais.
 */
class EntregaWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val cfg = Config(applicationContext)
        if (!cfg.pareado) return Result.failure()
        val api = Api(cfg.servidor, cfg.token)
        val ehEvento = inputData.getString(TIPO) == EVENTO
        val resposta = if (ehEvento) api.evento(inputData.getString(CORPO).orEmpty())
        else api.visto(inputData.getString(AVISO_ID).orEmpty())
        val destino = when (resposta) {
            is Resposta.SemRede -> Destino.TENTAR_DE_NOVO
            is Resposta.Recebida -> Protocolo.destinoDoStatus(resposta.http)
        }
        val detalhe = when (resposta) {
            is Resposta.SemRede -> resposta.detalhe
            is Resposta.Recebida -> "HTTP ${resposta.http}"
        }
        if (ehEvento) cfg.registrarEntrega(destino == Destino.OK, if (destino == Destino.OK) "" else detalhe)
        return when (destino) {
            Destino.OK -> Result.success()
            Destino.NAO_PAREADO -> { cfg.limparPareamento(); Result.failure() }
            Destino.DESISTIR -> Result.failure()
            Destino.TENTAR_DE_NOVO -> if (runAttemptCount >= MAX_TENTATIVAS) Result.failure() else Result.retry()
        }
    }

    companion object {
        private const val TIPO = "tipo"
        private const val EVENTO = "evento"
        private const val VISTO = "visto"
        private const val CORPO = "corpo"
        private const val AVISO_ID = "avisoId"
        private const val MAX_TENTATIVAS = 30

        fun agendarEvento(context: Context, conversa: String, mensagens: List<Mensagem>, silencioso: Boolean) =
            agendar(
                context,
                Data.Builder().putString(TIPO, EVENTO)
                    .putString(CORPO, Protocolo.corpoDoEvento(conversa, mensagens, silencioso)).build(),
            )

        fun agendarVisto(context: Context, avisoId: String) =
            agendar(context, Data.Builder().putString(TIPO, VISTO).putString(AVISO_ID, avisoId).build())

        private fun agendar(context: Context, dados: Data) {
            val req = OneTimeWorkRequestBuilder<EntregaWorker>()
                .setInputData(dados)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.LINEAR, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context.applicationContext).enqueue(req)
        }
    }
}
