// Leonida Trophy Guide: an offline checklist for GTA VI's 55 trophies.
// Progress lives in localStorage, exports to a file and imports back.
// The trophy data (names, descriptions, grades, guides, sources) comes
// from app/data/trophies.json, the only file this app fetches at run time.
const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';

const ROADMAP_STAGES = [
  { stage: 1, title: 'Play the story', text: 'Chapters 1 to 4 and the final mission. All 12 story trophies are unmissable — just finish the missions. Do Lucia\u2019s Chapter 1 meditation before the chapter ends (see Positive Mental Attitude), and keep a manual save at the start of each chapter: there is no mission replay.' },
  { stage: 2, title: 'Strangers & side stories', text: 'Finish the stranger mission strands — Andy, Kenton, Billy, Randy and Tyrone each have a final-mission trophy, Bret has a hunting job, and eight strands in total earn Strangers & Freaks. Strands are marked on the map and can be done any time.' },
  { stage: 3, title: 'Activities & skills', text: 'The long middle: 42 shooting-range golds, 250 stunts, 20 race wins, drone races at all 14 Top Fun locations, 50 challenges, fishing, arcade, bowling, the partner robberies and the one-off moments. Clear The Shootist before Gunslinger — ranges raise your Focus level.' },
  { stage: 4, title: 'Collectibles & exploration', text: 'Meditate at all 18 spots (the Chapter 1 one first!), complete 3 card sets, WAiNK It at 100 locations, discover 100 vehicles, explore every corner of Leonida, and buy the 8 garages once the Real Estate app opens in Chapter 2.' },
  { stage: 5, title: 'Money & the road to platinum', text: 'Rob 5 bank vaults (8 for 100%), one illegal operation per gang (all 39 for 100%), an armored truck, launder $250,000 of marked bills and spend $100,000 in shops. Then clear the 35-task 100% checklist for A Long Road — and the Platinum pops with it.' },
];

const KIND_LABELS = {
  all: 'All kinds',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

const listEl = document.getElementById('trophyList');
const roadmapEl = document.getElementById('roadmapList');
const sourceListEl = document.getElementById('sourceList');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilerToggle = document.getElementById('spoiler');
const earnedOnlyToggle = document.getElementById('earnedOnly');
const kindButtonsEl = document.getElementById('kindButtons');
const emptyNote = document.getElementById('emptyNote');
const dataNote = document.getElementById('dataNote');

let doc = null;
let earned = loadProgress();
let spoiler = loadSpoiler();
let kindFilter = 'all';
let openId = null;

const params = new URLSearchParams(location.search);
if (params.get('kind') && KIND_LABELS[params.get('kind')]) kindFilter = params.get('kind');
if (params.get('spoiler') === '1') spoiler = true;
if (params.get('open')) openId = Number(params.get('open'));
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
}

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

function loadSpoiler() {
  try {
    return localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    return false;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort()));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

function isSpoilerHidden(trophy) {
  return spoiler && trophy.kind === 'story' && !earned.has(trophy.name);
}

function trophyMatches(trophy) {
  if (gradeSelect.value !== 'all' && trophy.grade !== gradeSelect.value) return false;
  if (kindFilter === 'missable' && !trophy.missable) return false;
  if (kindFilter === 'online') return false; // the list has no online trophies
  if (kindFilter !== 'all' && kindFilter !== 'missable' && trophy.kind !== kindFilter) return false;
  if (earnedOnlyToggle.checked && !earned.has(trophy.name)) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (q && !(trophy.name.toLowerCase().includes(q) || trophy.description.toLowerCase().includes(q) || trophy.guide.toLowerCase().includes(q))) return false;
  return true;
}

function gradeBadge(grade) {
  const span = document.createElement('span');
  span.className = 'grade grade-' + grade;
  span.textContent = grade;
  return span;
}

function kindChip(trophy) {
  const span = document.createElement('span');
  span.className = 'chip chip-kind';
  span.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
  return span;
}

