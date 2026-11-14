# Instalar.ps1 - instala o Alerta de Plantao para o usuario atual (nao precisa de administrador).
param([switch]$Desinstalar)
$ErrorActionPreference = 'Stop'
$Origem  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Destino = Join-Path $env:LOCALAPPDATA 'AlertaPlantao'
$Arquivos = 'AlertaPlantao.ps1', 'Banner.cs', 'IniciarAlerta.vbs'
$MenuLnk    = Join-Path ([Environment]::GetFolderPath('Programs')) 'Alerta de Plantao.lnk'
$StartupLnk = Join-Path ([Environment]::GetFolderPath('Startup'))  'Alerta de Plantao.lnk'

function Parar-App {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
        Where-Object { $_.CommandLine -like '*AlertaPlantao.ps1*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Novo-Atalho($caminho) {
    $sh = New-Object -ComObject WScript.Shell
    $l = $sh.CreateShortcut($caminho)
    $l.TargetPath = "$env:WINDIR\System32\wscript.exe"
    $l.Arguments = '"' + (Join-Path $Destino 'IniciarAlerta.vbs') + '"'
    $l.WorkingDirectory = $Destino
    $l.IconLocation = "$env:WINDIR\System32\imageres.dll,-1032"
    $l.Description = 'Alerta de Plantao (WhatsApp)'
    $l.Save()
}

if ($Desinstalar) {
    Parar-App
    Remove-Item $MenuLnk, $StartupLnk -ErrorAction SilentlyContinue
    Remove-Item $Destino -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'Alerta de Plantao removido.' -ForegroundColor Green
    return
}

Write-Host 'Instalando o Alerta de Plantao...' -ForegroundColor Cyan
Parar-App
New-Item -ItemType Directory -Force $Destino | Out-Null
foreach ($a in $Arquivos) {
    Copy-Item (Join-Path $Origem $a) $Destino -Force
    Unblock-File (Join-Path $Destino $a)      # remove o bloqueio de "arquivo baixado da internet"
}
Novo-Atalho $MenuLnk
Novo-Atalho $StartupLnk                       # inicia junto com o Windows (desligavel pelo menu da bandeja)
Start-Process "$env:WINDIR\System32\wscript.exe" -ArgumentList ('"' + (Join-Path $Destino 'IniciarAlerta.vbs') + '"')

Write-Host ''
Write-Host 'Pronto! O sino verde apareceu na bandeja (perto do relogio).' -ForegroundColor Green
Write-Host 'Se ele estiver escondido, clique na setinha ^ da bandeja e arraste o sino para fora.'
Write-Host 'Clique com o botao direito no sino > "Testar alerta" para ver como fica.'
