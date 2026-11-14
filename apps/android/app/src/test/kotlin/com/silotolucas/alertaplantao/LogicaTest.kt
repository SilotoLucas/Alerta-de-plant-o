package com.silotolucas.alertaplantao

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtocoloTest {

    @Test
    fun `corpo do evento leva conversa e mensagens no formato da API`() {
        val json = JSONObject(
            Protocolo.corpoDoEvento("Grupo Suporte", listOf(Mensagem("Maria", "oi", 1_700_000_000_000)), silencioso = false),
        )
        assertEquals("Grupo Suporte", json.getString("conversa"))
        val m = json.getJSONArray("mensagens").getJSONObject(0)
        assertEquals("Maria", m.getString("remetente"))
        assertEquals("oi", m.getString("texto"))
        assertEquals(1_700_000_000_000, m.getLong("hora"))
        assertTrue("sem a chave quando nao e silencioso", !json.has("silencioso"))
    }

    @Test
    fun `remetente ausente vai como null e o evento silencioso carrega a marca`() {
        val json = JSONObject(Protocolo.corpoDoEvento("Ana", listOf(Mensagem(null, "oi", 5)), silencioso = true))
        assertTrue(json.getJSONArray("mensagens").getJSONObject(0).isNull("remetente"))
        assertTrue(json.getBoolean("silencioso"))
    }

    @Test
    fun `corta o texto e manda so as ultimas mensagens para caber na fila`() {
        val muitas = (1..20).map { Mensagem("A", "x".repeat(500), it.toLong()) }
        val lista = JSONObject(Protocolo.corpoDoEvento("G", muitas, silencioso = false)).getJSONArray("mensagens")
        assertEquals(Protocolo.MAX_MENSAGENS_POR_EVENTO, lista.length())
        assertEquals(13L, lista.getJSONObject(0).getLong("hora"))
        assertEquals(20L, lista.getJSONObject(lista.length() - 1).getLong("hora"))
        assertEquals(Protocolo.MAX_CARACTERES_DO_TEXTO, lista.getJSONObject(0).getString("texto").length)
    }

    @Test
    fun `o pior caso de texto com acentos continua abaixo de 10 KB do WorkManager`() {
        val pior = (1..30).map { Mensagem("é".repeat(100), "ç".repeat(1000), it.toLong()) }
        val bytes = Protocolo.corpoDoEvento("ã".repeat(100), pior, silencioso = true).toByteArray(Charsets.UTF_8).size
        assertTrue("$bytes bytes", bytes < 10_240)
    }

    @Test
    fun `le o aparelho pareado da resposta do servidor`() {
        val corpo = """{"aparelho":{"id":"abc","papel":"pessoal","nome":"Lucas","criadoEm":"2026-11-14T10:00:00.000Z"},"token":"segredo"}"""
        assertEquals(AparelhoPareado("abc", "pessoal", "Lucas", "segredo"), Protocolo.lerAparelhoPareado(corpo))
        assertNull(Protocolo.lerAparelhoPareado("""{"erro":{}}"""))
        assertNull(Protocolo.lerAparelhoPareado("nao e json"))
    }

    @Test
    fun `le o estado do plantao com e sem data`() {
        assertEquals(EstadoDoPlantao(true, "2026-11-14T10:00:00.000Z"), Protocolo.lerPlantao("""{"ativo":true,"alteradoEm":"2026-11-14T10:00:00.000Z"}"""))
        assertEquals(EstadoDoPlantao(false, null), Protocolo.lerPlantao("""{"ativo":false,"alteradoEm":null}"""))
        assertNull(Protocolo.lerPlantao("{}"))
    }

    @Test
    fun `le o aviso e a mensagem de erro`() {
        assertEquals(AvisoRecebido("i", "Grupo", "Nova mensagem"), Protocolo.lerAviso("""{"id":"i","titulo":"Grupo","texto":"Nova mensagem","criadoEm":"x"}"""))
        assertNull(Protocolo.lerAviso("""{"id":"i"}"""))
        assertEquals("Código inválido.", Protocolo.lerMensagemDeErro("""{"erro":{"codigo":"codigo-invalido","mensagem":"Código inválido."}}"""))
        assertNull(Protocolo.lerMensagemDeErro("<html>"))
    }

    @Test
    fun `endereco sem esquema vira https e a barra final some`() {
        assertEquals("https://alerta.exemplo.com", Protocolo.normalizarEndereco(" alerta.exemplo.com/ "))
        assertEquals("http://10.0.2.2:3350", Protocolo.normalizarEndereco("http://10.0.2.2:3350/"))
        assertEquals("", Protocolo.normalizarEndereco("   "))
    }

    @Test
    fun `status http decide entre sucesso, tentar de novo, desistir e pedir novo pareamento`() {
        assertEquals(Destino.OK, Protocolo.destinoDoStatus(200))
        assertEquals(Destino.OK, Protocolo.destinoDoStatus(204))
        assertEquals(Destino.NAO_PAREADO, Protocolo.destinoDoStatus(401))
        assertEquals(Destino.TENTAR_DE_NOVO, Protocolo.destinoDoStatus(429))
        assertEquals(Destino.TENTAR_DE_NOVO, Protocolo.destinoDoStatus(503))
        assertEquals(Destino.DESISTIR, Protocolo.destinoDoStatus(404))
        assertEquals(Destino.DESISTIR, Protocolo.destinoDoStatus(422))
    }
}

