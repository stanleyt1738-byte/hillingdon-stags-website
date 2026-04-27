/**
 * Hillingdon Stags FC — site script
 *
 * Loads JSON data from /data/ and renders it into the page.
 * Each render function is independent — if one fails, others still work.
 */

const DATA = {
  table:    '/data/league-table.json',
  fixtures: '/data/fixtures.json',
  results:  '/data/results.json',
  squad:    '/data/squad.json',
  meta:     '/data/meta.json',
};

// ---------- Tiny helpers --------------------------------------------------

const $ = (sel) => document.querySelector(sel);

const fmtDate = (iso) => {
  // "2026-05-03" -> "Sun 03 May"
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
};

const fmtSignedGD = (n) => (n > 0 ? `+${n}` : (n < 0 ? `−${Math.abs(n)}` : '0'));

const initials = (name) => {
  const stripped = name.replace(/\(.*?\)/g, '').trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

async function loadJson(url) {
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}`);
  return resp.json();
}

// ---------- Renderers -----------------------------------------------------

function renderNextFixture(fixtures) {
  const next = fixtures.next;
  if (!next) return;

  const home = next.home_away === 'home';
  const usName = 'Hillingdon Stags';

  $('#nf-date').textContent =
    `${fmtDate(next.date)} · ${next.kickoff} KO`;

  const leftTeam  = home ? usName : next.opponent;
  const rightTeam = home ? next.opponent : usName;
  const leftCrest = home ? 'HS' : (next.opponent_short || initials(next.opponent));
  const rightCrest = home ? (next.opponent_short || initials(next.opponent)) : 'HS';

  $('#nf-left-name').textContent  = leftTeam;
  $('#nf-right-name').textContent = rightTeam;
  $('#nf-left-crest').textContent  = leftCrest;
  $('#nf-right-crest').textContent = rightCrest;

  // Apply away styling to whichever side isn't us
  const leftCrestEl  = $('#nf-left-crest');
  const rightCrestEl = $('#nf-right-crest');
  leftCrestEl.classList.toggle('away', !home);
  rightCrestEl.classList.toggle('away', home);

  $('#nf-venue').textContent =
    home ? `Home · ${next.venue || 'TBC'}` : `Away · ${next.venue || 'TBC'}`;
  $('#nf-comp').textContent = next.competition;
}

function renderForm(results) {
  const form = results.form || [];
  if (!form.length) return;
  $('#nf-form').textContent = form.join(' ');
}

function renderResults(results) {
  const container = $('#results-list');
  if (!container) return;
  container.innerHTML = '';

  const recent = (results.recent || []).slice(0, 5);
  if (!recent.length) {
    container.innerHTML = '<div class="loading">No recent results yet.</div>';
    return;
  }

  for (const r of recent) {
    const home = r.home_away === 'home';
    const left  = home ? 'Hillingdon Stags' : r.opponent;
    const right = home ? r.opponent : 'Hillingdon Stags';
    const score = `${home ? r.us_score : r.them_score}–${home ? r.them_score : r.us_score}`;

    const cap = document.createElement('div');
    cap.className = 'competition';
    cap.textContent = `${fmtDate(r.date)} · ${r.competition || 'League'}`;
    container.appendChild(cap);

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="left ${home ? 'home-mark' : ''}">${left}</div>
      <div class="score">${score}</div>
      <div class="right ${home ? '' : 'home-mark'}">${right}</div>
    `;
    container.appendChild(row);
  }
}

function renderUpcoming(fixtures) {
  const container = $('#upcoming-list');
  if (!container) return;
  container.innerHTML = '';

  const upcoming = (fixtures.upcoming || []).slice(0, 5);
  if (!upcoming.length) {
    container.innerHTML = '<div class="loading">No upcoming fixtures yet.</div>';
    return;
  }

  for (const f of upcoming) {
    const home = f.home_away === 'home';
    const left  = home ? 'Hillingdon Stags' : f.opponent;
    const right = home ? f.opponent : 'Hillingdon Stags';

    const cap = document.createElement('div');
    cap.className = 'competition';
    cap.textContent = `${fmtDate(f.date)} · ${f.competition || 'League'}`;
    container.appendChild(cap);

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="left ${home ? 'home-mark' : ''}">${left}</div>
      <div class="date-time">${f.kickoff || 'TBC'}</div>
      <div class="right ${home ? '' : 'home-mark'}">${right}</div>
    `;
    container.appendChild(row);
  }
}

function renderLeagueTable(table) {
  const tbody = $('#league-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  const teams = table.teams || [];
  if (!teams.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No table data yet.</td></tr>';
    return;
  }

  for (const t of teams) {
    const tr = document.createElement('tr');
    if (t.is_us) tr.className = 'us';
    tr.innerHTML = `
      <td>${t.position}</td>
      <td class="team-cell">${t.is_us ? '★ ' : ''}${t.team}</td>
      <td>${t.played}</td>
      <td>${t.won}</td>
      <td>${t.drawn}</td>
      <td>${t.lost}</td>
      <td>${fmtSignedGD(t.goal_difference)}</td>
      <td class="pts">${t.points}</td>
    `;
    tbody.appendChild(tr);
  }

  // Update hero copy with current position
  const us = teams.find((t) => t.is_us);
  if (us) {
    const ord = (n) => {
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const pos = $('#hero-position');
    if (pos) pos.textContent = ord(us.position);
  }
}

function renderSquad(squad) {
  const container = $('#squad-grid');
  if (!container) return;
  container.innerHTML = '';

  const players = squad.players || [];
  if (!players.length) {
    container.innerHTML = '<div class="loading">Squad coming soon.</div>';
    return;
  }

  for (const p of players.slice(0, 4)) {
    const card = document.createElement('div');
    card.className = 'player-card';
    const photoStyle = p.photo
      ? `style="background-image:url('${p.photo}')" `
      : '';
    const photoClass = p.photo ? 'player-photo has-image' : 'player-photo';
    card.innerHTML = `
      <div class="${photoClass}" ${photoStyle}>
        ${p.photo ? '' : `<div class="player-num">${p.number ?? ''}</div>`}
      </div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-pos">${p.position || ''}</div>
      </div>
    `;
    container.appendChild(card);
  }
}

function renderLastUpdated(meta) {
  const el = $('#last-updated');
  if (!el || !meta.last_updated) return;
  const d = new Date(meta.last_updated);
  el.textContent = `Auto-updated ${d.toLocaleString('en-GB')} from Mitoo`;
}

// ---------- Boot ----------------------------------------------------------

async function safeRender(name, fn, url) {
  try {
    const data = await loadJson(url);
    fn(data);
  } catch (err) {
    console.warn(`[${name}] failed:`, err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const list = document.querySelector('nav ul');
      if (list) list.style.display = list.style.display === 'flex' ? '' : 'flex';
    });
  }

  // Render all sections in parallel — order doesn't matter
  Promise.allSettled([
    safeRender('table',    renderLeagueTable, DATA.table),
    safeRender('fixtures', renderNextFixture, DATA.fixtures),
    safeRender('upcoming', renderUpcoming,    DATA.fixtures),
    safeRender('results',  renderResults,     DATA.results),
    safeRender('form',     renderForm,        DATA.results),
    safeRender('squad',    renderSquad,       DATA.squad),
    safeRender('meta',     renderLastUpdated, DATA.meta),
  ]);
});
