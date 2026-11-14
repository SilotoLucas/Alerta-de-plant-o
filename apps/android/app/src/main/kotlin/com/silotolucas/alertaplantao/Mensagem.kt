package com.silotolucas.alertaplantao

/** Uma mensagem lida da notificacao do WhatsApp. [hora] vem do proprio WhatsApp (ms). */
data class Mensagem(val remetente: String?, val texto: String, val hora: Long)
