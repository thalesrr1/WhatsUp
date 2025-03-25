@echo off
setlocal EnableDelayedExpansion

echo ------------------------------
echo Iniciando o processo de reinstalacao...
echo ------------------------------

:: Criar pasta de logs se não existir
if not exist logs\ (
    echo Criando pasta de logs...
    mkdir logs
    if !errorlevel! neq 0 (
        echo ERRO: Nao foi possivel criar a pasta de logs.
        pause >nul
        exit /b 1
    )
)

:: Limpar logs antigos se existirem
if exist logs\*.log (
    echo Limpando logs antigos...
    del /Q logs\*.log >nul
)

:: Verificar se o npm está disponível
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: npm nao encontrado. Verifique se o Node.js esta instalado corretamente.
    echo Pressione qualquer tecla para sair...
    pause >nul
    exit /b 1
)

:: Verificar se estamos no diretório correto (com package.json)
if not exist package.json (
    echo AVISO: package.json nao encontrado no diretorio atual.
    echo Certifique-se de executar este script no diretorio do seu projeto.
    choice /c SN /m "Deseja continuar mesmo assim? (S/N)"
    if !errorlevel! equ 2 exit /b 1
)

echo [1/3] Desinstalando WPPConnect e Puppeteer...
call npm uninstall @wppconnect-team/wppconnect puppeteer 2>logs\desinstalar_erro.log
if %errorlevel% neq 0 (
    echo ERRO ao desinstalar pacotes. Verifique o arquivo logs\desinstalar_erro.log
    echo Detalhes do erro:
    type logs\desinstalar_erro.log
    echo.
    choice /c SN /m "Deseja continuar para a proxima etapa? (S/N)"
    if !errorlevel! equ 2 exit /b 1
) else (
    echo Desinstalacao concluida com sucesso.
)

echo [2/3] Limpando o cache do npm...
call npm cache clean --force 2>logs\cache_erro.log
if %errorlevel% neq 0 (
    echo ERRO ao limpar cache. Verifique o arquivo logs\cache_erro.log
    echo Detalhes do erro:
    type logs\cache_erro.log
    echo.
    choice /c SN /m "Deseja continuar para a proxima etapa? (S/N)"
    if !errorlevel! equ 2 exit /b 1
) else (
    echo Cache limpo com sucesso.
)

echo [3/3] Instalando as versoes mais recentes de WPPConnect e Puppeteer...
echo Este processo pode demorar alguns minutos. Por favor, aguarde...
call npm install @wppconnect-team/wppconnect@latest puppeteer@latest >logs\instalacao.log 2>logs\instalar_erro.log
if %errorlevel% neq 0 (
    echo ERRO ao instalar pacotes. Verifique o arquivo logs\instalar_erro.log
    echo Detalhes do erro:
    type logs\instalar_erro.log
    echo.
) else (
    echo Instalacao concluida com sucesso!
    echo.
    echo Versoes instaladas:
    call npm list @wppconnect-team/wppconnect puppeteer --depth=0
    
    :: Salvar informações das versões no log
    echo ===== Versoes instaladas em %date% %time% ===== > logs\versoes.log
    call npm list @wppconnect-team/wppconnect puppeteer --depth=0 >> logs\versoes.log
)

echo.
echo ------------------------------
echo Processo finalizado.
echo Todos os logs foram salvos na pasta 'logs'
echo ------------------------------
echo Pressione qualquer tecla para fechar...
pause >nul
exit /b 0