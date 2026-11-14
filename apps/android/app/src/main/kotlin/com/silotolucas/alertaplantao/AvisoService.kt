package com.silotolucas.alertaplantao

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Modo Pessoal. Servico em primeiro plano que mantem aberta a conexao (SSE) com o servidor e
 * transforma cada aviso em um alarme (`Alarme`) com o botao "Vi". Se a conexao cair, reconecta sozinho,
 * pedindo de volta o que ainda nao foi visto (Last-Event-ID).
 */
class AvisoService : Service() {

    private lateinit var cfg: Config
    @Volatile private var rodando = false
    @Volatile private var api: Api? = null
    @Volatile private var espera = Espera.INICIAL_MS
    private var thread: Thread? = null

    override fun onCreate() {
        super.onCreate()
        cfg = Config(this)
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CANAL_SERVICO, getString(R.string.canal_servico), NotificationManager.IMPORTANCE_LOW),
        )
        Alarme.prepararCanal(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!cfg.ehPessoal) {
            stopSelf()
            return START_NOT_STICKY
        }
        ServiceCompat.startForeground(
            this, ID_SERVICO, notificacaoDoServico(),
            if (android.os.Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
        )
        if (thread == null) {
            rodando = true
            thread = Thread({ laco() }, "alerta-avisos").also { it.isDaemon = true; it.start() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        rodando = false
        api?.interromper()
        thread?.interrupt()
        thread = null
        cfg.conexao = ""
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun laco() {
        while (rodando) {
            if (!cfg.ehPessoal) { stopSelf(); return }
            val cliente = Api(cfg.servidor, cfg.token).also { api = it }
            try {
                val http = cliente.fluxoDeAvisos(
                    ultimoId = cfg.ultimoAvisoId,
                    aoConectar = { espera = Espera.INICIAL_MS; marcarConexao("conectado") },
                    aoEvento = ::tratar,
                    rodando = { rodando },
                )
                if (Protocolo.destinoDoStatus(http) == Destino.NAO_PAREADO) {
                    cfg.limparPareamento()
                    stopSelf()
                    return
                }
            } catch (e: Exception) {
                if (!rodando) return
                Log.w(TAG, "fluxo de avisos caiu: ${e.message}")
            }
            if (!rodando) return
            marcarConexao("reconectando")
            try { Thread.sleep(espera) } catch (_: InterruptedException) { return }
            espera = Espera.proxima(espera)
        }
    }

    private fun marcarConexao(estado: String) {
        cfg.conexao = estado
        getSystemService(NotificationManager::class.java).notify(ID_SERVICO, notificacaoDoServico())
    }

    private fun tratar(evento: EventoSse) {
        if (evento.tipo != "aviso") return
        val aviso = Protocolo.lerAviso(evento.dados) ?: return
        Alarme.tocar(this, aviso)
        cfg.ultimoAvisoId = aviso.id
        cfg.historico = Historico.adicionar(cfg.historico, AvisoGuardado(System.currentTimeMillis(), aviso.titulo, aviso.texto))
    }

    private fun notificacaoDoServico(): Notification {
        val abrir = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE,
        )
        val texto = if (cfg.conexao == "conectado") R.string.servico_conectado else R.string.servico_reconectando
        return NotificationCompat.Builder(this, CANAL_SERVICO)
            .setSmallIcon(R.drawable.ic_sino)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(texto))
            .setContentIntent(abrir)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    companion object {
        private const val TAG = "AlertaPlantao"
        private const val CANAL_SERVICO = "servico"
        private const val ID_SERVICO = 1

        /** Inicia (ou mantem) a conexao, se este for um aparelho pessoal ja pareado. */
        fun iniciar(context: Context) {
            if (!Config(context).ehPessoal) return
            try {
                ContextCompat.startForegroundService(context, Intent(context, AvisoService::class.java))
            } catch (e: Exception) {
                Log.w(TAG, "nao foi possivel iniciar o servico: ${e.message}")
            }
        }

        fun parar(context: Context) {
            context.stopService(Intent(context, AvisoService::class.java))
        }
    }
}
