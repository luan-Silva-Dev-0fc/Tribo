# Sistema de depuracao Android

Sistema somente de diagnostico para um app React Native Android nativo. Ele nao abre navegador, nao usa Expo e nao altera Gradle, Java, Kotlin, Manifest, dependencias ou o aplicativo.

## Uso rapido

No terminal integrado do VS Code (CMD ou PowerShell), a partir da raiz do projeto:

```bat
debug\debug.bat
```

O menu permite apenas capturar, abrir o app nativo antes da captura ou gerar um diagnostico inicial. A sessao fica em `debug\logs\AAAA-MM-DD_HH-MM-SS` e termina ao pressionar `Q`.

Atalhos:

```bat
debug\crash.bat
debug\device.bat
debug\clean-logs.bat
debug\debug.bat --verbose
debug\debug.bat --package com.seu.app
debug\debug.bat --serial 192.168.0.20:5555
```

`--package` e intencionalmente explícito: use-o quando o `applicationId` não puder ser obtido com segurança nos arquivos Android. Nunca é usado um package fictício.

## Pré-requisitos

- Android SDK Platform-Tools (`adb`) no `PATH`, em `ANDROID_SDK_ROOT`, `ANDROID_HOME` ou no local padrão do SDK do Windows.
- Um dispositivo com depuração USB ou Wi-Fi já autorizado. Para Wi-Fi, conecte antes com `adb connect IP:PORTA`.
- PowerShell do Windows, usado somente para gerar o timestamp, iniciar a captura em segundo plano e extrair o contexto das pilhas. O `raw.log` continua sendo a fonte integral caso essa parte não esteja disponível.

## Evidências produzidas

Cada sessão contém:

- `raw.log`: logcat integral em `threadtime`; não é filtrado nem truncado pelo sistema.
- `errors.log`, `crash.log`, `react-native.log`, `java-kotlin.log`, `native.log`, `anr.log`: ocorrências identificadas, com número de linha no arquivo bruto.
- `stack-context.log`: linhas próximas a exceções fatais, sinais nativos e ANRs.
- `device-info.txt`: modelo, Android, SDK, ABIs, build fingerprint e dados de pacote disponíveis.
- `meminfo-before/after.txt`, processo e package após a sessão, quando há package conhecido.
- `native-crash-buffer.log`, `dropbox.txt` e `tombstones-list.txt`: fontes adicionais para falhas C/C++; a listagem de tombstones pode ser negada por aparelhos sem root, o que fica registrado no próprio arquivo.
- `report.txt`: resumo e classificação conservadora: `[JS]`, `[NATIVE JAVA/KOTLIN]`, `[NATIVE C/C++]`, `[HERMES]`, `[MEMORY]`, `[ANR]` ou `[UNKNOWN]`.

O script mantém a captura após detectar `FATAL EXCEPTION`, `Fatal signal`, ANR ou morte de processo para preservar a continuação do stack trace. Acesso a tombstones depende das permissões do aparelho; por isso os padrões nativos são preservados no logcat mesmo em dispositivos sem acesso root.

## Como investigar um fechamento

1. Execute `debug\crash.bat`.
2. Reproduza o fechamento no aparelho.
3. Aguarde alguns segundos após o fechamento e pressione `Q`.
4. Abra `report.txt`, depois `stack-context.log`; use o número de linha dos arquivos filtrados para localizar o trecho completo em `raw.log`.

Se nenhum padrão concreto for registrado, o relatório usa `[UNKNOWN]` em vez de declarar uma causa sem evidência.
