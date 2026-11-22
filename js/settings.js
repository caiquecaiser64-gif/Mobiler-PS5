'use strict';
const Settings = {
  defaults: { quality: 'auto', resolution: 'auto', vibration: true, padScale: 1, padOpacity: 1, deadzone: 0.12, serverUrl: '' },
  get() { return Object.assign({}, this.defaults, Store.get('settings', {})); },
  set(k, v) { const s = this.get(); s[k] = v; Store.set('settings', s); this.apply(); },
  apply() {
    const s = this.get(), r = document.documentElement.style;
    r.setProperty('--pad-scale', s.padScale); r.setProperty('--pad-op', s.padOpacity);
  },
  effective() {
    const d = Store.get('device'), s = this.get();
    let t = Object.assign({}, d ? d.tier : DeviceAnalysis.TIERS[0]);
    const q = { eco: 0, bal: 1, high: 2 }[s.quality];
    if (q !== undefined) t = Object.assign({}, DeviceAnalysis.TIERS[q]);
    if (s.resolution !== 'auto') t.res = s.resolution;
    t.label = t.res + ' · ' + t.fps + ' FPS';
    return t;
  },

  render() {
    const s = this.get(), u = User.get(), d = Store.get('device'), eff = this.effective();
    const vib = 'vibrate' in navigator;
    const sel = (k, opts) => `<select data-set="${k}">${opts.map(([v, l]) => `<option value="${v}"${s[k] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    const range = (k, min, max, step) => `<input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><output>${k === 'deadzone' ? Math.round(s[k] * 100) + '%' : Math.round(s[k] * 100) + '%'}</output>`;
    $('screen-settings').innerHTML = `
      <div class="topbar"><button class="icon-btn" data-action="back" aria-label="Voltar">‹</button><h2>Configurações</h2></div>

      <div class="sec-title">Perfil</div>
      <div class="card">
        <label for="set-name" style="margin-top:0">Nome do usuário</label>
        <input id="set-name" maxlength="16" value="${UI.esc(u ? u.name : '')}">
        <div class="avatars" id="set-av" style="margin-top:12px">${User.pickerHTML(u ? u.avatar : 0)}</div>
        <div class="btns"><button class="btn primary" id="set-save-name">Salvar nome</button></div>
      </div>

      <div class="sec-title">Transmissão</div>
      <div class="card">
        <div class="srow"><span>Qualidade</span>${sel('quality', [['auto', 'Automática'], ['eco', 'Economia (720p·30)'], ['bal', 'Equilibrada (1080p·30)'], ['high', 'Alta (1080p·60)']])}</div>
        <div class="srow"><span>Resolução</span>${sel('resolution', [['auto', 'Automática'], ['720p', '720p'], ['1080p', '1080p'], ['1440p', '1440p']])}</div>
        <p class="muted small" style="padding:8px 0">Recomendado para este aparelho: <b>${UI.esc(d ? d.tier.label : 'sem análise')}</b>. Em uso: <b>${UI.esc(eff.label)}</b>.</p>
        <label for="set-server" style="margin-top:4px">Servidor de streaming (WebSocket, opcional)</label>
        <input id="set-server" data-set="serverUrl" placeholder="wss://seu-servidor.exemplo/stream" value="${UI.esc(s.serverUrl)}" inputmode="url" autocapitalize="off">
      </div>

      <div class="sec-title">Controles</div>
      <div class="card">
        <div class="srow"><span>Vibração${vib ? '' : ' (não suportada aqui)'}</span><label class="sw"><input type="checkbox" data-set="vibration" ${s.vibration ? 'checked' : ''} ${vib ? '' : 'disabled'}><span></span></label></div>
        <div class="srow"><span>Tamanho</span>${range('padScale', .7, 1, .05)}</div>
        <div class="srow"><span>Opacidade</span>${range('padOpacity', .4, 1, .05)}</div>
        <div class="srow"><span>Zona morta</span>${range('deadzone', 0, .4, .02)}</div>
        ${vib ? '<div class="btns"><button class="btn" id="set-vib">Testar vibração</button></div>' : ''}
      </div>

      <div class="sec-title">Dispositivo</div>
      <div class="card">
        ${d ? `<dl class="kv">${DeviceAnalysis.rows(d).map(([k, v]) => `<dt>${UI.esc(k)}</dt><dd>${UI.esc(v)}</dd>`).join('')}</dl>` : '<p class="muted">Nenhuma análise salva.</p>'}
        <div class="btns"><button class="btn" id="set-reanalyze">Analisar novamente</button></div>
      </div>

      <div class="sec-title">Dados</div>
      <div class="card"><div class="btns" style="margin-top:0">
        <button class="btn danger" id="set-clear">Limpar dados locais</button>
        <button class="btn" id="set-restart">Reiniciar aplicativo</button></div></div>`;

    $('screen-settings').querySelectorAll('[data-set]').forEach(el => {
      const ev = el.type === 'range' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        const k = el.dataset.set;
        let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value.trim();
        if (k === 'serverUrl' && v && !/^wss?:\/\/.+/i.test(v)) { UI.toast('Use um endereço ws:// ou wss://'); el.value = Settings.get().serverUrl; return; }
        Settings.set(k, v);
        if (el.type === 'range') { const o = el.parentElement.querySelector('output'); if (o) o.textContent = Math.round(v * 100) + '%'; }
        if (k === 'quality' || k === 'resolution') this.render();
      });
    });
    $('set-av').addEventListener('click', e => {
      const b = e.target.closest('[data-av]'); if (!b || !u) return;
      User.save(u.name, +b.dataset.av); this.render();
    });
    $('set-save-name').onclick = () => {
      const n = $('set-name').value.trim().replace(/\s+/g, ' ');
      if (n.length < 2) return UI.toast('Digite um nome com pelo menos 2 caracteres.');
      User.save(n, (User.get() || {}).avatar || 0); UI.toast('Nome salvo'); this.render();
    };
    if ($('set-vib')) $('set-vib').onclick = () => navigator.vibrate([60, 40, 60]);
    $('set-reanalyze').onclick = async () => {
      UI.toast('Analisando dispositivo...'); await DeviceAnalysis.analyze(); this.render(); UI.toast('Análise atualizada');
    };
    $('set-clear').onclick = () => {
      if (confirm('Apagar nome, preferências, histórico e análise deste aparelho?')) {
        Store.clearAll(); UI.toast('Dados apagados'); setTimeout(() => location.reload(), 700);
      }
    };
    $('set-restart').onclick = () => location.reload();
  }
};
