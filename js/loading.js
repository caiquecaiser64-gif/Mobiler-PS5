'use strict';
const Loading = {
  MSGS: [
    'Inicializando Mobile PS5...', 'Identificando dispositivo...', 'Analisando capacidade de memória...',
    'Verificando resolução da tela...', 'Analisando desempenho gráfico disponível...', 'Verificando conexão de internet...',
    'Calculando configurações recomendadas...', 'Preparando experiência para este dispositivo...', 'Inicialização concluída!'
  ],
  async run() {
    const msg = $('load-msg'), bar = $('load-bar'), pct = $('load-pct'), log = $('load-log');
    log.innerHTML = ''; let prev = null;
    const hook = async i => {
      if (prev !== null) { const li = document.createElement('li'); li.textContent = this.MSGS[prev]; log.appendChild(li); }
      prev = i;
      msg.textContent = this.MSGS[i]; msg.style.animation = 'none'; void msg.offsetWidth; msg.style.animation = '';
      const p = Math.round((i + 1) / this.MSGS.length * 100);
      bar.style.width = p + '%'; pct.textContent = p + '%';
      await wait(i === 8 ? 500 : 420 + Math.random() * 250);
    };
    const d = await DeviceAnalysis.analyze(hook);
    const s = document.createElement('div');
    s.className = 'load-summary';
    s.textContent = 'Qualidade recomendada: ' + d.tier.label;
    $('screen-loading').appendChild(s);
    await wait(700);
    s.remove();
    return d;
  }
};