function missableFlag(trophy) {
  if (!trophy.missable) return null;
  const span = document.createElement('span');
  span.className = 'chip chip-missable';
  span.textContent = 'Possibly missable';
  span.title = 'The only trophy reported as possibly missable — see its guide.';
  return span;
}

function sourceLinks(sources) {
  const wrap = document.createElement('div');
  wrap.className = 'sources-inline';
  const label = document.createElement('span');
  label.className = 'sources-label';
  label.textContent = 'Sources: ';
  wrap.append(label);
  sources.forEach((s, i) => {
    if (i > 0) wrap.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    wrap.append(a);
  });
  return wrap;
}

function buildTrophyCard(trophy) {
  const article = document.createElement('article');
  article.className = 'trophy-card' + (earned.has(trophy.name) ? ' earned' : '');
  article.dataset.trophyId = String(trophy.id);

  const head = document.createElement('div');
  head.className = 'card-head';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'earn-box';
  box.checked = earned.has(trophy.name);
  box.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
  box.addEventListener('change', () => {
    const wasHidden = isSpoilerHidden(trophy);
    if (box.checked) earned.add(trophy.name);
    else earned.delete(trophy.name);
    saveProgress();
    renderProgress();
    renderRoadmap();
    // Reveal a spoiler-hidden story trophy in place: only a full re-render
    // shows its name, so re-render then; otherwise just flip this card's
    // earned state so the list keeps its scroll position and focus.
    if (wasHidden && box.checked) {
      renderList();
    } else {
      article.classList.toggle('earned', box.checked);
    }
  });
  head.append(box);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-titles';
  const hidden = isSpoilerHidden(trophy);
  const nameEl = document.createElement('h3');
  nameEl.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  titleWrap.append(nameEl);
  const descEl = document.createElement('p');
  descEl.className = 'official-desc';
  descEl.textContent = hidden ? 'Hidden until earned — turn off “Hide story spoilers” to reveal it, or tick it earned.' : trophy.description;
  titleWrap.append(descEl);
  head.append(titleWrap);

  const badges = document.createElement('div');
  badges.className = 'badges';
  badges.append(gradeBadge(trophy.grade));
  badges.append(kindChip(trophy));
  const flag = missableFlag(trophy);
  if (flag) badges.append(flag);
  head.append(badges);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  toggle.setAttribute('aria-expanded', String(openId === trophy.id));
  toggle.textContent = openId === trophy.id ? 'Hide guide ▲' : 'Show guide ▼';
  toggle.addEventListener('click', () => {
    openId = openId === trophy.id ? null : trophy.id;
    renderList();
  });
  head.append(toggle);

  article.append(head);

  if (openId === trophy.id && !hidden) {
    const body = document.createElement('div');
    body.className = 'card-body';
    const guideEl = document.createElement('p');
    guideEl.className = 'guide';
    guideEl.textContent = trophy.guide;
    body.append(guideEl);
    if (Array.isArray(trophy.steps) && trophy.steps.length) {
      const ol = document.createElement('ol');
      ol.className = 'steps';
      for (const step of trophy.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        ol.append(li);
      }
      body.append(ol);
    }
    if (Array.isArray(trophy.sources) && trophy.sources.length) {
      body.append(sourceLinks(trophy.sources));
    }
    article.append(body);
  } else if (openId === trophy.id && hidden) {
    const body = document.createElement('div');
    body.className = 'card-body';
    const p = document.createElement('p');
    p.className = 'guide';
    p.textContent = 'This story trophy is hidden while spoiler mode is on. Earn it in-game (or tick it earned here) to reveal its guide and sources.';
    body.append(p);
    article.append(body);
  }

  return article;
}

function renderProgress() {
  const total = doc.trophies.length;
  const done = doc.trophies.filter((t) => earned.has(t.name)).length;
  progressFill.style.width = total ? (100 * done / total).toFixed(1) + '%' : '0%';
  progressText.textContent = done + ' of ' + total + ' earned' + (done === total ? ' — Platinum! You\u2019re a Leonida Legend.' : '');
}