class EsperaTest {
    @Test
    fun `dobra a cada falha e para em 30 segundos`() {
        var atual = Espera.INICIAL_MS
        val vistas = mutableListOf(atual)
        repeat(7) { atual = Espera.proxima(atual); vistas.add(atual) }
        assertEquals(listOf(1_000L, 2_000L, 4_000L, 8_000L, 16_000L, 30_000L, 30_000L, 30_000L), vistas)
    }
}

class ParserSseTest {
    private fun ler(texto: String): List<EventoSse> {
        val eventos = mutableListOf<EventoSse>()
        val parser = ParserSse { eventos.add(it) }
        texto.split("\n").dropLast(1).forEach { parser.linha(it) }
        return eventos
    }

    @Test
    fun `entende o evento de aviso do servidor e ignora conectado e batimento`() {
        val eventos = ler(
            ": conectado\n\nid: 01a\nevent: aviso\ndata: {\"id\":\"01a\"}\n\n: \n\n",
        )
        assertEquals(listOf(EventoSse("01a", "aviso", "{\"id\":\"01a\"}")), eventos)
    }

    @Test
    fun `varios eventos seguidos e data em varias linhas`() {
        val eventos = ler("id: 1\nevent: aviso\ndata: a\ndata: b\n\nid: 2\nevent: aviso\ndata: c\n\n")
        assertEquals(listOf(EventoSse("1", "aviso", "a\nb"), EventoSse("2", "aviso", "c")), eventos)
    }

    @Test
    fun `evento sem data nao e entregue e o id nao vaza para o proximo`() {
        val eventos = ler("id: 1\n\nevent: aviso\ndata: x\n\n")
        assertEquals(listOf(EventoSse(null, "aviso", "x")), eventos)
    }

    @Test
    fun `sem event o tipo padrao e message`() {
        assertEquals("message", ler("data: x\n\n").first().tipo)
        assertNotNull(ler("data:x\n\n").first())
    }
}

class PreparoTest {
    private val tudoLiberado = Situacao(notificacoes = true, naoPerturbe = true, telaCheia = true, bateria = true)

    @Test
    fun `com tudo liberado nao ha pendencia`() {
        assertTrue(Preparo.pendencias(tudoLiberado).isEmpty())
    }

    @Test
    fun `pendencias saem do mais grave ao menos grave`() {
        val nada = Situacao(notificacoes = false, naoPerturbe = false, telaCheia = false, bateria = false)
        assertEquals(
            listOf(Pendencia.NOTIFICACOES, Pendencia.NAO_PERTURBE, Pendencia.BATERIA, Pendencia.TELA_CHEIA),
            Preparo.pendencias(nada),
        )
    }

    @Test
    fun `so aparece a pendencia que falta`() {
        assertEquals(listOf(Pendencia.TELA_CHEIA), Preparo.pendencias(tudoLiberado.copy(telaCheia = false)))
    }

    @Test
    fun `aviso de teste nao tem Vi para confirmar ao servidor`() {
        assertTrue(Preparo.ehTeste(Preparo.PREFIXO_TESTE + "1700000000000"))
        assertTrue(!Preparo.ehTeste("01a1da9b-76a7-713f-9265-b5ed2fbd378c"))
    }

    @Test
    fun `o alarme desiste sozinho depois de dez minutos`() {
        assertEquals(600_000L, Preparo.TEMPO_MAXIMO_MS)
    }
}

class HistoricoTest {
    private fun aviso(n: Int) = AvisoGuardado(n.toLong(), "Conversa $n", "texto $n")

    @Test
    fun `o aviso novo entra na frente e o historico guarda so os cinco mais recentes`() {
        var json = ""
        for (n in 1..7) json = Historico.adicionar(json, aviso(n))
        val lidos = Historico.ler(json)
        assertEquals(Historico.MAXIMO, lidos.size)
        assertEquals(listOf(7L, 6L, 5L, 4L, 3L), lidos.map { it.hora })
        assertEquals(AvisoGuardado(7, "Conversa 7", "texto 7"), lidos.first())
    }

    @Test
    fun `texto com quebra de linha e acentos volta igual da leitura`() {
        val original = AvisoGuardado(1, "Grupo Suporte", "Ana: o sistema caiu\nBruno: já vi\n+ 2 mensagens")
        assertEquals(listOf(original), Historico.ler(Historico.adicionar("", original)))
    }

    @Test
    fun `json vazio ou quebrado vira lista vazia, nunca derruba a tela`() {
        assertTrue(Historico.ler("").isEmpty())
        assertTrue(Historico.ler("{quebrado").isEmpty())
    }

    @Test
    fun `a notificacao recolhida junta as linhas do aviso numa so`() {
        assertEquals("Ana: oi · Bruno: tudo bem · + 2 mensagens", Historico.emUmaLinha("Ana: oi\nBruno: tudo bem\n+ 2 mensagens"))
        assertEquals("Nova mensagem", Historico.emUmaLinha("Nova mensagem"))
    }
}
