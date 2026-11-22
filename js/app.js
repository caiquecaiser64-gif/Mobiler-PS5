'use strict';
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Armazenamento local ---------- */
const Store = {
  p: 'mps5.',
  get(k, d = null) { try { const v = localStorage.getItem(this.p + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(this.p + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  clearAll() { try { Object.keys(localStorage).filter(k => k.startsWith(this.p)).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};

/* ---------- Utilidades de interface ---------- */
const UI = {
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this._t); this._t = setTimeout(() => t.classList.remove('show'), 2600); },
  sheet(title, html) { $('sheet-title').textContent = title; $('sheet-body').innerHTML = html; $('sheet').classList.add('open'); },
  closeSheet() { $('sheet').classList.remove('open'); }
};

/* ---------- Navegação entre telas (com botão Voltar do Android) ---------- */
const App = {
  stack: [], current: null, onEnter: {}, onLeave: {},
  _show(id) {
    const next = $('screen-' + id);
    if (!next || this.current === id) return;
    const prev = this.current;
    if (prev && this.onLeave[prev]) this.onLeave[prev]();
    if (prev) {
      const p = $('screen-' + prev);
      p.classList.remove('show');
      setTimeout(() => { if (this.current !== prev) p.classList.remove('active'); }, 320);
    }
    next.classList.add('active'); void next.offsetWidth; next.classList.add('show'); next.scrollTop = 0;
    this.current = id; UI.closeSheet();
    if (this.onEnter[id]) this.onEnter[id]();
  },
  go(id, { replace = false } = {}) {
    if (this.current === id) return;
    if (replace) { this.stack = [id]; history.replaceState({ id }, ''); }
    else { this.stack.push(id); history.pushState({ id }, ''); }
    this._show(id);
  },
  back() { if (this.stack.length > 1) history.back(); },
  popTo(id) {
    const i = this.stack.lastIndexOf(id);
    if (i >= 0 && i < this.stack.length - 1) history.go(i - (this.stack.length - 1));
    else this.go(id);
  },
  async start() {
    App.go('loading', { replace: true });
    await Loading.run();
    await wait(900);
    App.go(User.get() ? 'home' : 'user', { replace: true });
  },
  init() {
    Settings.apply();
    User.init(); Library.init(); Streaming.init();
    this.onEnter.home = () => Home.render();
    this.onEnter.settings = () => Settings.render();
    this.onEnter.library = () => Library.renderGrid();

    const ro = $('pad-readout');
    new Pad($('pad-intro'), s => {
      const on = Object.keys(s.buttons).filter(k => s.buttons[k]);
      const a = s.axes.map(v => v.toFixed(2));
      ro.textContent = (on.length ? 'Pressionado: ' + on.join(' + ').toUpperCase() : 'Nenhum botão pressionado') +
        '  ·  L(' + a[0] + ', ' + a[1] + ')  R(' + a[2] + ', ' + a[3] + ')';
    });
    $('btn-continue').addEventListener('click', () => this.start());
    this.go('controller', { replace: true });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }
};
window.addEventListener('popstate', e => {
  const id = e.state && e.state.id; if (!id) return;
  const i = App.stack.lastIndexOf(id); if (i < 0) return;
  App.stack.length = i + 1; App._show(id);
});

/* ---------- Ações por data-action ---------- */
const Actions = {
  go: d => App.go(d.to),
  back: () => App.back(),
  'close-sheet': () => UI.closeSheet(),
  'open-game': d => Library.detail(d.id),
  play: d => Library.play(d.id),
  connect: () => Home.connectSheet(),
  device: () => Home.deviceSheet()
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && Actions[el.dataset.action]) Actions[el.dataset.action](el.dataset, el);
});

/* ---------- Tela inicial ---------- */
const Home = {
  render() {
    const u = User.get(); if (!u) return;
    const eff = Settings.effective();
    const recents = Store.get('recents', []).map(id => Library.byId(id)).filter(Boolean);
    const online = navigator.onLine;
    $('screen-home').innerHTML = `
      <header class="home-top">
        <div class="profile" data-action="go" data-to="settings">${User.avatarHTML(46)}
          <div><small>Bem-vindo de volta</small><strong>${UI.esc(u.name)}</strong></div></div>
        <div class="chip"><i class="dot ${online ? 'ok' : 'bad'}"></i>${online ? 'Online' : 'Offline'}</div>
      </header>
      <div class="hero" data-action="go" data-to="library"><div>
        <small>Biblioteca</small><h2>Seus jogos</h2>
        <p>${Library.GAMES.length} títulos de exemplo · execução real ainda não integrada</p>
        <span class="btn primary">Abrir biblioteca</span></div></div>
      <h3 class="sec">Jogos recentes</h3>
      ${recents.length ? `<div class="row">${recents.map(g => Library.card(g)).join('')}</div>`
        : `<div class="empty">Você ainda não abriu nenhum jogo. <button class="link" data-action="go" data-to="library">Ir para a biblioteca</button></div>`}
      <h3 class="sec">Disponíveis por streaming (integração pendente)</h3>
      <div class="row">${Library.GAMES.map(g => Library.card(g)).join('')}</div>
      <div class="tiles">
        <div class="tile" data-action="go" data-to="library"><b>▦</b><span>Biblioteca</span><small>Capas e compatibilidade</small></div>
        <div class="tile" data-action="connect"><b>⌁</b><span>Conectar a um PS5</span><small>${Store.get('ps5') ? 'Console salvo' : 'Salvar endereço do console'}</small></div>
        <div class="tile" data-action="go" data-to="settings"><b>⚙</b><span>Configurações</span><small>Qualidade, controles, dados</small></div>
        <div class="tile" data-action="device"><b>ⓘ</b><span>Dispositivo</span><small>Análise do seu celular</small></div>
      </div>
      <div class="card"><small class="muted">Transmissão recomendada para este aparelho</small>
        <h3 style="margin-top:4px">${UI.esc(eff.label)} · ~${eff.mbps} Mbps</h3></div>`;
  },

  deviceSheet() {
    const d = Store.get('device');
    if (!d) return UI.toast('Nenhuma análise salva ainda.');
    UI.sheet('Informações do dispositivo',
      `<dl class="kv">${DeviceAnalysis.rows(d).map(([k, v]) => `<dt>${UI.esc(k)}</dt><dd>${UI.esc(v)}</dd>`).join('')}</dl>
       ${d.limits.length ? `<h3 class="sec">Limitações detectadas</h3><ul class="muted small">${d.limits.map(l => `<li>${UI.esc(l)}</li>`).join('')}</ul>` : ''}`);
  },

  connectSheet() {
    const c = Store.get('ps5', { name: '', ip: '' });
    UI.sheet('Conectar a um PS5', `
      <p class="muted small">Navegadores não conseguem falar diretamente com um PS5 (o Remote Play usa protocolo próprio). Aqui você guarda o endereço do console para uso futuro por um servidor ponte compatível.</p>
      <label for="ps5-name">Nome do console</label>
      <input id="ps5-name" maxlength="24" placeholder="Meu PS5" value="${UI.esc(c.name)}">
      <label for="ps5-ip">Endereço IP na rede local</label>
      <input id="ps5-ip" inputmode="decimal" placeholder="192.168.0.10" value="${UI.esc(c.ip)}">
      <div class="err" id="ps5-err"></div>
      <div class="btns"><button class="btn primary" id="ps5-save">Salvar</button><button class="btn" id="ps5-clear">Remover</button></div>
      <p class="muted small" style="margin-top:12px">${c.ip ? 'Console salvo: ' + UI.esc(c.name || 'PS5') + ' (' + UI.esc(c.ip) + '). A conexão real ainda depende de um servidor ponte.' : 'Nenhum console salvo.'}</p>`);
    $('ps5-save').onclick = () => {
      const name = $('ps5-name').value.trim(), ip = $('ps5-ip').value.trim();
      const ok = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(n => +n <= 255);
      if (!ok) { $('ps5-err').textContent = 'Digite um IPv4 válido, por exemplo 192.168.0.10.'; return; }
      Store.set('ps5', { name: name || 'PS5', ip }); UI.toast('Console salvo'); UI.closeSheet(); Home.render();
    };
    $('ps5-clear').onclick = () => { Store.set('ps5', null); UI.toast('Console removido'); UI.closeSheet(); Home.render(); };
  }
};

$('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') UI.closeSheet(); });
window.addEventListener('online', () => { UI.toast('Conexão restabelecida'); if (App.current === 'home') Home.render(); });
window.addEventListener('offline', () => { UI.toast('Você está offline'); if (App.current === 'home') Home.render(); });
window.addEventListener('DOMContentLoaded', () => App.init());