function renderRoadmap() {
  roadmapEl.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const li = document.createElement('li');
    li.className = 'roadmap-stage';
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + stage.stage + ' — ' + stage.title;
    li.append(h);
    const p = document.createElement('p');
    p.textContent = stage.text;
    li.append(p);
    const names = doc.trophies.filter((t) => t.roadmap_stage === stage.stage);
    const count = document.createElement('p');
    count.className = 'stage-count';
    const got = names.filter((t) => earned.has(t.name)).length;
    count.textContent = got + ' / ' + names.length + ' earned in this stage';
    li.append(count);
    const chips = document.createElement('p');
    chips.className = 'stage-trophies';
    names.forEach((t, i) => {
      if (i > 0) chips.append(document.createTextNode(' · '));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-link' + (earned.has(t.name) ? ' done' : '');
      b.textContent = isSpoilerHidden(t) ? '???' : t.name;
      b.addEventListener('click', () => {
        openId = t.id;
        kindFilter = 'all';
        gradeSelect.value = 'all';
        searchInput.value = '';
        renderKindButtons();
        renderList();
        document.querySelector('[data-trophy-id="' + t.id + '"]')?.scrollIntoView({ block: 'center' });
      });
      chips.append(b);
    });
    li.append(chips);
    roadmapEl.append(li);
  }
}

function renderSources() {
  sourceListEl.replaceChildren();
  for (const s of doc.sources_index ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    sourceListEl.append(li);
  }
}

function renderKindButtons() {
  kindButtonsEl.replaceChildren();
  for (const [key, label] of Object.entries(KIND_LABELS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kind-btn' + (kindFilter === key ? ' active' : '');
    b.textContent = label;
    b.setAttribute('aria-pressed', String(kindFilter === key));
    b.addEventListener('click', () => {
      kindFilter = key;
      renderKindButtons();
      renderList();
    });
    kindButtonsEl.append(b);
  }
}

function renderList() {
  listEl.replaceChildren();
  const shown = doc.trophies.filter(trophyMatches);
  if (kindFilter === 'online') {
    emptyNote.hidden = false;
    emptyNote.textContent = 'No online trophies: all 55 trophies in this list are single-player. Nothing to track here.';
  } else if (shown.length === 0) {
    emptyNote.hidden = false;
    emptyNote.textContent = 'No trophies match these filters. Try clearing the search or choosing another kind or grade.';
  } else {
    emptyNote.hidden = true;
  }
  for (const trophy of shown) {
    listEl.append(buildTrophyCard(trophy));
  }
  renderRoadmap();
}

function renderAll() {
  renderProgress();
  renderKindButtons();
  renderSources();
  renderList();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported_at: new Date().toISOString(), earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
  dataNote.textContent = 'Exported ' + earned.size + ' earned trophies.';
}

async function importProgress(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names)) throw new Error('not a progress file');
    const known = new Set(doc.trophies.map((t) => t.name));
    const clean = names.filter((n) => typeof n === 'string' && known.has(n));
    earned = new Set(clean);
    saveProgress();
    renderAll();
    dataNote.textContent = 'Imported ' + clean.length + ' earned trophies.';
  } catch {
    dataNote.textContent = 'That file is not a progress export from this guide.';
  }
}

document.getElementById('export').addEventListener('click', exportProgress);
document.getElementById('import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importProgress(file);
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies?')) {
    earned = new Set();
    saveProgress();
    renderAll();
    dataNote.textContent = 'Progress reset.';
  }
});
searchInput.addEventListener('input', renderList);
gradeSelect.addEventListener('change', renderList);
earnedOnlyToggle.addEventListener('change', renderList);
spoilerToggle.addEventListener('change', () => {
  spoiler = spoilerToggle.checked;
  saveSpoiler();
  renderList();
});

spoilerToggle.checked = spoiler;

async function initGuide() {
  const res = await fetch('data/trophies.json');
  doc = await res.json();
  renderAll();
}

await initGuide();
