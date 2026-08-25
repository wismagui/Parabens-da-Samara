# Samara e o Castelo dos Gaps 🎂🏰

Um presente de aniversário: um mini-RPG 3D jogável direto no navegador do
celular. Samara atravessa um castelo, enfrenta 6 monstros "Gap" — cada um
uma piada com processadores (Pentium 4, Atom, Xeon, AMD FX e, como chefes
finais, I5cão e i7 Rei) — e, ao vencer todos, encontra uma mensagem de
aniversário na sala final.

Logo no início, uma caixa no hall de entrada guarda a arma de Samara: uma
espada feita de um pente de memória RAM. Encostar nela (ou numa lata de
energético) não pega o item na hora — abre uma caixinha de diálogo explicando
o que é, com a opção de usar/equipar agora ou deixar pra depois. Ela fica
mais forte (mais ataque e mais HP) a cada Gap vencido; se perder uma
batalha, só aquele confronto reinicia, sem punição.

O castelo é um labirinto de verdade (gerado por algoritmo, com becos sem
saída e alguns loops), não só salas ligadas por corredores retos — dá pra se
perder mesmo. O hub central tem tapete, colunas de pedra, lustre, mesas com
cadeiras e estantes de livros; cada sala de Gap tem um estandarte com a cor
do monstro; a sala final tem trono, mesa lateral com taça, carpete vermelho
e portão dourado. Paredes e chão usam texturas de pedra geradas por canvas
(sem baixar nenhuma imagem).

O HP da Samara agora é persistente: some conforme ela apanha nas batalhas e
só volta com o crescimento por vitória ou achando uma lata de "Energético
Baly Nuclear" — espalhadas em caixas-barril em alguns becos sem saída do
labirinto (nunca nas salas dos monstros). Encostar na lata não consome na
hora: abre uma caixinha de diálogo explicando o item, com a opção de usar
(recupera o HP todo) ou deixar pra depois. Se ela perder uma batalha, só
aquele confronto reinicia com HP cheio, sem punição — mas o HP com que ela
sai de uma vitória é o que carrega pra próxima sala.

100% client-side — sem build, sem backend, sem assets baixados (tudo é
geometria do Three.js). Só HTML, CSS e JS puro, carregando Three.js via CDN.

## Como rodar

Qualquer servidor estático funciona. Duas opções simples, dentro da pasta
do projeto:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

Depois abra `http://localhost:PORTA` no navegador do computador (bom para
testar rápido com teclado/mouse — WASD ou setas movem, Q/E ou setas
esquerda/direita giram a câmera).

## Como jogar no celular

1. Rode o servidor local no seu computador (veja acima) e confira o IP da
   máquina na rede local (Wi-Fi):
   - Linux/Mac: `hostname -I` ou `ifconfig`
   - Windows: `ipconfig`
2. No celular (conectado ao **mesmo Wi-Fi**), abra o navegador e acesse
   `http://SEU-IP-LOCAL:PORTA` (ex: `http://192.168.0.42:8000`).
3. Toque em "Toque para começar", gire o celular para paisagem se pedido,
   e jogue:
   - **Joystick** (canto inferior esquerdo): arraste para mover a Samara.
   - **Arraste na metade direita da tela**: gira a câmera.
   - **Ícone de mapa** (canto superior direito): abre/fecha o minimapa.
   - Ao entrar numa sala de monstro, a batalha começa automaticamente.
     Toque em Atacar, Defender ou Gap Reverso (habilidade especial).
   - Vença os 6 Gaps para abrir o portão dourado final.

Alternativa: publique a pasta como site estático em qualquer host simples
(GitHub Pages, Netlify, Vercel, etc.) — como é 100% client-side, funciona
sem nenhuma configuração extra de servidor.

## Estrutura do código

```
index.html          Estrutura da página, overlays de UI, import map do Three.js
css/style.css        Todo o estilo (HUD, joystick, batalha, telas)
js/mazeData.js        Gerador do labirinto (algoritmo + grade, sem Three.js)
js/maze.js             Geometria 3D do castelo, decoração, colisão
js/textures.js          Texturas procedurais (pedra, madeira, tapete, bandeira)
js/furniture.js          Móveis reutilizáveis (mesa, cadeira, estante, barril, lata)
js/player.js           Personagem (modelo low-poly, rosto) + movimento
js/monsters.js         Os 6 "Gaps": stats e modelos 3D
js/battle.js            Sistema de batalha por turnos
js/input.js              Joystick virtual + arraste de câmera (multi-touch)
js/audio.js              Efeitos sonoros sintetizados (Web Audio, sem arquivos)
js/story.js               Mensagem final + efeito de máquina de escrever
js/ui.js                    HUD, minimapa, telas e menus (DOM)
js/config.js                 Constantes ajustáveis (velocidade, câmera, stats)
js/main.js                    Ponto de entrada: liga tudo e roda o loop do jogo
```

## Notas de teste

- Labirinto gerado por algoritmo (recursive backtracker com seed fixa):
  verificado que é totalmente conectado, que as 6 salas e a sala final são
  alcançáveis, e que a sala final tem exatamente uma entrada (a porta
  trancada) — via checagem automática direta no módulo real do jogo.
- Testado em emulação mobile (viewport paisagem, toques multi-touch
  simulados via eventos de ponteiro reais) sem erros no console, incluindo
  as 6 batalhas de ponta a ponta.
- Sem dependências além do Three.js (via CDN); zero downloads de assets —
  as texturas do castelo são geradas por canvas em tempo de execução.

## Ajustes rápidos

Praticamente todo o "balanceamento" do jogo (velocidade de movimento,
distância/altura da câmera, HP e dano da Samara, sensibilidade da câmera)
fica em `js/config.js`. Os stats e nomes dos monstros ficam em
`js/monsters.js`. O layout do labirinto (salas, corredores, posição da
porta final) fica em `js/mazeData.js`.
