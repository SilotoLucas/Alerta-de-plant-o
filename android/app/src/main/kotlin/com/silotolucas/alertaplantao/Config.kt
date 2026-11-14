package com.silotolucas.alertaplantao

import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.service.quicksettings.TileService

/** Configuracao e estado do app (SharedPreferences privado do app). */
class Config(context: Context) {
    private val app = context.applicationContext
    val prefs: SharedPreferences = app.getSharedPreferences("config", Context.MODE_PRIVATE)

    var url: String
        get() = prefs.getString("url", "") ?: ""
        set(v) = prefs.edit().putString("url", v).apply()

    var topico: String
        get() = prefs.getString("topico", "") ?: ""
        set(v) = prefs.edit().putString("topico", v).apply()

    var token: String
        get() = prefs.getString("token", "") ?: ""
        set(v) = prefs.edit().putString("token", v).apply()

    /** Liga/desliga os alertas. Quando desligado o app continua lendo (para nao reavisar depois), mas nao envia. */
    var ativo: Boolean
        get() = prefs.getBoolean("ativo", true)
        set(v) {
            prefs.edit().putBoolean("ativo", v).apply()
            try {
                TileService.requestListeningState(app, ComponentName(app, AlertaTile::class.java))
            } catch (_: Exception) {
            }
        }

    /** Privacidade: o texto das mensagens e de cliente. Padrao: so o nome da conversa. */
    var enviarTexto: Boolean
        get() = prefs.getBoolean("enviarTexto", false)
        set(v) = prefs.edit().putBoolean("enviarTexto", v).apply()

    /** Ja registrou o que estava na barra de notificacoes na primeira conexao? */
    var inicializado: Boolean
        get() = prefs.getBoolean("inicializado", false)
        set(v) = prefs.edit().putBoolean("inicializado", v).apply()

    var vistos: String
        get() = prefs.getString("vistos", "") ?: ""
        set(v) = prefs.edit().putString("vistos", v).apply()

    var ultimoComandoId: String
        get() = prefs.getString("ultimoComandoId", "") ?: ""
        set(v) = prefs.edit().putString("ultimoComandoId", v).apply()

    var entregaHora: Long
        get() = prefs.getLong("entregaHora", 0L)
        private set(v) = prefs.edit().putLong("entregaHora", v).apply()

    var entregaOk: Boolean
        get() = prefs.getBoolean("entregaOk", false)
        private set(v) = prefs.edit().putBoolean("entregaOk", v).apply()

    var entregaDetalhe: String
        get() = prefs.getString("entregaDetalhe", "") ?: ""
        private set(v) = prefs.edit().putString("entregaDetalhe", v).apply()

    fun registrarEntrega(r: Resultado) {
        entregaOk = r.tipo == Tipo.OK
        entregaDetalhe = r.detalhe
        entregaHora = System.currentTimeMillis()
    }

    /** Null enquanto faltar endereco ou topico. */
    fun servidor(): Servidor? {
        val u = url.trim(); val t = topico.trim()
        return if (u.isEmpty() || t.isEmpty()) null else Servidor(u, t, token)
    }
}
