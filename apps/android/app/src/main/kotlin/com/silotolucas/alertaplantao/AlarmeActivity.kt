package com.silotolucas.alertaplantao

import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

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
        findViewById<TextView>(R.id.alarme_titulo).text = intent.getStringExtra(EXTRA_TITULO) ?: ""
        findViewById<TextView>(R.id.alarme_texto).text = intent.getStringExtra(EXTRA_TEXTO) ?: ""
    }

    companion object {
        const val EXTRA_TITULO = "titulo"
        const val EXTRA_TEXTO = "texto"
    }
}
