package com.silotolucas.alertaplantao

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Botao "Vi" da notificacao do alarme. */
class VistoReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val avisoId = intent.getStringExtra(EXTRA_AVISO_ID) ?: return
        Acoes.visto(context, avisoId, intent.getIntExtra(EXTRA_NOTIFICACAO, avisoId.hashCode()))
    }

    companion object {
        const val EXTRA_AVISO_ID = "avisoId"
        const val EXTRA_NOTIFICACAO = "notificacao"
    }
}
