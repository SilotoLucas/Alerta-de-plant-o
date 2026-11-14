# AlertaPlantao.ps1 - Observa as notificacoes do WhatsApp Desktop no Windows e mostra um alerta
# no topo da tela com aviso sonoro, ate a pessoa confirmar.
# Iniciar com: IniciarAlerta.vbs (sem janela) ou
#   powershell -STA -ExecutionPolicy Bypass -File AlertaPlantao.ps1
param([switch]$AutoTeste)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Versao = '1.2'

# ---------------- Configuracao (padrao; pode ser sobrescrita em config.json) ----------------
$Config = [ordered]@{
    IntervaloMs    = 1500               # frequencia de verificacao das notificacoes
    FiltroApp      = 'WhatsAppDesktop'  # trecho do AppUserModelId do WhatsApp
    Volume         = 0.25               # 0.0 a 1.0 (volume do aviso sonoro gerado)
    SomArquivo     = ''                 # caminho de um .wav proprio (vazio = som padrao)
    RepetirSomSeg  = 30                 # repete o som a cada N segundos ate confirmar (0 = so uma vez)
    LarguraCartao  = 460                # largura do cartao de alerta
    PegarFoco      = $true              # traz o cartao para frente para Enter/Esc funcionarem
    Brilho         = $true              # brilho verde pulsando nas bordas da tela enquanto houver alerta
}
$ConfigPath = Join-Path $AppDir 'config.json'
if (Test-Path $ConfigPath) {
    try {
        $json = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($p in $json.PSObject.Properties) { if ($Config.Contains($p.Name)) { $Config[$p.Name] = $p.Value } }
    } catch {}
}
$Config | ConvertTo-Json | Out-File $ConfigPath -Encoding utf8   # grava com as chaves novas de cada versao

Add-Type -AssemblyName System.Windows.Forms, System.Drawing, System.Runtime.WindowsRuntime
Add-Type -TypeDefinition (Get-Content (Join-Path $AppDir 'Banner.cs') -Raw -Encoding UTF8) -ReferencedAssemblies System.Windows.Forms, System.Drawing
[void][AP.Native]::SetProcessDPIAware()     # texto nitido em telas com escala
[System.Windows.Forms.Application]::EnableVisualStyles()

# --- Instancia unica ---
$created = $false
$script:mutex = New-Object System.Threading.Mutex($true, 'Global\AlertaPlantaoWhatsApp', [ref]$created)
if (-not $created) {
    [System.Windows.Forms.MessageBox]::Show('O Alerta de Plantão já está rodando (veja o ícone do sino na bandeja).', 'Alerta de Plantão') | Out-Null
    exit
}

# ---------------- Registro ----------------
$script:logPath = Join-Path $env:TEMP 'AlertaPlantao.log'
function Write-Log([string]$msg) {
    try {
        if ((Test-Path $script:logPath) -and (Get-Item $script:logPath).Length -gt 1MB) { Remove-Item $script:logPath }
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File $script:logPath -Append -Encoding utf8
    } catch {}
}
Write-Log "Iniciado (versao $Versao)"

# ---------------- WinRT: leitura das notificacoes ----------------
$script:asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) {
    $task = $script:asTask.MakeGenericMethod($t).Invoke($null, @($op))
    if (-not $task.Wait(5000)) { throw 'Tempo esgotado lendo notificacoes' }   # evita travar a bandeja
    $task.Result
}
[void][Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.UI.Notifications.KnownNotificationBindings, Windows.UI.Notifications, ContentType = WindowsRuntime]

