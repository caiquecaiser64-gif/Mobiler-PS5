# Mobile PS5

Plataforma mobile (PWA) inspirada na experiência do PS5: controles virtuais, análise real do aparelho,
biblioteca e base para streaming. HTML + CSS + JavaScript puros, sem dependências nem serviços pagos.

## Testar localmente
python3 -m http.server 8080   (dentro da pasta do projeto)

## Estado atual
- Jogos da biblioteca são exemplos demonstrativos; não há execução real.
- Streaming: adaptador WebSocket genérico em js/streaming.js; decodificação de vídeo ainda não implementada.
- "Conectar a um PS5" apenas guarda o endereço do console localmente.

## Próximos passos
Registrar um adaptador real com Streaming.register() e tratar vídeo/áudio em onMessage().
