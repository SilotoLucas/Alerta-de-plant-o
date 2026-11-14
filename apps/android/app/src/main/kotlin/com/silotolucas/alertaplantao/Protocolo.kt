package com.silotolucas.alertaplantao

import org.json.JSONArray
import org.json.JSONObject

/** O que o servidor devolve ao parear: o aparelho e o token (que so aparece uma vez). */
data class AparelhoPareado(val id: String, val papel: String, val nome: String, val token: String)

data class EstadoDoPlantao(val ativo: Boolean, val alteradoEm: String?)

data class AvisoRecebido(val id: String, val titulo: String, val texto: String)

/** Um evento do fluxo SSE (`id:`, `event:`, `data:`). */
data class EventoSse(val id: String?, val tipo: String, val dados: String)

/** Como tratar a resposta de uma chamada que vai para a fila de reenvio. */
enum class Destino { OK, TENTAR_DE_NOVO, DESISTIR, NAO_PAREADO }

/**
 * O formato de rede do servidor (docs/api.md). Aqui so se monta e se le JSON: quem decide o que
 * e novo, o que avisar e para quem e o servidor.
 */
object Protocolo {
    const val MAX_MENSAGENS_POR_EVENTO = 8
    const val MAX_CARACTERES_DO_TEXTO = 200

    /** So as ultimas mensagens, com o texto cortado: cabe no limite de 10 KB do WorkManager (WorkManager). */
    fun corpoDoEvento(conversa: String, mensagens: List<Mensagem>, silencioso: Boolean): String {
        val lista = JSONArray()
        for (m in mensagens.takeLast(MAX_MENSAGENS_POR_EVENTO)) {
            lista.put(
                JSONObject()
                    .put("remetente", m.remetente ?: JSONObject.NULL)
                    .put("texto", m.texto.take(MAX_CARACTERES_DO_TEXTO))
                    .put("hora", m.hora),
            )
        }
        val corpo = JSONObject().put("conversa", conversa).put("mensagens", lista)
        if (silencioso) corpo.put("silencioso", true)
        return corpo.toString()
    }

    fun corpoDoPareamento(codigo: String, nome: String): String =
        JSONObject().put("codigo", codigo).put("nome", nome).toString()

    fun corpoDoComando(comando: String): String = JSONObject().put("comando", comando).toString()

    fun lerAparelhoPareado(json: String): AparelhoPareado? = try {
        val raiz = JSONObject(json)
        val aparelho = raiz.getJSONObject("aparelho")
        AparelhoPareado(
            aparelho.getString("id"), aparelho.getString("papel"), aparelho.getString("nome"),
            raiz.getString("token"),
        )
    } catch (_: Exception) {
        null
    }

    fun lerPlantao(json: String): EstadoDoPlantao? = try {
        val raiz = JSONObject(json)
        EstadoDoPlantao(raiz.getBoolean("ativo"), if (raiz.isNull("alteradoEm")) null else raiz.getString("alteradoEm"))
    } catch (_: Exception) {
        null
    }

    fun lerAviso(json: String): AvisoRecebido? = try {
        val raiz = JSONObject(json)
        AvisoRecebido(raiz.getString("id"), raiz.getString("titulo"), raiz.getString("texto"))
    } catch (_: Exception) {
        null
    }

    fun lerMensagemDeErro(json: String): String? = try {
        JSONObject(json).getJSONObject("erro").getString("mensagem")
    } catch (_: Exception) {
        null
    }

    /** Aceita "10.0.2.2:3350", "alerta.exemplo.com/" e "https://…"; sem esquema, assume https. */
    fun normalizarEndereco(texto: String): String {
        val limpo = texto.trim().trimEnd('/')
        if (limpo.isEmpty()) return ""
        return if (limpo.startsWith("http://") || limpo.startsWith("https://")) limpo else "https://$limpo"
    }

    fun destinoDoStatus(http: Int): Destino = when {
        http in 200..299 -> Destino.OK
        http == 401 -> Destino.NAO_PAREADO
        http == 429 || http >= 500 -> Destino.TENTAR_DE_NOVO
        else -> Destino.DESISTIR   // 400/404/422: repetir nao muda a resposta
    }
}

/** Espera entre tentativas de reconexao: dobra a cada falha, de 1 s ate 30 s. */
object Espera {
    const val INICIAL_MS = 1_000L
    const val MAXIMA_MS = 30_000L
    fun proxima(atualMs: Long): Long = minOf(atualMs * 2, MAXIMA_MS)
}

/**
 * Le linhas de um fluxo `text/event-stream` e chama [aoEvento] a cada evento completo. Linhas que
 * comecam com ":" (batimento e "conectado") sao ignoradas.
 */
class ParserSse(private val aoEvento: (EventoSse) -> Unit) {
    private var id: String? = null
    private var tipo = "message"
    private val dados = StringBuilder()
    private var temDados = false

    fun linha(linha: String) {
        if (linha.isEmpty()) {
            if (temDados) aoEvento(EventoSse(id, tipo, dados.toString()))
            id = null; tipo = "message"; dados.setLength(0); temDados = false
            return
        }
        if (linha.startsWith(":")) return
        val separador = linha.indexOf(':')
        val campo = if (separador < 0) linha else linha.substring(0, separador)
        val valor = if (separador < 0) "" else linha.substring(separador + 1).removePrefix(" ")
        when (campo) {
            "id" -> id = valor
            "event" -> tipo = valor
            "data" -> { if (temDados) dados.append('\n'); dados.append(valor); temDados = true }
        }
    }
}