$script:listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
$access = Await ($script:listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
if ($access -ne 'Allowed') {
    Write-Log "Sem acesso as notificacoes: $access"
    [System.Windows.Forms.MessageBox]::Show("O Windows não permitiu ler as notificações ($access).`n`nLibere em Configurações > Privacidade e segurança > Notificações > 'Permitir que os aplicativos acessem suas notificações' e abra o programa de novo.", 'Alerta de Plantão') | Out-Null
    exit
}
$script:listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
$script:toastBinding = [Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric

function Get-WhatsAppNotifications {
    $list = Await ($script:listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $script:listType
    foreach ($n in $list) {
        $aumid = try { $n.AppInfo.AppUserModelId } catch { '' }
        if ($aumid -notlike "*$($Config.FiltroApp)*") { continue }
        $b = $n.Notification.Visual.GetBinding($script:toastBinding)
        $texts = if ($b) { @($b.GetTextElements() | ForEach-Object { $_.Text }) } else { @() }
        [pscustomobject]@{ Id = $n.Id; Titulo = ($texts | Select-Object -First 1); Corpo = (($texts | Select-Object -Skip 1) -join ' ') }
    }
}

# Id da notificacao -> texto. O WhatsApp reaproveita a mesma notificacao (mesmo Id) quando chega
# outra mensagem na mesma conversa, entao "novo" = Id novo OU texto diferente para o mesmo Id.
$script:vistos = @{}
function Get-NovasNotificacoes {
    $atual = @{}; $novas = @()
    foreach ($n in Get-WhatsAppNotifications) {
        $chave = "$($n.Titulo)|$($n.Corpo)"
        $atual[$n.Id] = $chave
        if ($script:vistos[$n.Id] -ne $chave) { $novas += $n }
    }
    $script:vistos = $atual
    $novas
}
function Mark-AllSeen { [void](Get-NovasNotificacoes) }

# ---------------- Som ----------------
function New-ChimeWav([string]$path) {
    # "plim-plom" suave: Si -> Sol com decaimento, tipo campainha
    $rate = 44100; $samples = New-Object System.Collections.Generic.List[int16]
    $amp = 32000 * [double]$Config.Volume
    foreach ($note in @(@(988, 0.35), @(784, 0.55))) {
        $freq = $note[0]; $n = [int]($rate * $note[1])
        for ($i = 0; $i -lt $n; $i++) {
            $t = $i / $rate
            $env = [Math]::Min(1, $i / 400.0) * [Math]::Exp(-4 * $t)
            $v = $amp * $env * ([Math]::Sin(2 * [Math]::PI * $freq * $t) + 0.25 * [Math]::Sin(4 * [Math]::PI * $freq * $t)) / 1.25
            $samples.Add([int16]$v)
        }
    }
    $fs = [System.IO.File]::Create($path); $w = New-Object System.IO.BinaryWriter($fs)
    $dataLen = $samples.Count * 2
    $w.Write([Text.Encoding]::ASCII.GetBytes('RIFF')); $w.Write([int](36 + $dataLen))
    $w.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $w.Write([int]16); $w.Write([int16]1); $w.Write([int16]1)
    $w.Write([int]$rate); $w.Write([int]($rate * 2)); $w.Write([int16]2); $w.Write([int16]16)
    $w.Write([Text.Encoding]::ASCII.GetBytes('data')); $w.Write([int]$dataLen)
    foreach ($s in $samples) { $w.Write($s) }
    $w.Close()
}
$wavPath = if ($Config.SomArquivo -and (Test-Path $Config.SomArquivo)) { $Config.SomArquivo } else {
    $p = Join-Path $env:TEMP 'AlertaPlantao_aviso.wav'; New-ChimeWav $p; $p }
$script:player = New-Object System.Media.SoundPlayer($wavPath)
$script:player.Load()

# ---------------- Icones ----------------
$script:iconOn    = [AP.Native]::MakeIcon([System.Drawing.Color]::FromArgb(37, 211, 102))
$script:iconOff   = [AP.Native]::MakeIcon([System.Drawing.Color]::FromArgb(120, 130, 135))
$script:iconAlert = [AP.Native]::MakeIcon([System.Drawing.Color]::FromArgb(255, 152, 0))

# ---------------- Estado ----------------
$script:ativo = $true
$script:banner = $null
Mark-AllSeen   # ignora notificacoes antigas ao iniciar

# ---------------- Cartao de alerta ----------------
function Close-Alert {
    $script:player.Stop()
    $script:somTimer.Stop()
    if ($script:banner) { $b = $script:banner; $script:banner = $null; $b.Close(); $b.Dispose() }
    Update-Tray
}

function Show-Alert([string]$titulo, [string]$corpo) {
    $novo = -not $script:banner
    if ($novo) {
        $script:banner = New-Object AP.Banner([float]$Config.LarguraCartao)
        $script:banner.add_Dismissed({ Close-Alert })
    }
    # o cartao agrupa por conversa: cada grupo/contato vira uma linha, a mais recente no topo
    $script:banner.AddMessage($titulo, $corpo, (Get-Date -Format 'HH:mm'))
    if ($novo) { $script:banner.Present([bool]$Config.PegarFoco, [bool]$Config.Brilho) }
    $script:player.Play()
    if ([int]$Config.RepetirSomSeg -gt 0) { $script:somTimer.Stop(); $script:somTimer.Start() }
    $script:tray.Icon = $script:iconAlert
    $script:tray.Text = "Alerta de Plantão: $($script:banner.Total) msg em $($script:banner.Conversas) conversa(s)"
}

$script:somTimer = New-Object System.Windows.Forms.Timer
$script:somTimer.Interval = [Math]::Max(1, [int]$Config.RepetirSomSeg) * 1000
$script:somTimer.Add_Tick({ if ($script:banner) { $script:player.Play() } else { $script:somTimer.Stop() } })

# ---------------- Simulacao: varios grupos/contatos chegando em sequencia ----------------
$script:simFila = New-Object System.Collections.Queue
$script:simTimer = New-Object System.Windows.Forms.Timer
$script:simTimer.Interval = 1200
$script:simTimer.Add_Tick({
    if ($script:simFila.Count -eq 0) { $script:simTimer.Stop(); return }
    $m = $script:simFila.Dequeue()
    Show-Alert $m[0] $m[1]
})
function Start-Simulacao {
    $script:simFila.Clear()
    @(
        @('Grupo Cliente Exemplo',  'Maria Souza: Bom dia! O sistema caiu aqui, vocês conseguem verificar?'),
        @('Suporte Loja Centro',    'Carlos: A impressora fiscal parou de imprimir'),
        @('João Pereira',           'Oi, consegue me ligar quando puder?'),
        @('Grupo Cliente Exemplo',  'Maria Souza: É urgente, os pedidos estão parados.'),
        @('Financeiro Matriz',      'Ana Lima: O relatório de hoje não gerou'),
        @('Suporte Loja Centro',    'Carlos: Já reiniciei e continua igual'),
        @('Distribuidora Norte',    'Paulo: Bom dia, alguém de plantão?')
    ) | ForEach-Object { $script:simFila.Enqueue($_) }
    $m = $script:simFila.Dequeue(); Show-Alert $m[0] $m[1]
    $script:simTimer.Start()
}

# ---------------- Iniciar com o Windows ----------------
$script:startupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Alerta de Plantao.lnk'
function Set-Startup([bool]$on) {
    if ($on) {
        $sh = New-Object -ComObject WScript.Shell
        $lnk = $sh.CreateShortcut($script:startupLnk)
        $lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
        $lnk.Arguments = '"' + (Join-Path $AppDir 'IniciarAlerta.vbs') + '"'
        $lnk.WorkingDirectory = $AppDir
        $lnk.Description = 'Alerta de Plantão (WhatsApp)'
        $lnk.Save()
    } elseif (Test-Path $script:startupLnk) { Remove-Item $script:startupLnk }
}

# ---------------- Bandeja ----------------
$script:tray = New-Object System.Windows.Forms.NotifyIcon
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)
$miTitulo = $menu.Items.Add("Alerta de Plantão  v$Versao"); $miTitulo.Enabled = $false
[void]$menu.Items.Add('-')
$script:miToggle = $menu.Items.Add('Desativar alertas')
$miTest = $menu.Items.Add('Testar alerta')
$miSim = $menu.Items.Add('Simular várias conversas')
$script:miStartup = New-Object System.Windows.Forms.ToolStripMenuItem('Iniciar com o Windows')
$script:miStartup.Checked = Test-Path $script:startupLnk
[void]$menu.Items.Add($script:miStartup)
$miConfig = $menu.Items.Add('Configurações...')
$miLog = $menu.Items.Add('Abrir registro')
[void]$menu.Items.Add('-')
$miExit = $menu.Items.Add('Sair')
$script:tray.ContextMenuStrip = $menu

function Update-Tray {
    if ($script:banner) { return }
    if ($script:ativo) {
        $script:tray.Icon = $script:iconOn
        $script:tray.Text = 'Alerta de Plantão: ATIVO (clique para desativar)'
        $script:miToggle.Text = 'Desativar alertas'
    } else {
        $script:tray.Icon = $script:iconOff
        $script:tray.Text = 'Alerta de Plantão: DESATIVADO (clique para ativar)'
        $script:miToggle.Text = 'Ativar alertas'
    }
}

function Toggle-Ativo {
    if ($script:banner) { Close-Alert; return }   # com alerta aberto, o clique no icone so fecha o alerta
    $script:ativo = -not $script:ativo
    if ($script:ativo) { Mark-AllSeen }           # nao alertar o que chegou enquanto estava desligado
    Update-Tray
    $estado = if ($script:ativo) { 'ATIVADO' } else { 'DESATIVADO' }
    Write-Log "Alerta $estado pelo usuario"
    $script:tray.ShowBalloonTip(2000, 'Alerta de Plantão', "Alertas $($estado.ToLower())", 'Info')
}

$script:miToggle.Add_Click({ Toggle-Ativo })
$miTest.Add_Click({ Show-Alert 'Grupo Cliente Exemplo' 'Maria Souza: Bom dia! O sistema caiu aqui, vocês conseguem verificar, por favor?' })
$miSim.Add_Click({ Start-Simulacao })
$script:miStartup.Add_Click({
    $on = -not $script:miStartup.Checked
    Set-Startup $on; $script:miStartup.Checked = $on
    Write-Log "Iniciar com o Windows: $on"
})
$miConfig.Add_Click({
    Start-Process notepad.exe -ArgumentList "`"$ConfigPath`""
    $script:tray.ShowBalloonTip(3000, 'Alerta de Plantão', 'Depois de salvar, use Sair e abra o programa de novo para aplicar.', 'Info')
})
$miLog.Add_Click({ if (Test-Path $script:logPath) { Start-Process notepad.exe -ArgumentList "`"$($script:logPath)`"" } })
$miExit.Add_Click({
    Write-Log 'Encerrado pelo usuario'
    $script:pollTimer.Stop(); Close-Alert
    $script:tray.Visible = $false; $script:tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
})
$script:tray.Add_MouseClick({ if ($_.Button -eq 'Left') { Toggle-Ativo } })
Update-Tray
$script:tray.Visible = $true

# ---------------- Loop de verificacao ----------------
$script:pollTimer = New-Object System.Windows.Forms.Timer
$script:pollTimer.Interval = [int]$Config.IntervaloMs
$script:pollTimer.Add_Tick({
    try {
        $novas = @(Get-NovasNotificacoes)
        foreach ($n in $novas) {
            Write-Log ("Mensagem (ativo={0}) id={1}: {2} / {3}" -f $script:ativo, $n.Id, $n.Titulo, $n.Corpo)
            if ($script:ativo) { Show-Alert $n.Titulo $n.Corpo }
        }
        if (-not $script:banner) { Update-Tray }
    } catch {
        $script:tray.Text = 'Alerta de Plantão: erro ao ler notificações'
        Write-Log "ERRO na verificacao: $_"
    }
})
$script:pollTimer.Start()

if ($AutoTeste) {
    # modo de verificacao: roda a simulacao, registra o estado do cartao em cada etapa,
    # fecha com Enter e sai. Resultado em %TEMP%\AlertaPlantao_autoteste.log
    $log = Join-Path $env:TEMP 'AlertaPlantao_autoteste.log'
    $t = New-Object System.Windows.Forms.Timer; $t.Interval = 600; $script:passo = 0
    $t.Add_Tick({
        try {
            $script:passo++
            $b = $script:banner
            switch ($script:passo) {
                1  { Start-Simulacao; "simulacao iniciada" | Out-File $log }
                2  { "etapa 1: conversas=$($b.Conversas) total=$($b.Total) tam=$($b.Size)" | Out-File $log -Append }
                7  { "etapa 2: conversas=$($b.Conversas) total=$($b.Total) tam=$($b.Size)" | Out-File $log -Append }
                16 { "etapa 3: conversas=$($b.Conversas) total=$($b.Total) tam=$($b.Size) foco=$($b.ContainsFocus)" | Out-File $log -Append
                     $b.Activate(); [System.Windows.Forms.SendKeys]::SendWait('{ENTER}') }
                18 { "apos Enter banner=$([bool]$script:banner)" | Out-File $log -Append
                     $t.Stop(); $script:tray.Visible = $false; [System.Windows.Forms.Application]::Exit() }
            }
        } catch { "ERRO: $_" | Out-File $log -Append; [System.Windows.Forms.Application]::Exit() }
    })
    $t.Start()
} else {
    $script:tray.ShowBalloonTip(2500, 'Alerta de Plantão', 'Monitorando o WhatsApp. Clique no sino para ativar/desativar.', 'Info')
}
[System.Windows.Forms.Application]::Run()
