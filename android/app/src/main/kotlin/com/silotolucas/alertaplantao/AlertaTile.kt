package com.silotolucas.alertaplantao

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Botao nas configuracoes rapidas para ligar/desligar os alertas. */
class AlertaTile : TileService() {

    override fun onStartListening() = atualizar()

    override fun onClick() {
        val cfg = Config(this)
        cfg.ativo = !cfg.ativo
        atualizar()
    }

    private fun atualizar() {
        val tile = qsTile ?: return
        val ativo = Config(this).ativo
        tile.state = if (ativo) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = getString(R.string.app_name)
        if (Build.VERSION.SDK_INT >= 29) {
            tile.subtitle = getString(if (ativo) R.string.tile_ativo else R.string.tile_desativado)
        }
        tile.updateTile()
    }
}
