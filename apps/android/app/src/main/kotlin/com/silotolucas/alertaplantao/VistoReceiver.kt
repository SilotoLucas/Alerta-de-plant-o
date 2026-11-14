package com.silotolucas.alertaplantao

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Botao "Vi" do aviso: some com a notificacao e confirma ao servidor (com reenvio se estiver sem rede). */
class VistoReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val avisoId = intent.getStringExtra(EXTRA_AVISO_ID) ?: return
        context.getSystemService(NotificationManager::class.java)
            .cancel(intent.getIntExtra(EXTRA_NOTIFICACAO, avisoId.hashCode()))
        EntregaWorker.agendarVisto(context, avisoId)
    }

    companion object {
        const val EXTRA_AVISO_ID = "avisoId"
        const val EXTRA_NOTIFICACAO = "notificacao"
    }
}
