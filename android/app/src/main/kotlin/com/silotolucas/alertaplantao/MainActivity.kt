package com.silotolucas.alertaplantao

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.textfield.TextInputEditText
import java.text.DateFormat
import java.util.Date

class MainActivity : AppCompatActivity() {

    private lateinit var cfg: Config
    private lateinit var campoUrl: TextInputEditText
    private lateinit var campoTopico: TextInputEditText
    private lateinit var campoToken: TextInputEditText
    private lateinit var chaveAtivo: SwitchCompat
    private lateinit var chaveTexto: SwitchCompat
    private lateinit var status: TextView
    private val handler = Handler(Looper.getMainLooper())

    private val pedirNotificacoes = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        ComandoService.iniciar(this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        cfg = Config(this)

        // Android 15 desenha de borda a borda: afasta o conteudo da barra de status e de navegacao.
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.raiz)) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            insets
        }

        campoUrl = findViewById(R.id.campo_url)
        campoTopico = findViewById(R.id.campo_topico)
        campoToken = findViewById(R.id.campo_token)
        chaveAtivo = findViewById(R.id.chave_ativo)
        chaveTexto = findViewById(R.id.chave_texto)
        status = findViewById(R.id.status)

        campoUrl.setText(cfg.url)
        campoTopico.setText(cfg.topico)
        campoToken.setText(cfg.token)
        chaveTexto.isChecked = cfg.enviarTexto

        chaveAtivo.setOnCheckedChangeListener { _, marcado -> cfg.ativo = marcado }
        chaveTexto.setOnCheckedChangeListener { _, marcado -> cfg.enviarTexto = marcado }

        findViewById<Button>(R.id.botao_salvar).setOnClickListener {
            salvar()
            Toast.makeText(this, R.string.salvo, Toast.LENGTH_SHORT).show()
            ComandoService.iniciar(this)
            atualizarStatus()
        }
        findViewById<Button>(R.id.botao_teste).setOnClickListener { enviarTeste() }
        findViewById<Button>(R.id.botao_acesso).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
        findViewById<Button>(R.id.botao_bateria).setOnClickListener { pedirSemRestricaoDeBateria() }

        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            pedirNotificacoes.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onResume() {
        super.onResume()
        // o estado pode ter mudado por fora (botao rapido, comando remoto)
        chaveAtivo.setOnCheckedChangeListener(null)
        chaveAtivo.isChecked = cfg.ativo
        chaveAtivo.setOnCheckedChangeListener { _, marcado -> cfg.ativo = marcado }
        ComandoService.iniciar(this)
        atualizarStatus()
    }

    override fun onPause() {
        salvar()
        super.onPause()
    }

    private fun salvar() {
        var url = campoUrl.text.toString().trim()
        if (url.isNotEmpty() && !url.startsWith("http://") && !url.startsWith("https://")) url = "https://$url"
        cfg.url = url
        cfg.topico = campoTopico.text.toString().trim().trim('/')
        cfg.token = campoToken.text.toString().trim()
    }

    private fun enviarTeste() {
        salvar()
        if (cfg.servidor() == null) {
            Toast.makeText(this, R.string.falta_servidor, Toast.LENGTH_LONG).show()
            return
        }
        EnviarWorker.agendar(
            this, getString(R.string.teste_titulo), getString(R.string.teste_texto), prioridade = 4, tags = listOf("white_check_mark"),
        )
        Toast.makeText(this, R.string.teste_enviado, Toast.LENGTH_SHORT).show()
        handler.postDelayed({ atualizarStatus() }, 3000)
        handler.postDelayed({ atualizarStatus() }, 10000)
    }

    private fun pedirSemRestricaoDeBateria() {
        val pm = getSystemService(PowerManager::class.java)
        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            Toast.makeText(this, R.string.bateria_ja_livre, Toast.LENGTH_SHORT).show()
            return
        }
        try {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun atualizarStatus() {
        val acesso = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
        val bateriaLivre = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
        val entrega = when {
            cfg.entregaHora == 0L -> getString(R.string.entrega_nenhuma)
            else -> {
                val hora = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(cfg.entregaHora))
                if (cfg.entregaOk) getString(R.string.entrega_ok, hora)
                else getString(R.string.entrega_falha, cfg.entregaDetalhe, hora)
            }
        }
        status.text = listOf(
            getString(if (acesso) R.string.status_acesso_ok else R.string.status_acesso_falta),
            getString(if (cfg.servidor() != null) R.string.status_servidor_ok else R.string.status_servidor_falta),
            getString(if (bateriaLivre) R.string.status_bateria_ok else R.string.status_bateria_falta),
            entrega,
        ).joinToString("\n")
    }
}
