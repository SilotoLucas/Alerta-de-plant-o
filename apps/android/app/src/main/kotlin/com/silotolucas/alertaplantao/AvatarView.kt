package com.silotolucas.alertaplantao

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View

/** Circulo colorido com as iniciais da conversa (o mesmo desenho do Windows). */
class AvatarView @JvmOverloads constructor(context: Context, atributos: AttributeSet? = null) :
    View(context, atributos) {

    private var titulo = ""

    fun definir(novo: String) {
        titulo = novo
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val lado = minOf(width, height)
        desenhar(canvas, titulo, lado.toFloat(), width / 2f, height / 2f)
    }

    companion object {
        private val fundo = Paint(Paint.ANTI_ALIAS_FLAG)
        private val letras = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFFFFFFF.toInt()
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }

        private fun desenhar(canvas: Canvas, titulo: String, lado: Float, cx: Float, cy: Float) {
            fundo.color = Avatar.cor(titulo)
            canvas.drawCircle(cx, cy, lado / 2f, fundo)
            letras.textSize = lado * 0.4f
            val centro = cy - (letras.descent() + letras.ascent()) / 2f
            canvas.drawText(Avatar.iniciais(titulo), cx, centro, letras)
        }

        /** O mesmo avatar como imagem, para o icone grande da notificacao. */
        fun imagem(titulo: String, lado: Int): Bitmap {
            val bitmap = Bitmap.createBitmap(lado, lado, Bitmap.Config.ARGB_8888)
            desenhar(Canvas(bitmap), titulo, lado.toFloat(), lado / 2f, lado / 2f)
            return bitmap
        }
    }
}
