package com.silotolucas.alertaplantao

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Religa a conexao de avisos depois de reiniciar o celular ou de atualizar o app. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            AvisoService.iniciar(context)
        }
    }
}
