package com.silotolucas.alertaplantao

import org.json.JSONArray
import org.json.JSONObject

/** Um aviso ja recebido, guardado so para a tela mostrar o que chegou (o servidor continua sendo a fonte). */
data class AvisoGuardado(val hora: Long, val titulo: String, val texto: String)

/** Os ultimos avisos recebidos, do mais novo para o mais antigo, em JSON no armazenamento privado do app. */
object Historico {
    const val MAXIMO = 5

    fun adicionar(json: String, novo: AvisoGuardado): String {
        val todos = listOf(novo) + ler(json)
        val array = JSONArray()
        for (aviso in todos.take(MAXIMO)) {
            array.put(
                JSONObject().put("hora", aviso.hora).put("titulo", aviso.titulo).put("texto", aviso.texto),
            )
        }
        return array.toString()
    }

    fun ler(json: String): List<AvisoGuardado> = try {
        val array = JSONArray(json)
        (0 until array.length()).map {
            val o = array.getJSONObject(it)
            AvisoGuardado(o.getLong("hora"), o.getString("titulo"), o.getString("texto"))
        }
    } catch (_: Exception) {
        emptyList()
    }

    /** Resumo de uma linha para a notificacao recolhida: as linhas do texto viram "A · B · C". */
    fun emUmaLinha(texto: String): String = texto.lines().filter { it.isNotBlank() }.joinToString(" · ")
}
