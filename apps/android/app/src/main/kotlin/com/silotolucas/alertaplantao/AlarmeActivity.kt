package com.silotolucas.alertaplantao

import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.text.DateFormat
import java.util.Date

/** Tela cheia do alarme: aparece por cima do bloqueio, acende a tela e tem um unico botao grande, "Vi". */
class AlarmeActivity : AppCompatActivity() {

    private var avisoId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            getSystemService(KeyguardManager::class.java).requestDismissKeyguard(this, null)
        }
        setContentView(R.layout.activity_alarme)
        val raiz = findViewById<LinearLayout>(R.id.alarme_raiz)
        val (e, t, d, b) = listOf(raiz.paddingLeft, raiz.paddingTop, raiz.paddingRight, raiz.paddingBottom)
        ViewCompat.setOnApplyWindowInsetsListener(raiz) { v, insets ->
            val barras = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(e + barras.left, t + barras.top, d + barras.right, b + barras.bottom)
            insets
        }
        mostrar(intent)
        findViewById<Button>(R.id.botao_vi).setOnClickListener {
            Acoes.visto(this, avisoId, avisoId.hashCode())
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        mostrar(intent)
    }

    private fun mostrar(intent: Intent) {
        avisoId = intent.getStringExtra(VistoReceiver.EXTRA_AVISO_ID) ?: ""
        val titulo = intent.getStringExtra(EXTRA_TITULO) ?: ""
        val texto = intent.getStringExtra(EXTRA_TEXTO) ?: ""
        val hora = intent.getLongExtra(EXTRA_HORA, System.currentTimeMillis())
        findViewById<TextView>(R.id.alarme_cabecalho).text = getString(
            R.string.rotulo_cabecalho, DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(hora)),
        )
        findViewById<AvatarView>(R.id.alarme_avatar).definir(titulo)
        findViewById<TextView>(R.id.alarme_titulo).text = titulo
        val lista = findViewById<LinearLayout>(R.id.alarme_mensagens)
        lista.removeAllViews()
        val inflater = LayoutInflater.from(this)
        for (linha in LinhasDoAviso.ler(texto)) {
            val balao = inflater.inflate(R.layout.item_balao, lista, false)
            val remetente = balao.findViewById<TextView>(R.id.balao_remetente)
            val corpo = balao.findViewById<TextView>(R.id.balao_texto)
            when (linha) {
                is LinhaDoAviso.Fala -> {
                    if (linha.remetente == null) {
                        remetente.visibility = android.view.View.GONE
                    } else {
                        remetente.text = linha.remetente
                        remetente.setTextColor(Avatar.cor(linha.remetente))
                    }
                    corpo.text = linha.texto
                }
                is LinhaDoAviso.Resto -> {
                    remetente.visibility = android.view.View.GONE
                    corpo.text = getString(R.string.mais_mensagens, linha.quantas)
                    corpo.setTextColor(getColor(R.color.texto_suave))
                }
            }
            lista.addView(balao)
        }
    }

    companion object {
        const val EXTRA_TITULO = "titulo"
        const val EXTRA_TEXTO = "texto"
        const val EXTRA_HORA = "hora"
    }
}
