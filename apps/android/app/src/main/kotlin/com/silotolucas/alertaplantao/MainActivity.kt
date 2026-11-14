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
import android.view.View
import android.view.LayoutInflater
import android.widget.Button
import android.widget.LinearLayout
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
import java.util.concurrent.Executors

/** Uma tela, tres estados: pedir o codigo (nao pareado), modo Empresa ou modo Pessoal. */
class MainActivity : AppCompatActivity() {

    private lateinit var cfg: Config
    private lateinit var grupoParear: View
    private lateinit var grupoEmpresa: View
    private lateinit var grupoPessoal: View
    private lateinit var campoCodigo: TextInputEditText
    private lateinit var campoNome: TextInputEditText
    private lateinit var campoServidor: TextInputEditText
    private lateinit var blocoServidor: View
    private lateinit var erroParear: TextView
    private lateinit var botaoParear: Button
    private lateinit var statusEmpresa: TextView
    private lateinit var statusPessoal: TextView
    private lateinit var chavePlantao: SwitchCompat
    private lateinit var statusAlarme: TextView
    private lateinit var listaAvisos: LinearLayout
    private lateinit var botoesDoAlarme: Map<Pendencia, View>
    private val handler = Handler(Looper.getMainLooper())
    private val fundo = Executors.newSingleThreadExecutor()
    private var visivel = false

    private val atualizador = object : Runnable {
        override fun run() {
            if (!visivel) return
            atualizarStatus()
            handler.postDelayed(this, 2_000)
        }
    }

    private val pedirNotificacoes = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        AvisoService.iniciar(this)
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

        grupoParear = findViewById(R.id.grupo_parear)
        grupoEmpresa = findViewById(R.id.grupo_empresa)
        grupoPessoal = findViewById(R.id.grupo_pessoal)
        campoCodigo = findViewById(R.id.campo_codigo)
        campoNome = findViewById(R.id.campo_nome)
        campoServidor = findViewById(R.id.campo_servidor)
        blocoServidor = findViewById(R.id.bloco_servidor)
        erroParear = findViewById(R.id.erro_parear)
        botaoParear = findViewById(R.id.botao_parear)
        statusEmpresa = findViewById(R.id.status_empresa)
        statusPessoal = findViewById(R.id.status_pessoal)
        chavePlantao = findViewById(R.id.chave_plantao)
        statusAlarme = findViewById(R.id.status_alarme)
        listaAvisos = findViewById(R.id.lista_avisos)
        botoesDoAlarme = mapOf(
            Pendencia.NOTIFICACOES to findViewById(R.id.botao_notificacoes),
            Pendencia.NAO_PERTURBE to findViewById(R.id.botao_nao_perturbe),
            Pendencia.TELA_CHEIA to findViewById(R.id.botao_tela_cheia),
            Pendencia.BATERIA to findViewById(R.id.botao_bateria_pessoal),
        )

