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
 * Entrega um aviso ao servidor ntfy. Fica na fila do WorkManager: sem internet, tenta de novo
 * (a cada 30 s, crescendo) ate [MAX_TENTATIVAS]; depois disso o aviso esta velho demais.
 */
class EnviarWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val cfg = Config(applicationContext)
        val servidor = cfg.servidor() ?: return Result.failure()
        val tags = (inputData.getStringArray(TAGS) ?: emptyArray()).toList()
        val r = Ntfy.enviar(
            servidor,
            inputData.getString(TITULO).orEmpty(),
            inputData.getString(TEXTO).orEmpty(),
            inputData.getInt(PRIORIDADE, 5),
            tags,
        )
        return when (r.tipo) {
            Tipo.OK -> { cfg.registrarEntrega(r); Result.success() }
            Tipo.FALHA_DEFINITIVA -> { cfg.registrarEntrega(r); Result.failure() }
            Tipo.TENTAR_DE_NOVO ->
                if (runAttemptCount >= MAX_TENTATIVAS) { cfg.registrarEntrega(r); Result.failure() }
                else { cfg.registrarEntrega(r); Result.retry() }
        }
    }

    companion object {
        private const val TITULO = "titulo"
        private const val TEXTO = "texto"
        private const val PRIORIDADE = "prioridade"
        private const val TAGS = "tags"
        private const val MAX_TENTATIVAS = 30

        /** prioridade ntfy: 5 = urgente (toca mesmo no silencioso), 3 = normal. */
        fun agendar(
            context: Context,
            titulo: String,
            texto: String,
            prioridade: Int = 5,
            tags: List<String> = listOf("bell"),
        ) {
            val dados = Data.Builder()
                .putString(TITULO, titulo)
                .putString(TEXTO, texto)
                .putInt(PRIORIDADE, prioridade)
                .putStringArray(TAGS, tags.toTypedArray())
                .build()
            val req = OneTimeWorkRequestBuilder<EnviarWorker>()
                .setInputData(dados)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.LINEAR, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context.applicationContext).enqueue(req)
        }
    }
}
