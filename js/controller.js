'use strict';
/* Controle virtual. Estado: { buttons:{nome:0|1}, axes:[lx,ly,rx,ry] } (eixos de -1 a 1). */
class Pad {
  constructor(root, onChange) {
    this.root = root; this.onChange = onChange || (() => {});
    this.state = { buttons: {}, axes: [0, 0, 0, 0] };
    this.build();
  }
  build() {
    const r = this.root; r.className = 'pad';
    r.innerHTML = `
      <button class="pb sh" data-b="l2">L2</button><button class="pb sh" data-b="l1">L1</button>
      <button class="pb sh" data-b="r2">R2</button><button class="pb sh" data-b="r1">R1</button>
      <button class="pb mini" data-b="create">CREATE</button><button class="pb mini" data-b="options">OPTIONS</button>
      <button class="pb psb" data-b="ps">PS</button>
      <div class="grp dpad">
        <button class="pb du" data-b="up">▲</button><button class="pb dd" data-b="down">▼</button>
        <button class="pb dl" data-b="left">◀</button><button class="pb dr" data-b="right">▶</button></div>
      <div class="grp face">
        <button class="pb f tri" data-b="triangle">△</button><button class="pb f crs" data-b="cross">✕</button>
        <button class="pb f sqr" data-b="square">□</button><button class="pb f cir" data-b="circle">○</button></div>
      <div class="stick" data-s="l"><div class="knob"></div></div>
      <div class="stick" data-s="r"><div class="knob"></div></div>
      <button class="pb l3" data-b="l3">L3</button><button class="pb r3" data-b="r3">R3</button>`;

    r.querySelectorAll('[data-b]').forEach(el => {
      const b = el.dataset.b;
      el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} this.set(b, 1); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => this.set(b, 0)));
      el.addEventListener('contextmenu', e => e.preventDefault());
    });

    r.querySelectorAll('.stick').forEach(st => {
      const knob = st.firstElementChild, i = st.dataset.s === 'l' ? 0 : 2; let pid = null;
      const upd = e => {
        const rc = st.getBoundingClientRect(), R = rc.width / 2, lim = R * .45;
        let dx = e.clientX - (rc.left + R), dy = e.clientY - (rc.top + R);
        const mag = Math.hypot(dx, dy);
        if (mag > lim) { dx *= lim / mag; dy *= lim / mag; }
        const sc = Settings.get().padScale || 1;
        knob.style.transform = `translate(${dx / sc}px,${dy / sc}px)`;
        let x = dx / lim, y = dy / lim;
        if (Math.hypot(x, y) < Settings.get().deadzone) { x = 0; y = 0; }
        this.state.axes[i] = +x.toFixed(3); this.state.axes[i + 1] = +y.toFixed(3); this.emit();
      };
      const end = () => { pid = null; st.classList.remove('drag'); knob.style.transform = ''; this.state.axes[i] = 0; this.state.axes[i + 1] = 0; this.emit(); };
      st.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { st.setPointerCapture(pid); } catch (_) {} st.classList.add('drag'); upd(e); });
      st.addEventListener('pointermove', e => { if (e.pointerId === pid) upd(e); });
      ['pointerup', 'pointercancel'].forEach(ev => st.addEventListener(ev, e => { if (e.pointerId === pid) end(); }));
    });
  }
  set(b, v) {
    if ((this.state.buttons[b] || 0) === v) return;
    this.state.buttons[b] = v;
    const el = this.root.querySelector(`[data-b="${b}"]`); if (el) el.classList.toggle('on', !!v);
    if (v) this.haptic();
    this.emit();
  }
  haptic() { if (Settings.get().vibration && navigator.vibrate) navigator.vibrate(12); }
  emit() { this.onChange(this.state); }
  reset() { Object.keys(this.state.buttons).forEach(b => this.set(b, 0)); }
}
