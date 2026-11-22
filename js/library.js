'use strict';
const Library = {
  METHODS: {
    remote: { name: 'PS5 Remote Play (via servidor ponte)', short: 'Remote Play', status: 'Indisponível nesta versão: requer um PS5 na sua rede e um servidor de streaming compatível.' },
    cloud: { name: 'Streaming em nuvem (provedor legítimo)', short: 'Nuvem', status: 'Indisponível nesta versão: nenhum provedor de streaming está integrado.' }
  },
  GAMES: [
    { id: 'neon-drift', title: 'Neon Drift', genre: 'Corrida', c: ['#ff2d95', '#3a0ca3'], method: 'remote', min: 2, desc: 'Corrida arcade por cidades futuristas banhadas em neon, com derrapagens e disputas contra rivais.' },
    { id: 'aether-knights', title: 'Aether Knights', genre: 'Aventura', c: ['#00c6ff', '#0072ff'], method: 'remote', min: 1, desc: 'Aventura de fantasia em ilhas flutuantes, com combates e exploração em mundo aberto.' },
    { id: 'void-runner', title: 'Void Runner', genre: 'Ação', c: ['#7b2ff7', '#1b1464'], method: 'cloud', min: 2, desc: 'Ação em primeira pessoa em estações espaciais abandonadas, cheia de reflexos e tiroteios rápidos.' },
    { id: 'skyline-fc', title: 'Skyline FC', genre: 'Esporte', c: ['#11998e', '#38ef7d'], method: 'cloud', min: 1, desc: 'Futebol de clubes fictícios com modo carreira e partidas rápidas.' },
    { id: 'deep-hollow', title: 'Deep Hollow', genre: 'Terror', c: ['#232526', '#6b0f1a'], method: 'remote', min: 2, desc: 'Terror de sobrevivência em cavernas escuras, onde cada som pode ser uma ameaça.' },
    { id: 'ember-tactics', title: 'Ember Tactics', genre: 'Estratégia', c: ['#f7971e', '#c33764'], method: 'cloud', min: 0, desc: 'Estratégia por turnos em campos de batalha em chamas, com unidades e habilidades personalizáveis.' }
  ],
  byId(id) { return this.GAMES.find(g => g.id === id); },

  cover(g) {
    const t = UI.esc(g.title);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${g.c[0]}'/><stop offset='1' stop-color='${g.c[1]}'/></linearGradient></defs><rect width='300' height='400' fill='url(#g)'/><circle cx='230' cy='90' r='120' fill='rgba(255,255,255,.12)'/><circle cx='40' cy='360' r='150' fill='rgba(0,0,0,.25)'/><text x='24' y='330' font-family='Arial' font-weight='800' font-size='30' fill='white'>${t}</text><text x='24' y='362' font-family='Arial' font-size='16' fill='rgba(255,255,255,.8)'>${g.genre.toUpperCase()}</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  },

  card(g) {
    return `<article class="gcard" data-action="open-game" data-id="${g.id}">
      <img class="cover" src="${this.cover(g)}" alt="Capa de ${UI.esc(g.title)}" loading="lazy">
      <div class="gmeta"><strong>${UI.esc(g.title)}</strong><small>${g.genre} · ${this.METHODS[g.method].short}</small></div></article>`;
  },

  compat(g) {
    const d = Store.get('device'); const have = d ? d.tierIndex : 0; const T = DeviceAnalysis.TIERS;
    return have >= g.min
      ? { ok: true, text: 'Compatível com a qualidade recomendada para o seu aparelho (' + T[have].label + ').' }
      : { ok: false, text: 'Pede ao menos ' + T[g.min].label + '; seu aparelho/rede recomenda ' + T[have].label + '.' };
  },

  renderGrid() {
    const q = ($('lib-search').value || '').trim().toLowerCase();
    const list = this.GAMES.filter(g => !q || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q));
    $('lib-grid').innerHTML = list.length ? list.map(g => this.card(g)).join('')
      : '<div class="empty" style="grid-column:1/-1">Nenhum jogo encontrado para esta busca.</div>';
  },

  detail(id) {
    const g = this.byId(id); if (!g) return;
    const m = this.METHODS[g.method], c = this.compat(g);
    $('screen-game').innerHTML = `
      <div class="topbar"><button class="icon-btn" data-action="back" aria-label="Voltar">‹</button><h2>${UI.esc(g.title)}</h2></div>
      <div class="gdetail">
        <img class="cover big" src="${this.cover(g)}" alt="Capa de ${UI.esc(g.title)}">
        <div class="ginfo">
          <span class="badge">Exemplo demonstrativo</span>
          <p>${UI.esc(g.desc)}</p>
          <dl class="kv">
            <dt>Gênero</dt><dd>${g.genre}</dd>
            <dt>Execução</dt><dd>${m.name}</dd>
            <dt>Status</dt><dd class="warn">${m.status}</dd>
            <dt>Compatibilidade</dt><dd class="${c.ok ? 'ok' : 'warn'}">${c.text}</dd>
          </dl>
          <button class="btn primary big" data-action="play" data-id="${g.id}">JOGAR</button>
          <small class="muted">JOGAR abre a tela de transmissão e tenta conectar. Sem integração configurada, ela mostra o erro correspondente.</small>
        </div>
      </div>`;
    App.go('game');
  },

  play(id) {
    const g = this.byId(id); if (!g) return;
    const r = Store.get('recents', []).filter(x => x !== id); r.unshift(id);
    Store.set('recents', r.slice(0, 8));
    Streaming.open(g);
  },

  init() { $('lib-search').addEventListener('input', () => this.renderGrid()); }
};
