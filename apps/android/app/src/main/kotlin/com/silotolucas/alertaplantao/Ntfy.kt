package com.silotolucas.alertaplantao

import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class Servidor(val url: String, val topico: String, val token: String) {
    val base: String get() = url.trim().trimEnd('/')
    val topicoComando: String get() = "$topico-cmd"
}

enum class Tipo { OK, TENTAR_DE_NOVO, FALHA_DEFINITIVA }

data class Resultado(val tipo: Tipo, val detalhe: String = "")

object Ntfy {
    /** Corpo da publicacao em JSON (aceita acentos sem precisar codificar cabecalhos). */
    fun corpo(topico: String, titulo: String, mensagem: String, prioridade: Int, tags: List<String>): String =
        JSONObject()
            .put("topic", topico)
            .put("title", titulo)
            .put("message", mensagem)
            .put("priority", prioridade)
            .put("tags", JSONArray(tags))
            .toString()

    fun classificar(codigoHttp: Int): Resultado = when {
        codigoHttp in 200..299 -> Resultado(Tipo.OK)
        codigoHttp == 429 || codigoHttp >= 500 -> Resultado(Tipo.TENTAR_DE_NOVO, "HTTP $codigoHttp")
        else -> Resultado(Tipo.FALHA_DEFINITIVA, "HTTP $codigoHttp")   // 400/401/403/404: tentar de novo nao resolve
    }

    fun enviar(s: Servidor, titulo: String, mensagem: String, prioridade: Int, tags: List<String>): Resultado {
        var con: HttpURLConnection? = null
        return try {
            con = (URL(s.base).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                autenticar(s)
            }
            con.outputStream.use { it.write(corpo(s.topico, titulo, mensagem, prioridade, tags).toByteArray(Charsets.UTF_8)) }
            classificar(con.responseCode)
        } catch (e: IOException) {
            Resultado(Tipo.TENTAR_DE_NOVO, e.javaClass.simpleName + (e.message?.let { ": $it" } ?: ""))
        } finally {
            con?.disconnect()
        }
    }
}

fun HttpURLConnection.autenticar(s: Servidor) {
    if (s.token.isNotBlank()) setRequestProperty("Authorization", "Bearer ${s.token.trim()}")
}
