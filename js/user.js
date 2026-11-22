'use strict';
const User = {
  AV: [['#0070d1', '#00d2ff'], ['#7b2ff7', '#f107a3'], ['#00b09b', '#96c93d'], ['#f7971e', '#ffd200'], ['#ee0979', '#ff6a00'], ['#4568dc', '#b06ab3']],
  get() { return Store.get('user', null); },
  save(name, avatar) { Store.set('user', { name, avatar, created: (this.get() || {}).created || Date.now() }); },
  avatarHTML(size = 48) {
    const u = this.get() || { name: '?', avatar: 0 };
    const c = this.AV[u.avatar] || this.AV[0];
    return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .45)}px;background:linear-gradient(135deg,${c[0]},${c[1]})">${UI.esc((u.name[0] || '?').toUpperCase())}</span>`;
  },
  pickerHTML(sel) {
    return this.AV.map((c, i) => `<button type="button" class="av-opt${i === sel ? ' sel' : ''}" data-av="${i}" style="background:linear-gradient(135deg,${c[0]},${c[1]})" aria-label="Avatar ${i + 1}"></button>`).join('');
  },
  init() {
    let sel = 0; const box = $('avatar-pick');
    box.innerHTML = this.pickerHTML(0);
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-av]'); if (!b) return;
      sel = +b.dataset.av; box.innerHTML = this.pickerHTML(sel);
    });
    $('user-form').addEventListener('submit', e => {
      e.preventDefault();
      const n = $('user-name').value.trim().replace(/\s+/g, ' ');
      if (n.length < 2) { $('user-err').textContent = 'Digite um nome com pelo menos 2 caracteres.'; return; }
      $('user-err').textContent = '';
      this.save(n, sel);
      App.go('home', { replace: true });
    });
  }
};
