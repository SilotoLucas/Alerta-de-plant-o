package com.silotolucas.alertaplantao

import android.app.Notification
import android.os.Build
import android.os.Parcelable
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.os.BundleCompat

/**
 * Modo Empresa. Le as notificacoes que o proprio WhatsApp gera neste celular e repassa ao
 * servidor, que decide o que e novo e quem avisar. Nao toca no WhatsApp em si: so le o que ele ja
 * mostra na barra de notificacoes.
 */
class WhatsAppListener : NotificationListenerService() {

    private lateinit var cfg: Config
    private val pacotes = BuildConfig.PACOTES_ALVO.split(',').toSet()

    override fun onCreate() {
        super.onCreate()
        cfg = Config(this)
    }

    override fun onListenerConnected() {
        if (!cfg.ehEmpresa || cfg.inicializado) return
        // Primeira vez: o que ja esta na barra e antigo. Vai ao servidor em silencio, so para ele
        // reconhecer essas mensagens quando o WhatsApp as reaparecer junto com uma nova.
        try {
            activeNotifications?.forEach { processar(it, silencioso = true) }
            cfg.inicializado = true
        } catch (e: Exception) {
            Log.w(TAG, "init", e)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!cfg.ehEmpresa) return
        try {
            processar(sbn, silencioso = false)
        } catch (e: Exception) {
            Log.w(TAG, "erro ao processar notificacao", e)
        }
    }

    private fun processar(sbn: StatusBarNotification, silencioso: Boolean) {
        if (sbn.packageName !in pacotes) return
        val n = sbn.notification
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return   // resumo "N mensagens de M conversas"
        if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return   // "WhatsApp Web conectado" etc.

        val extras = n.extras
        val conversa = (extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE))?.toString()?.trim()
        if (conversa.isNullOrEmpty()) return

        val mensagens = lerMensagens(n)
        if (mensagens.isEmpty()) return
        EntregaWorker.agendarEvento(this, conversa, mensagens, silencioso)
    }

    /** Cada mensagem do MessagingStyle; sem ele, usa o texto unico da notificacao. */
    @Suppress("DEPRECATION")
    private fun lerMensagens(n: Notification): List<Mensagem> {
        val extras = n.extras
        val lista = mutableListOf<Mensagem>()
        val arr = BundleCompat.getParcelableArray(extras, Notification.EXTRA_MESSAGES, Parcelable::class.java)
        if (arr != null) {
            for (m in Notification.MessagingStyle.Message.getMessagesFromBundleArray(arr)) {
                val texto = m.text?.toString()?.trim().orEmpty()
                if (texto.isEmpty()) continue
                val quem = if (Build.VERSION.SDK_INT >= 28) m.senderPerson?.name?.toString() else m.sender?.toString()
                lista.add(Mensagem(quem, texto, m.timestamp))
            }
        }
        if (lista.isEmpty()) {
            val texto = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
            if (texto.isNotEmpty()) lista.add(Mensagem(null, texto, n.`when`))
        }
        return lista
    }

    private companion object {
        const val TAG = "AlertaPlantao"
    }
}
