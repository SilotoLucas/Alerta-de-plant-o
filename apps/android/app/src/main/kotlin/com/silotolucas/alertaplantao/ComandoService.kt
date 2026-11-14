package com.silotolucas.alertaplantao

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Servico em primeiro plano que escuta o topico de comandos (`<topico>-cmd`) do ntfy.
 * Do celular pessoal, mande "sai" / "voltei" / "status" nesse topico para ligar/desligar
 * os alertas sem mexer no celular da empresa.
 */
class ComandoService : Service() {

    private lateinit var cfg: Config
    @Volatile private var rodando = false
    @Volatile private var conexao: HttpURLConnection? = null
    private var thread: Thread? = null
    private val ouvinte = SharedPreferences.OnSharedPreferenceChangeListener { _, chave ->
        if (chave == "ativo") atualizarNotificacao()
    }

    override fun onCreate() {
        super.onCreate()
        cfg = Config(this)
        criarCanal()
        cfg.prefs.registerOnSharedPreferenceChangeListener(ouvinte)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ServiceCompat.startForeground(
            this, ID_NOTIFICACAO, notificacao(),
            if (android.os.Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
        )
        if (thread == null) {
            rodando = true
            thread = Thread({ laco() }, "alerta-comandos").also { it.isDaemon = true; it.start() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        rodando = false
        cfg.prefs.unregisterOnSharedPreferenceChangeListener(ouvinte)
        try { conexao?.disconnect() } catch (_: Exception) {}
        thread?.interrupt()
        thread = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun laco() {
        var espera = 5_000L
        while (rodando) {
            val servidor = cfg.servidor()
            if (servidor == null) { dormir(15_000); continue }
            try {
                escutar(servidor)
                espera = 5_000L
            } catch (e: Exception) {
                if (!rodando) return
                Log.w(TAG, "escuta de comandos caiu: ${e.message}")
                dormir(espera)
                espera = minOf(espera * 2, 60_000L)
            }
        }
    }

    private fun dormir(ms: Long) {
        try { Thread.sleep(ms) } catch (_: InterruptedException) {}
    }

    /** Mantem uma conexao aberta (stream JSON) ate cair. */
    private fun escutar(s: Servidor) {
        val desde = cfg.ultimoComandoId.ifEmpty { (System.currentTimeMillis() / 1000).toString() }
        val con = URL("${s.base}/${s.topicoComando}/json?since=$desde").openConnection() as HttpURLConnection
        conexao = con
        try {
            con.connectTimeout = 10_000
            con.readTimeout = 120_000   // o ntfy manda um sinal de vida a cada ~45 s
            con.autenticar(s)
            if (con.responseCode != 200) throw IOException("HTTP ${con.responseCode}")
            BufferedReader(InputStreamReader(con.inputStream, Charsets.UTF_8)).use { leitor ->
                while (rodando) {
                    val linha = leitor.readLine() ?: throw IOException("conexao encerrada")
                    if (linha.isBlank()) continue
                    val msg = try { JSONObject(linha) } catch (_: Exception) { continue }
                    if (msg.optString("event") != "message") continue
                    msg.optString("id").takeIf { it.isNotEmpty() }?.let { cfg.ultimoComandoId = it }
                    Comandos.interpretar(msg.optString("message"))?.let { aplicar(it) }
                }
            }
        } finally {
            con.disconnect()
            conexao = null
        }
    }

    private fun aplicar(comando: Comando) {
        when (comando) {
            Comando.ATIVAR -> cfg.ativo = true
            Comando.DESATIVAR -> cfg.ativo = false
            Comando.STATUS -> {}
        }
        Log.i(TAG, "comando remoto: $comando")
        EnviarWorker.agendar(this, "Alerta de Plantão", resumo(), prioridade = 3, tags = listOf("white_check_mark"))
    }

    private fun resumo(): String {
        val estado = if (cfg.ativo) "ATIVADOS" else "DESATIVADOS"
        val acesso = if (androidx.core.app.NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName))
            "leitura das notificações OK" else "SEM acesso às notificações"
        return "Alertas $estado ($acesso)"
    }

    private fun criarCanal() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CANAL, getString(R.string.canal_servico), NotificationManager.IMPORTANCE_LOW)
        )
    }

    private fun notificacao(): Notification {
        val abrir = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_sino)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(if (cfg.ativo) R.string.servico_ativo else R.string.servico_desativado))
            .setContentIntent(abrir)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun atualizarNotificacao() {
        getSystemService(NotificationManager::class.java).notify(ID_NOTIFICACAO, notificacao())
    }

    companion object {
        private const val TAG = "AlertaPlantao"
        private const val CANAL = "servico"
        private const val ID_NOTIFICACAO = 1

        /** Inicia (ou mantem) a escuta de comandos, se ja houver servidor configurado. */
        fun iniciar(context: Context) {
            if (Config(context).servidor() == null) return
            try {
                ContextCompat.startForegroundService(context, Intent(context, ComandoService::class.java))
            } catch (e: Exception) {
                Log.w(TAG, "nao foi possivel iniciar o servico: ${e.message}")
            }
        }
    }
}
