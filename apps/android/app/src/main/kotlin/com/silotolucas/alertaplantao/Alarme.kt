package com.silotolucas.alertaplantao

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * O alarme do celular pessoal: notificacao de categoria ALARM, com som de alarme que repete ate
 * alguem tocar em "Vi", vibracao, canal que pede para furar o "Nao perturbe" e, se o usuario liberou,
 * tela cheia por cima do bloqueio (`AlarmeActivity`).
 */
object Alarme {
    private const val CANAL = "alarme"
    private const val CANAL_ANTIGO = "avisos"
    private val VIBRACAO = longArrayOf(0, 700, 400, 700, 400, 1_200)

    /** Cria o canal (as escolhas de um canal so mudam apagando-o, por isso o id novo) e remove o da R2. */
    fun prepararCanal(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.deleteNotificationChannel(CANAL_ANTIGO)
        val atributos = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val canal = NotificationChannel(CANAL, context.getString(R.string.canal_alarme), NotificationManager.IMPORTANCE_HIGH).apply {
            description = context.getString(R.string.canal_alarme_descricao)
            setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), atributos)
            enableVibration(true)
            vibrationPattern = VIBRACAO
            setBypassDnd(true)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(canal)
    }

    fun tocar(context: Context, aviso: AvisoRecebido) {
        prepararCanal(context)
        val idNotificacao = aviso.id.hashCode()
        val agora = System.currentTimeMillis()
        val vi = PendingIntent.getBroadcast(
            context, idNotificacao,
            Intent(context, VistoReceiver::class.java)
                .putExtra(VistoReceiver.EXTRA_AVISO_ID, aviso.id)
                .putExtra(VistoReceiver.EXTRA_NOTIFICACAO, idNotificacao),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val telaCheia = PendingIntent.getActivity(
            context, idNotificacao,
            Intent(context, AlarmeActivity::class.java)
                .putExtra(VistoReceiver.EXTRA_AVISO_ID, aviso.id)
                .putExtra(AlarmeActivity.EXTRA_TITULO, aviso.titulo)
                .putExtra(AlarmeActivity.EXTRA_TEXTO, aviso.texto)
                .putExtra(AlarmeActivity.EXTRA_HORA, agora)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notificacao = NotificationCompat.Builder(context, CANAL)
            .setSmallIcon(R.drawable.ic_sino)
            .setColor(context.getColor(R.color.acento))
            .setColorized(false)
            .setLargeIcon(AvatarView.imagem(aviso.titulo, (context.resources.displayMetrics.density * 64).toInt()))
            .setSubText(context.getString(R.string.rotulo_subtexto))
            .setWhen(agora)
            .setShowWhen(true)
            .setContentTitle(aviso.titulo)
            .setContentText(Historico.emUmaLinha(aviso.texto))
            .setStyle(NotificationCompat.BigTextStyle().bigText(aviso.texto))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setTimeoutAfter(Preparo.TEMPO_MAXIMO_MS)
            .setContentIntent(telaCheia)
            .setFullScreenIntent(telaCheia, true)
            .addAction(0, context.getString(R.string.vi), vi)
            .build()
        notificacao.flags = notificacao.flags or Notification.FLAG_INSISTENT
        context.getSystemService(NotificationManager::class.java).notify(idNotificacao, notificacao)
    }

    fun silenciar(context: Context, idNotificacao: Int) {
        context.getSystemService(NotificationManager::class.java).cancel(idNotificacao)
    }

    fun situacao(context: Context): Situacao {
        val nm = context.getSystemService(NotificationManager::class.java)
        return Situacao(
            notificacoes = NotificationManagerCompat.from(context).areNotificationsEnabled(),
            naoPerturbe = nm.isNotificationPolicyAccessGranted,
            telaCheia = Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent(),
            bateria = context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName),
        )
    }
}
