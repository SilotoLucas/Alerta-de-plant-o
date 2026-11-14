package com.silotolucas.alertaplantao

import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.service.quicksettings.TileService

/**
 * O que o app guarda no celular: o pareamento (endereco, token, papel) e alguns caches so para a
 * tela mostrar algo sem esperar a rede. A fonte da verdade (plantao ligado, quem e novo) e o servidor.
 */
class Config(context: Context) {
    private val app = context.applicationContext
    val prefs: SharedPreferences = app.getSharedPreferences("config", Context.MODE_PRIVATE)

    var servidor: String
        get() = prefs.getString("servidor", "") ?: ""
        set(v) = prefs.edit().putString("servidor", v).apply()

    var token: String
        get() = prefs.getString("token", "") ?: ""
        set(v) = prefs.edit().putString("token", v).apply()

    /** "empresa", "pessoal" ou "" (ainda nao pareado). Quem decide e o codigo de pareamento. */
    var papel: String
        get() = prefs.getString("papel", "") ?: ""
        set(v) = prefs.edit().putString("papel", v).apply()

    var nome: String
        get() = prefs.getString("nome", "") ?: ""
        set(v) = prefs.edit().putString("nome", v).apply()

    val pareado: Boolean get() = servidor.isNotEmpty() && token.isNotEmpty() && papel.isNotEmpty()
    val ehEmpresa: Boolean get() = pareado && papel == "empresa"
    val ehPessoal: Boolean get() = pareado && papel == "pessoal"

    fun salvarPareamento(endereco: String, p: AparelhoPareado) {
        prefs.edit()
            .putString("servidor", endereco).putString("token", p.token)
            .putString("papel", p.papel).putString("nome", p.nome)
            .putBoolean("inicializado", false).putString("ultimoAvisoId", "")
            .putBoolean("plantaoAtivo", false).putString("conexao", "").putString("historico", "")
            .apply()
    }

    /** Token recusado pelo servidor (aparelho revogado) ou o usuario saiu: volta a pedir o codigo. */
    fun limparPareamento() {
        prefs.edit().remove("token").remove("papel").remove("nome").putString("conexao", "").apply()
        avisarTile()
    }

    /** Cache do plantao do celular pessoal, para a tela e o botao rapido. */
    var plantaoAtivo: Boolean
        get() = prefs.getBoolean("plantaoAtivo", false)
        set(v) {
            prefs.edit().putBoolean("plantaoAtivo", v).apply()
            avisarTile()
        }

    /** Modo Empresa: ja mandou ao servidor, em silencio, o que estava na barra na primeira conexao? */
    var inicializado: Boolean
        get() = prefs.getBoolean("inicializado", false)
        set(v) = prefs.edit().putBoolean("inicializado", v).apply()

    /** Modo Pessoal: ultimo aviso recebido (vai em Last-Event-ID ao reconectar). */
    var ultimoAvisoId: String
        get() = prefs.getString("ultimoAvisoId", "") ?: ""
        set(v) = prefs.edit().putString("ultimoAvisoId", v).apply()

    /** Modo Pessoal: "conectado", "reconectando" ou "". */
    var conexao: String
        get() = prefs.getString("conexao", "") ?: ""
        set(v) = prefs.edit().putString("conexao", v).apply()

    /** Modo Pessoal: JSON com os ultimos avisos (ver `Historico`). */
    var historico: String
        get() = prefs.getString("historico", "") ?: ""
        set(v) = prefs.edit().putString("historico", v).apply()

    var entregaHora: Long
        get() = prefs.getLong("entregaHora", 0L)
        private set(v) = prefs.edit().putLong("entregaHora", v).apply()

    var entregaOk: Boolean
        get() = prefs.getBoolean("entregaOk", false)
        private set(v) = prefs.edit().putBoolean("entregaOk", v).apply()

    var entregaDetalhe: String
        get() = prefs.getString("entregaDetalhe", "") ?: ""
        private set(v) = prefs.edit().putString("entregaDetalhe", v).apply()

    fun registrarEntrega(ok: Boolean, detalhe: String) {
        entregaOk = ok
        entregaDetalhe = detalhe
        entregaHora = System.currentTimeMillis()
    }

    private fun avisarTile() {
        try {
            TileService.requestListeningState(app, ComponentName(app, AlertaTile::class.java))
        } catch (_: Exception) {
        }
    }
}