        campoNome.setText(Build.MODEL)
        campoServidor.setText(cfg.servidor.ifEmpty { BuildConfig.SERVIDOR_PADRAO })
        blocoServidor.visibility = if (BuildConfig.SERVIDOR_PADRAO.isEmpty()) View.VISIBLE else View.GONE
        findViewById<Button>(R.id.botao_avancado).setOnClickListener {
            blocoServidor.visibility = if (blocoServidor.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        botaoParear.setOnClickListener { parear() }
        findViewById<Button>(R.id.botao_acesso).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
        findViewById<Button>(R.id.botao_bateria_empresa).setOnClickListener { pedirSemRestricaoDeBateria() }
        findViewById<Button>(R.id.botao_bateria_pessoal).setOnClickListener { pedirSemRestricaoDeBateria() }
        findViewById<Button>(R.id.botao_teste).setOnClickListener { enviarTeste() }
        findViewById<Button>(R.id.botao_notificacoes).setOnClickListener {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        }
        findViewById<Button>(R.id.botao_nao_perturbe).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
        }
        findViewById<Button>(R.id.botao_tela_cheia).setOnClickListener { abrirTelaCheia() }
        findViewById<Button>(R.id.botao_testar_alarme).setOnClickListener { testarAlarme() }
        findViewById<Button>(R.id.botao_sair_empresa).setOnClickListener { desparear() }
        findViewById<Button>(R.id.botao_sair_pessoal).setOnClickListener { desparear() }

        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            pedirNotificacoes.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onResume() {
        super.onResume()
        visivel = true
        mostrarGrupo()
        if (cfg.ehPessoal) {
            AvisoService.iniciar(this)
            fundo.execute { Acoes.plantao(cfg, "status"); runOnUiThread { mostrarGrupo() } }
        }
        handler.post(atualizador)
    }

    override fun onPause() {
        visivel = false
        handler.removeCallbacks(atualizador)
        super.onPause()
    }

    private fun mostrarGrupo() {
        grupoParear.visibility = if (cfg.pareado) View.GONE else View.VISIBLE
        grupoEmpresa.visibility = if (cfg.ehEmpresa) View.VISIBLE else View.GONE
        grupoPessoal.visibility = if (cfg.ehPessoal) View.VISIBLE else View.GONE
        chavePlantao.setOnCheckedChangeListener(null)
        chavePlantao.isChecked = cfg.plantaoAtivo
        chavePlantao.setOnCheckedChangeListener { _, marcado -> alterarPlantao(marcado) }
        atualizarStatus()
    }

    private fun parear() {
        val codigo = campoCodigo.text.toString().trim()
        val nome = campoNome.text.toString().trim()
        val endereco = Protocolo.normalizarEndereco(campoServidor.text.toString())
        if (endereco.isEmpty()) { erroParear.text = getString(R.string.erro_sem_servidor); return }
        if (codigo.isEmpty()) { erroParear.text = getString(R.string.erro_sem_codigo); return }
        erroParear.text = ""
        botaoParear.isEnabled = false
        fundo.execute {
            val mensagem = tentarParear(endereco, codigo, nome)
            runOnUiThread {
                botaoParear.isEnabled = true
                erroParear.text = mensagem ?: ""
                if (mensagem == null) {
                    campoCodigo.setText("")
                    if (cfg.ehPessoal) AvisoService.iniciar(this)
                    mostrarGrupo()
                }
            }
        }
    }

    /** Null se pareou; senao o texto do problema. */
    private fun tentarParear(endereco: String, codigo: String, nome: String): String? =
        when (val r = Api(endereco, null).parear(codigo, nome)) {
            is Resposta.SemRede -> getString(R.string.erro_sem_rede, r.detalhe)
            is Resposta.Recebida -> {
                val pareado = if (r.http == 201) Protocolo.lerAparelhoPareado(r.corpo) else null
                if (pareado != null) {
                    cfg.salvarPareamento(endereco, pareado)
                    null
                } else if (r.http == 429) getString(R.string.erro_muitas_tentativas)
                else Protocolo.lerMensagemDeErro(r.corpo) ?: getString(R.string.erro_servidor, r.http)
            }
        }

    private fun alterarPlantao(ligar: Boolean) {
        fundo.execute {
            val erro = Acoes.plantao(cfg, if (ligar) "sai" else "voltei")
            runOnUiThread {
                if (erro != null) Toast.makeText(this, erro, Toast.LENGTH_LONG).show()
                mostrarGrupo()
            }
        }
    }

    private fun enviarTeste() {
        EntregaWorker.agendarEvento(
            this, getString(R.string.teste_conversa),
            listOf(Mensagem(null, getString(R.string.teste_texto), System.currentTimeMillis())), silencioso = false,
        )
        Toast.makeText(this, R.string.teste_enviado, Toast.LENGTH_SHORT).show()
        handler.postDelayed({ atualizarStatus() }, 3_000)
    }

    private fun testarAlarme() {
        Alarme.tocar(
            this,
            AvisoRecebido(
                Preparo.PREFIXO_TESTE + System.currentTimeMillis(),
                getString(R.string.teste_alarme_titulo), getString(R.string.teste_alarme_texto),
            ),
        )
    }

    private fun abrirTelaCheia() {
        if (Build.VERSION.SDK_INT < 34) return
        try {
            startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName")))
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        }
    }

    private fun desparear() {
        AvisoService.parar(this)
        cfg.limparPareamento()
        mostrarGrupo()
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

    private fun textoDaPendencia(p: Pendencia): Int = when (p) {
        Pendencia.NOTIFICACOES -> R.string.pendencia_notificacoes
        Pendencia.NAO_PERTURBE -> R.string.pendencia_nao_perturbe
        Pendencia.BATERIA -> R.string.pendencia_bateria
        Pendencia.TELA_CHEIA -> R.string.pendencia_tela_cheia
    }

    private fun atualizarStatus() {
        val bateria = getString(
            if (getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName))
                R.string.status_bateria_ok else R.string.status_bateria_falta,
        )
        if (cfg.ehEmpresa) {
            val acesso = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
            val entrega = if (cfg.entregaHora == 0L) getString(R.string.entrega_nenhuma) else {
                val hora = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(cfg.entregaHora))
                if (cfg.entregaOk) getString(R.string.entrega_ok, hora)
                else getString(R.string.entrega_falha, cfg.entregaDetalhe, hora)
            }
            statusEmpresa.text = listOf(
                getString(R.string.pareado_como, cfg.nome),
                getString(if (acesso) R.string.status_acesso_ok else R.string.status_acesso_falta),
                bateria, entrega,
            ).joinToString("\n")
        }
        if (cfg.ehPessoal) {
            val conexao = getString(
                if (cfg.conexao == "conectado") R.string.status_conectado else R.string.status_reconectando,
            )
            statusPessoal.text = listOf(
                getString(R.string.pareado_como, cfg.nome), conexao,
            ).joinToString("\n")
            val avisos = Historico.ler(cfg.historico)
            val formato = DateFormat.getTimeInstance(DateFormat.SHORT)
            listaAvisos.removeAllViews()
            if (avisos.isEmpty()) {
                listaAvisos.addView(
                    TextView(this).apply {
                        text = getString(R.string.nenhum_aviso)
                        setTextColor(getColor(R.color.texto_suave))
                        setPadding(0, 24, 0, 24)
                    },
                )
            }
            for (aviso in avisos) {
                val item = LayoutInflater.from(this).inflate(R.layout.item_aviso, listaAvisos, false)
                item.findViewById<AvatarView>(R.id.aviso_avatar).definir(aviso.titulo)
                item.findViewById<TextView>(R.id.aviso_titulo).text = aviso.titulo
                item.findViewById<TextView>(R.id.aviso_hora).text = formato.format(Date(aviso.hora))
                item.findViewById<TextView>(R.id.aviso_texto).text = Historico.emUmaLinha(aviso.texto)
                listaAvisos.addView(item)
            }
            val pendencias = Preparo.pendencias(Alarme.situacao(this))
            statusAlarme.text = if (pendencias.isEmpty()) getString(R.string.alarme_ok)
            else pendencias.joinToString("\n") { getString(textoDaPendencia(it)) }
            botoesDoAlarme.forEach { (p, botao) -> botao.visibility = if (p in pendencias) View.VISIBLE else View.GONE }
        }
    }
}
