package com.silotolucas.alertaplantao

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeduplicadorTest {
    private fun m(texto: String, hora: Long, quem: String? = "Maria") = Mensagem(quem, texto, hora)

    @Test fun primeiraVezTudoENovo() {
        val d = Deduplicador()
        assertEquals(2, d.novas("Grupo A", listOf(m("oi", 1), m("alguem ai?", 2))).size)
    }

    @Test fun mesmaNotificacaoReenviadaNaoDuplica() {
        val d = Deduplicador()
        d.novas("Grupo A", listOf(m("oi", 1)))
        assertTrue(d.novas("Grupo A", listOf(m("oi", 1))).isEmpty())
    }

    @Test fun mensagemNovaNaMesmaConversaApareceSozinha() {
        // o WhatsApp reaproveita a notificacao: a lista cresce e so a ultima e nova
        val d = Deduplicador()
        d.novas("Grupo A", listOf(m("oi", 1)))
        val novas = d.novas("Grupo A", listOf(m("oi", 1), m("urgente", 2)))
        assertEquals(listOf("urgente"), novas.map { it.texto })
    }

    @Test fun mesmoTextoEmHorasDiferentesContaDuasVezes() {
        val d = Deduplicador()
        d.novas("Grupo A", listOf(m("ok", 1)))
        assertEquals(1, d.novas("Grupo A", listOf(m("ok", 1), m("ok", 5))).size)
    }

    @Test fun conversasDiferentesSaoIndependentes() {
        val d = Deduplicador()
        d.novas("Grupo A", listOf(m("oi", 1)))
        assertEquals(1, d.novas("Grupo B", listOf(m("oi", 1))).size)
    }

    @Test fun estadoSobreviveAExportarEImportar() {
        val d = Deduplicador()
        d.novas("Grupo A", listOf(m("oi", 1), m("tchau", 2)))
        val outro = Deduplicador()
        outro.importar(d.exportar())
        assertTrue(outro.novas("Grupo A", listOf(m("oi", 1), m("tchau", 2))).isEmpty())
        assertEquals(1, outro.novas("Grupo A", listOf(m("novo", 3))).size)
    }

    @Test fun estadoCorrompidoComecaDoZero() {
        val d = Deduplicador()
        d.importar("{isso nao e json")
        assertEquals(1, d.novas("Grupo A", listOf(m("oi", 1))).size)
    }

    @Test fun limitaMemoriaPorConversaEDeConversas() {
        val d = Deduplicador(maxPorConversa = 3, maxConversas = 2)
        d.novas("A", (1L..10L).map { m("t$it", it) })
        // as mais antigas foram esquecidas: voltam a ser "novas"
        assertEquals(1, d.novas("A", listOf(m("t1", 1))).size)
        d.novas("B", listOf(m("x", 1))); d.novas("C", listOf(m("x", 1)))
        assertEquals(1, d.novas("A", listOf(m("t10", 10))).size)   // conversa A foi expulsa
    }
}

class AvisosTest {
    private val novas = listOf(
        Mensagem("Maria", "o sistema caiu", 1),
        Mensagem("Carlos", "a impressora parou", 2),
    )

    @Test fun semTextoSoMostraQuantidade() {
        assertEquals(Aviso("Grupo A", "2 novas mensagens"), Avisos.montar("Grupo A", novas, false))
        assertEquals("Nova mensagem", Avisos.montar("Grupo A", novas.take(1), false).texto)
    }

    @Test fun comTextoMostraRemetenteETexto() {
        assertEquals("Maria: o sistema caiu\nCarlos: a impressora parou", Avisos.montar("Grupo A", novas, true).texto)
    }

    @Test fun conversaIndividualNaoRepeteONome() {
        val a = Avisos.montar("João", listOf(Mensagem("João", "pode ligar?", 1)), true)
        assertEquals("pode ligar?", a.texto)
    }

    @Test fun mostraNoMaximoTresEResume() {
        val muitas = (1L..5L).map { Mensagem("X", "m$it", it) }
        val linhas = Avisos.montar("G", muitas, true).texto.lines()
        assertEquals(4, linhas.size)
        assertEquals("+ 2 mensagens", linhas.last())
    }

    @Test fun truncaTextoLongo() {
        val a = Avisos.montar("G", listOf(Mensagem(null, "a".repeat(500), 1)), true)
        assertEquals(200, a.texto.length)
    }
}

class ComandosTest {
    @Test fun entendeVariacoes() {
        assertEquals(Comando.ATIVAR, Comandos.interpretar("saí"))
        assertEquals(Comando.ATIVAR, Comandos.interpretar("  SAI \n"))
        assertEquals(Comando.DESATIVAR, Comandos.interpretar("Voltei"))
        assertEquals(Comando.STATUS, Comandos.interpretar("status"))
    }

    @Test fun ignoraOQueNaoEntende() {
        assertNull(Comandos.interpretar("bom dia"))
        assertNull(Comandos.interpretar(""))
    }
}

class NtfyTest {
    @Test fun corpoJsonComAcentos() {
        val j = JSONObject(Ntfy.corpo("plantao", "Grupo Cliente", "Nova mensagem — atenção", 5, listOf("bell")))
        assertEquals("plantao", j.getString("topic"))
        assertEquals("Nova mensagem — atenção", j.getString("message"))
        assertEquals(5, j.getInt("priority"))
        assertEquals("bell", j.getJSONArray("tags").getString(0))
    }

    @Test fun classificaRespostasHttp() {
        assertEquals(Tipo.OK, Ntfy.classificar(200).tipo)
        assertEquals(Tipo.TENTAR_DE_NOVO, Ntfy.classificar(503).tipo)
        assertEquals(Tipo.TENTAR_DE_NOVO, Ntfy.classificar(429).tipo)
        assertEquals(Tipo.FALHA_DEFINITIVA, Ntfy.classificar(401).tipo)
        assertEquals(Tipo.FALHA_DEFINITIVA, Ntfy.classificar(403).tipo)
    }

    @Test fun servidorNormalizaEndereco() {
        val s = Servidor("https://ntfy.exemplo.com/ ", "plantao", "tk")
        assertEquals("https://ntfy.exemplo.com", s.base)
        assertEquals("plantao-cmd", s.topicoComando)
    }
}
