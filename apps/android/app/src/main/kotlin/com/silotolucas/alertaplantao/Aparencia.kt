package com.silotolucas.alertaplantao

/** Avatar redondo com iniciais, igual ao do alerta do Windows: a cor sai do nome da conversa. */
object Avatar {
    val PALETA = intArrayOf(
        0xFF00A884.toInt(), 0xFF53BDEB.toInt(), 0xFFFF9800.toInt(),
        0xFFAB47BC.toInt(), 0xFFEF5350.toInt(), 0xFF26A69A.toInt(),
    )

    fun cor(titulo: String): Int = PALETA[Math.floorMod(titulo.hashCode(), PALETA.size)]

    fun iniciais(titulo: String): String {
        val letras = titulo.split(' ', '-', '_', '|')
            .filter { it.isNotEmpty() }
            .mapNotNull { palavra -> palavra.firstOrNull { it.isLetterOrDigit() }?.uppercaseChar() }
            .take(2)
        return if (letras.isEmpty()) "?" else letras.joinToString("")
    }
}

/** Uma linha do texto do aviso: "Remetente: fala", so a fala, ou o "+ N mensagens" do final. */
sealed interface LinhaDoAviso {
    data class Fala(val remetente: String?, val texto: String) : LinhaDoAviso
    data class Resto(val quantas: Int) : LinhaDoAviso
}

object LinhasDoAviso {
    private const val MAXIMO_DO_REMETENTE = 30
    private val resto = Regex("^\\+ (\\d+) mensage(?:m|ns)$")

    fun ler(texto: String): List<LinhaDoAviso> = texto.lines().filter { it.isNotBlank() }.map { linha ->
        val sobra = resto.matchEntire(linha.trim())
        if (sobra != null) return@map LinhaDoAviso.Resto(sobra.groupValues[1].toInt())
        val corte = linha.indexOf(": ")
        if (corte in 1..MAXIMO_DO_REMETENTE) {
            LinhaDoAviso.Fala(linha.substring(0, corte), linha.substring(corte + 2))
        } else {
            LinhaDoAviso.Fala(null, linha)
        }
    }
}
