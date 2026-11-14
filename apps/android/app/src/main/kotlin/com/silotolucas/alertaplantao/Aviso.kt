package com.silotolucas.alertaplantao

import java.text.Normalizer

/** O que vai para o celular pessoal. */
data class Aviso(val titulo: String, val texto: String)

object Avisos {
    private const val MAX_LINHAS = 3
    private const val MAX_CARACTERES = 200

    /**
     * Monta o aviso de uma conversa. O conteudo e de cliente: por padrao ([incluirTexto] = false)
     * so vai o nome da conversa e a quantidade de mensagens novas.
     */
    fun montar(conversa: String, novas: List<Mensagem>, incluirTexto: Boolean): Aviso {
        if (!incluirTexto) {
            val corpo = if (novas.size == 1) "Nova mensagem" else "${novas.size} novas mensagens"
            return Aviso(conversa, corpo)
        }
        val linhas = novas.take(MAX_LINHAS).map { m ->
            val texto = m.texto.take(MAX_CARACTERES)
            val quem = m.remetente?.takeIf { it.isNotBlank() && it != conversa }
            if (quem != null) "$quem: $texto" else texto
        }.toMutableList()
        if (novas.size > MAX_LINHAS) linhas.add("+ ${novas.size - MAX_LINHAS} mensagens")
        return Aviso(conversa, linhas.joinToString("\n"))
    }
}

enum class Comando { ATIVAR, DESATIVAR, STATUS }

object Comandos {
    /** Interpreta o texto enviado do celular pessoal (ignora acento e caixa). Null = nao entendi. */
    fun interpretar(texto: String): Comando? {
        val t = Normalizer.normalize(texto, Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .trim().lowercase()
        return when (t) {
            "sai", "sair", "ativar", "ativa", "on", "ligar" -> Comando.ATIVAR
            "voltei", "voltar", "desativar", "desativa", "off", "desligar" -> Comando.DESATIVAR
            "status", "?" -> Comando.STATUS
            else -> null
        }
    }
}
