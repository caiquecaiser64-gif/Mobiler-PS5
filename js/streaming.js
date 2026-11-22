'use strict';
/* Adaptador genérico por WebSocket. O formato das mensagens de entrada é definido por você;
   para integrar um serviço real, registre outro adaptador com Streaming.register(). */
const WebSocketAdapter = {
  ws: null,
  connect(url, hooks) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now(); let settled = false, connected = false, ws;
      try { ws = new WebSocket(url); } catch (e) { return reject(new Error('Endereço do servidor inválido.')); }
      this.ws = ws; ws.binaryType = 'arraybuffer';
      const to = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch (_) {} reject(new Error('Tempo esgotado ao conectar.')); } }, 8000);
      ws.onopen = () => { if (settled) return; settled = true; connected = true; clearTimeout(to); resolve(Math.round(performance.now() - t0)); };
      ws.onerror = () => { if (!settled) { settled = true; clearTimeout(to); reject(new Error('Não foi possível conectar ao servidor.')); } };
      ws.onclose = () => { if (connected && hooks.onClose) hooks.onClose(); };
      ws.onmessage = ev => { if (hooks.onMessage) hooks.onMessage(ev.data); };
    });
  },
  send(state) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'input', buttons: state.buttons, axes: state.axes, t: Date.now() }));
  },
  disconnect() { try { if (this.ws) this.ws.close(); } catch (e) {} this.ws = null; }
};

const Streaming = {
  game: null, adapter: null, adapters: {}, pad: null, token: 0,
  register(name, a) { this.adapters[name] = a; },

  init() {
    this.register('websocket', WebSocketAdapter);
    this.pad = new Pad($('pad-stream'), s => { if (this.adapter) this.adapter.send(s); });
    $('st-back').addEventListener('click', () => App.back());
    $('st-pad').addEventListener('click', () => $('st-padwrap').classList.toggle('hidden'));
    $('st-overlay').addEventListener('click', e => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      if (b.dataset.st === 'retry') this.start();
      if (b.dataset.st === 'lib') App.popTo('library');
      if (b.dataset.st === 'settings') App.go('settings');
    });
    App.onLeave.stream = () => this.teardown();
    const c = navigator.connection; if (c && c.addEventListener) c.addEventListener('change', () => this.quality());
  },

  open(game) {
    this.game = game; $('st-title').textContent = game.title;
    App.go('stream');
    try {
      const de = document.documentElement;
      if (de.requestFullscreen) de.requestFullscreen().then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
    } catch (e) {}
    this.start();
  },

  quality() {
    const e = Settings.effective(), c = navigator.connection;
    const net = c ? ' · ' + (c.effectiveType || '') + (c.downlink != null ? ' ~' + c.downlink + ' Mbps' : '') : '';
    $('st-quality').textContent = e.label + net;
  },
  conn(state, text) { $('st-dot').className = 'dot ' + (state === 'ok' ? 'ok' : state === 'connecting' ? 'warn' : 'bad'); $('st-conn').textContent = text; },

  overlay(kind, title, msg, buttons = '') {
    const o = $('st-overlay'); o.className = 'overlay ' + kind;
    const icon = kind === 'loading' ? '<div class="spinner"></div>' : kind === 'error' ? '<div class="big-ic">!</div>' : '<div class="big-ic ok">✓</div>';
    o.innerHTML = `${icon}<h3>${UI.esc(title)}</h3><p>${UI.esc(msg)}</p>${buttons}`;
  },
  fail(title, msg, withSettings) {
    this.conn('bad', 'Sem conexão');
    this.overlay('error', title, msg, `<div class="btns">
      <button class="btn primary" data-st="retry">Tentar novamente</button>
      <button class="btn" data-st="lib">Voltar à biblioteca</button>
      ${withSettings ? '<button class="btn" data-st="settings">Configurações</button>' : ''}</div>`);
  },

  async start() {
    const g = this.game, tk = ++this.token;
    if (this.adapter) { this.adapter.disconnect(); this.adapter = null; }
    this.quality();
    this.conn('connecting', 'Conectando...');
    this.overlay('loading', 'Iniciando ' + g.title, 'Verificando sua conexão...');
    await wait(600); if (tk !== this.token) return;
    if (!navigator.onLine) return this.fail('Sem conexão com a internet', 'Conecte-se a uma rede Wi-Fi ou aos dados móveis e tente novamente.');
    const url = Settings.get().serverUrl;
    if (!url) return this.fail('Nenhuma integração de streaming configurada',
      '"' + g.title + '" é apenas um exemplo demonstrativo e o Mobile PS5 ainda não está ligado a um serviço de streaming. Para testar a conexão, informe o endereço de um servidor compatível em Configurações > Transmissão.', true);
    this.overlay('loading', 'Conectando ao servidor', url);
    const A = this.adapters.websocket;
    try {
      const ms = await A.connect(url, {
        onClose: () => { if (tk === this.token) this.fail('Conexão encerrada', 'O servidor fechou a conexão.'); },
        onMessage: data => this.onMessage(data)
      });
      if (tk !== this.token) { A.disconnect(); return; }
      this.adapter = A;
      this.conn('ok', 'Conectado · ' + ms + ' ms');
      this.overlay('ok', 'Conectado ao servidor', 'Aguardando fluxo de vídeo. A decodificação de vídeo depende do protocolo do seu servidor e ainda não foi implementada nesta versão. Os controles já enviam a entrada.');
    } catch (e) { if (tk === this.token) this.fail('Falha na conexão', e.message, true); }
  },

  /* Ponto de integração: decodifique vídeo/áudio recebido aqui (ex.: WebRTC, WebCodecs, MSE). */
  onMessage(data) {},

  teardown() {
    this.token++;
    if (this.adapter) { this.adapter.disconnect(); this.adapter = null; }
    if (this.pad) this.pad.reset();
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  }
};
