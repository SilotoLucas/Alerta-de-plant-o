package com.silotolucas.alertaplantao

import org.json.JSONArray
import org.json.JSONObject

/** Uma mensagem lida da notificacao do WhatsApp. [hora] vem do proprio WhatsApp (ms). */
data class Mensagem(val remetente: String?, val texto: String, val hora: Long) {
    val assinatura: String get() = "$hora|${remetente.orEmpty()}|$texto"
}

/**
 * Descobre quais mensagens ainda nao foram avisadas.
 *
 * O WhatsApp reaproveita a mesma notificacao quando chega outra mensagem na mesma conversa, entao
 * "novo" nao pode ser decidido pelo Id da notificacao: cada mensagem tem uma assinatura
 * (hora + remetente + texto) guardada por conversa. O estado e exportavel para sobreviver a
 * reinicios do servico sem reenviar o que ja foi avisado.
 */
class Deduplicador(
    private val maxPorConversa: Int = 100,
    private val maxConversas: Int = 200,
) {
    private val vistos = object : LinkedHashMap<String, LinkedHashSet<String>>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, LinkedHashSet<String>>?): Boolean =
            size > maxConversas
    }

    /** Devolve so as mensagens ainda nao vistas (e passa a considera-las vistas). */
    @Synchronized
    fun novas(conversa: String, mensagens: List<Mensagem>): List<Mensagem> {
        val conhecidas = vistos.getOrPut(conversa) { LinkedHashSet() }
        val resultado = mensagens.filter { conhecidas.add(it.assinatura) }
        while (conhecidas.size > maxPorConversa) {
            val it = conhecidas.iterator(); it.next(); it.remove()
        }
        return resultado
    }

    @Synchronized
    fun exportar(): String {
        val raiz = JSONObject()
        for ((conversa, assinaturas) in vistos) raiz.put(conversa, JSONArray(assinaturas.toList()))
        return raiz.toString()
    }

    @Synchronized
    fun importar(json: String) {
        vistos.clear()
        if (json.isBlank()) return
        try {
            val raiz = JSONObject(json)
            for (conversa in raiz.keys()) {
                val arr = raiz.getJSONArray(conversa)
                val set = LinkedHashSet<String>()
                for (i in 0 until arr.length()) set.add(arr.getString(i))
                vistos[conversa] = set
            }
        } catch (_: Exception) {
            vistos.clear()   // estado corrompido: comeca do zero
        }
    }
}
