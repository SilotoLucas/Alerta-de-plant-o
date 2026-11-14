package com.silotolucas.alertaplantao

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Botao nas configuracoes rapidas do celular pessoal: liga e desliga o plantao ("sai" / "voltei"). */
class AlertaTile : TileService() {

    override fun onStartListening() = atualizar()

    override fun onClick() {
        val cfg = Config(this)
        if (!cfg.ehPessoal) return
        val comando = if (cfg.plantaoAtivo) "voltei" else "sai"
        Thread({
            Acoes.plantao(cfg, comando)
            atualizar()
        }, "alerta-tile").start()
    }

    private fun atualizar() {
        val tile = qsTile ?: return
        val cfg = Config(this)
        tile.state = when {
            !cfg.ehPessoal -> Tile.STATE_UNAVAILABLE
            cfg.plantaoAtivo -> Tile.STATE_ACTIVE
            else -> Tile.STATE_INACTIVE
        }
        tile.label = getString(R.string.app_name)
        if (Build.VERSION.SDK_INT >= 29) {
            tile.subtitle = getString(
                when {
                    !cfg.ehPessoal -> R.string.tile_sem_pareamento
                    cfg.plantaoAtivo -> R.string.tile_ativo
                    else -> R.string.tile_desativado
                },
            )
        }
        tile.updateTile()
    }
}
