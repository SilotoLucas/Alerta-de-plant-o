package com.silotolucas.alertaplantao

import android.app.Notification
import android.os.Build
import android.os.Parcelable
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.os.BundleCompat

/**
 * Le as notificacoes que o proprio WhatsApp gera neste celular (o da empresa) e as encaminha ao
 * servidor ntfy. Nao toca no WhatsApp em si: so le o que ele ja mostra na barra de notificacoes.
 */
class WhatsAppListener : NotificationListenerService() {

    private lateinit var cfg: Config
    private val dedup = Deduplicador()
    private val pacotes = BuildConfig.PACOTES_ALVO.split(',').toSet()

    override fun onCreate() {
        super.onCreate()
        cfg = Config(this)
        dedup.importar(cfg.vistos)
    }

    override fun onListenerConnected() {
        // Primeira vez: o que ja esta na barra e antigo, nao avisa.
        if (!cfg.inicializado) {
            try { activeNotifications?.forEach { processar(it, enviar = false) } } catch (e: Exception) { Log.w(TAG, "init", e) }
            cfg.inicializado = true
        }
        ComandoService.iniciar(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            // Desativado: ainda le (marca como visto) para nao avisar tudo de uma vez ao reativar.
            processar(sbn, enviar = cfg.ativo)
        } catch (e: Exception) {
            Log.w(TAG, "erro ao processar notificacao", e)
        }
    }

    private fun processar(sbn: StatusBarNotification, enviar: Boolean) {
        if (sbn.packageName !in pacotes) return
        val n = sbn.notification
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return   // resumo "N mensagens de M conversas"
        if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return   // "WhatsApp Web conectado" etc.

        val extras = n.extras
        val conversa = (extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE))?.toString()?.trim()
        if (conversa.isNullOrEmpty()) return

        val novas = dedup.novas(conversa, lerMensagens(n))
        if (novas.isEmpty()) return
        cfg.vistos = dedup.exportar()
        if (!enviar) return

        val aviso = Avisos.montar(conversa, novas, cfg.enviarTexto)
        EnviarWorker.agendar(this, aviso.titulo, aviso.texto)
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
