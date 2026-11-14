package com.silotolucas.alertaplantao

import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/** Resposta de uma chamada: o status e o corpo, ou a falha de rede. */
sealed class Resposta {
    data class Recebida(val http: Int, val corpo: String) : Resposta()
    data class SemRede(val detalhe: String) : Resposta()
}

/** Cliente HTTP do servidor (docs/api.md). Bloqueante: chame de uma thread de fundo. */
class Api(private val base: String, private val token: String?) {

    fun parear(codigo: String, nome: String): Resposta =
        chamar("POST", "/pareamentos/concluir", Protocolo.corpoDoPareamento(codigo, nome))

    fun eu(): Resposta = chamar("GET", "/aparelhos/eu")

    fun evento(corpoJson: String): Resposta = chamar("POST", "/eventos", corpoJson)

    fun plantao(comando: String): Resposta = chamar("POST", "/plantao", Protocolo.corpoDoComando(comando))

    fun consultarPlantao(): Resposta = chamar("GET", "/plantao")

    fun visto(avisoId: String): Resposta = chamar("POST", "/avisos/$avisoId/visto")

    private fun chamar(metodo: String, caminho: String, corpo: String? = null): Resposta {
        var con: HttpURLConnection? = null
        return try {
            con = abrir(metodo, caminho).apply {
                connectTimeout = 10_000
                readTimeout = 15_000
                if (corpo != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
            }
            if (corpo != null) con.outputStream.use { it.write(corpo.toByteArray(Charsets.UTF_8)) }
            val http = con.responseCode
            val fluxo = if (http >= 400) con.errorStream else con.inputStream
            val texto = fluxo?.use { it.readBytes().toString(Charsets.UTF_8) }.orEmpty()
            Resposta.Recebida(http, texto)
        } catch (e: IOException) {
            Resposta.SemRede(e.javaClass.simpleName + (e.message?.let { ": $it" } ?: ""))
        } finally {
            con?.disconnect()
        }
    }

    /**
     * Abre o fluxo de avisos (SSE) e entrega cada evento a [aoEvento] ate a conexao cair.
     * Devolve o status HTTP se o servidor recusou; lanca [IOException] se a conexao caiu.
     */
    fun fluxoDeAvisos(ultimoId: String, aoConectar: () -> Unit, aoEvento: (EventoSse) -> Unit, rodando: () -> Boolean): Int {
        val con = abrir("GET", "/avisos/fluxo").apply {
            connectTimeout = 10_000
            readTimeout = 70_000   // o servidor manda um batimento a cada 20 s
            setRequestProperty("Accept", "text/event-stream")
            if (ultimoId.isNotEmpty()) setRequestProperty("Last-Event-ID", ultimoId)
        }
        conexaoAtual = con
        try {
            val http = con.responseCode
            if (http != 200) return http
            aoConectar()
            val parser = ParserSse(aoEvento)
            BufferedReader(InputStreamReader(con.inputStream, Charsets.UTF_8)).use { leitor ->
                while (rodando()) parser.linha(leitor.readLine() ?: throw IOException("conexao encerrada"))
            }
            return 200
        } finally {
            con.disconnect()
            conexaoAtual = null
        }
    }

    @Volatile private var conexaoAtual: HttpURLConnection? = null

    fun interromper() {
        try { conexaoAtual?.disconnect() } catch (_: Exception) {}
    }

    private fun abrir(metodo: String, caminho: String): HttpURLConnection =
        (URL(base + caminho).openConnection() as HttpURLConnection).apply {
            requestMethod = metodo
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer ${token.trim()}")
        }
}
