---
paths:
  - apps/windows/**
---

# apps/windows

PowerShell 5.1 + WinForms + C# 5 (`Banner.cs`, compilado por `Add-Type`). Não roda no Linux e não é
parte do gate. `AlertaPlantao.ps1` é UTF-8 **com BOM**: confira com `file` depois de editar.

- C# 5: sem interpolação de string nem `?.`.
- Não colocar captura de tela no programa (o Defender marcou o script como trojan por isso).
- O registro (`%TEMP%\AlertaPlantao.log`) guarda só o nome da conversa, nunca o texto do cliente.
- Não dá para testar aqui: diga isso ao dono em vez de afirmar que funciona.
