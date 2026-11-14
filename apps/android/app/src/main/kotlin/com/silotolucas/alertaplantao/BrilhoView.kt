package com.silotolucas.alertaplantao

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import kotlin.math.PI
import kotlin.math.sin

/** Brilho verde nas bordas da tela que pulsa devagar (cerca de 2,4 s), como o do alerta do Windows. */
class BrilhoView @JvmOverloads constructor(context: Context, atributos: AttributeSet? = null) :
    View(context, atributos) {

    private val acento = ContextCompat.getColor(context, R.color.acento)
    private val tinta = Paint(Paint.ANTI_ALIAS_FLAG)
    private val profundidade = resources.displayMetrics.density * PROFUNDIDADE_EM_DP
    private var animador: ValueAnimator? = null
    private var intensidade = 0f

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        animador = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = PERIODO_EM_MS
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            val inicio = System.currentTimeMillis()
            addUpdateListener {
                val fase = (System.currentTimeMillis() - inicio) / PERIODO_EM_MS.toFloat() * 2f * PI.toFloat()
                val entrada = minOf(1f, (System.currentTimeMillis() - inicio) / ENTRADA_EM_MS.toFloat())
                intensidade = entrada * (0.62f + 0.38f * sin(fase - PI.toFloat() / 2f))
                invalidate()
            }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animador?.cancel()
        animador = null
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val d = profundidade
        tinta.alpha = (255 * intensidade).toInt().coerceIn(0, 255)
        borda(canvas, 0f, 0f, w, d, 0f, 0f, 0f, d)
        borda(canvas, 0f, h - d, w, h, 0f, h, 0f, h - d)
        borda(canvas, 0f, 0f, d, h, 0f, 0f, d, 0f)
        borda(canvas, w - d, 0f, w, h, w, 0f, w - d, 0f)
    }

    private fun borda(
        canvas: Canvas, esquerda: Float, topo: Float, direita: Float, base: Float,
        x0: Float, y0: Float, x1: Float, y1: Float,
    ) {
        tinta.shader = LinearGradient(x0, y0, x1, y1, CORES.map { comAlfa(it) }.toIntArray(), POSICOES, Shader.TileMode.CLAMP)
        canvas.drawRect(esquerda, topo, direita, base, tinta)
    }

    private fun comAlfa(alfa: Int): Int = (alfa shl 24) or (acento and 0x00FFFFFF)

    private companion object {
        const val PROFUNDIDADE_EM_DP = 56f
        const val PERIODO_EM_MS = 2_400L
        const val ENTRADA_EM_MS = 500L
        val POSICOES = floatArrayOf(0f, 0.25f, 0.5f, 0.75f, 1f)
        val CORES = intArrayOf(210, 89, 26, 3, 0)
    }
}
