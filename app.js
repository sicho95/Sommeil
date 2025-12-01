// =====================
// INITIALISATION APP
// =====================

// Variables globales
let currentChild = 'default';
let currentDate = getTodayDate();
let data = {};

// Démarre l'application dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', startupApp);

// =====================
// 1. BOOT + EVENTS
// =====================

function startupApp() {
  setThemeFromPrefs();
  setChildFromPrefs();
  setDateToToday();
  hydrateUI();
  bindEvents();
  
  // Lance la synchro backend et les stats en arrière-plan
  setTimeout(() => {
    fetchDayData();
    fetchChildrenList();
    updateStatsTabs('day');
  }, 100);
}

// =====================
// 2. PREFERENCES
// =====================

// Applique le thème stocké en mémoire locale
function setThemeFromPrefs() {
  const prefs = getPrefs();
  document.documentElement.setAttribute('data-theme', prefs.theme || 'auto');
}

// Sélectionne l'enfant stocké en mémoire locale
function setChildFromPrefs() {
  const prefs = getPrefs();
  currentChild = prefs.lastChild || 'default';
  document.getElementById('childSelect').value = currentChild;
}

// Positionne la date sur aujourd'hui
function setDateToToday() {
  currentDate = getTodayDate();
  setDateUI(currentDate);
}

// Récupère les préférences depuis localStorage
function getPrefs() {
  return JSON.parse(localStorage.getItem('sommeil_prefs') || '{}');
}

// =====================
// 3. HYDRATATION UI
// =====================

// Remplit l'interface avec les données du jour
function hydrateUI() {
  hydrateDayInputs();
  setStatsTabActive('day');
}

// Charge les données du jour depuis localStorage et remplit les inputs
function hydrateDayInputs() {
  data = getDayDataLocal();
  fillInputs(data);
}

// Remplit tous les champs avec l'objet de données fourni
function fillInputs(obj) {
  setInputValue('bedtime', obj.bedtime);
  setInputValue('wakeCount', obj.wakeCount);
  setInputValue('napCount', obj.napCount);
  setInputValue('napDuration', obj.napDuration);
  setInputValue('mealQuality', obj.mealQuality || 'Bien');
  setInputChecked('noNaps', isNoNap(obj));
  setInputChecked('noWakes', isNoWake(obj));
  toggleNapInputs();
  toggleWakeInputs();
}

// Active visuellement l'onglet stats correspondant
function setStatsTabActive(period) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`.tab[data-period="${period}"]`).classList.add('active');
}

// =====================
// 4. EVENTS
// =====================

// Attache tous les événements aux éléments
function bindEvents() {
  listen('childSelect', 'change', onChildChange);
  listen('prevDay', 'click', () => changeDate(-1));
  listen('nextDay', 'click', () => changeDate(1));
  listen('noNaps', 'change', toggleNapInputs);
  listen('noWakes', 'change', toggleWakeInputs);
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => updateStatsTabs(tab.dataset.period))
  );
  document.querySelectorAll('input, select').forEach(el =>
    el.addEventListener('change', persistDayData)
  );
}

// Attache un événement à un élément par ID
function listen(id, evt, fn) {
  document.getElementById(id).addEventListener(evt, fn);
}

// Gère le changement d'enfant sélectionné
function onChildChange(e) {
  currentChild = e.target.value;
  savePrefs();
  hydrateDayInputs();
}

// =====================
// 5. LOCALSTORAGE
// =====================

// Récupère les données du jour depuis localStorage
function getDayDataLocal() {
  return JSON.parse(localStorage.getItem(dayKey()) || '{}');
}

// Sauvegarde les données du jour en localStorage
function persistDayData() {
  data = grabInputs();
  localStorage.setItem(dayKey(), JSON.stringify(data));
  updateStatsTabs(getCurrentStatsTab());
}

// Génère la clé localStorage pour le jour actuel
function dayKey() {
  return `sommeil_${currentChild}_${currentDate}`;
}

// Sauvegarde les préférences utilisateur
function savePrefs() {
  localStorage.setItem('sommeil_prefs', JSON.stringify({
    lastChild: currentChild,
    theme: document.documentElement.getAttribute('data-theme')
  }));
}

// =====================
// 6. INPUTS HELPERS
// =====================

// Récupère toutes les valeurs des inputs
function grabInputs() {
  return {
    bedtime: getInputValue('bedtime'),
    wakeCount: isNoWake() ? 0 : toInt(getInputValue('wakeCount')),
    napCount: isNoNap() ? 0 : toInt(getInputValue('napCount')),
    napDuration: isNoNap() ? '' : getInputValue('napDuration'),
    mealQuality: getInputValue('mealQuality')
  };
}

// Définit la valeur d'un input par ID
function setInputValue(id, val) {
  document.getElementById(id).value = val || '';
}

// Récupère la valeur d'un input par ID
function getInputValue(id) {
  return document.getElementById(id)?.value ?? '';
}

// Coche ou décoche une checkbox par ID
function setInputChecked(id, bool) {
  document.getElementById(id).checked = !!bool;
}

// Vérifie si l'objet indique "aucune sieste"
function isNoNap(obj = data) {
  return obj.napCount === 0 && !obj.napDuration;
}

// Vérifie si l'objet indique "aucun réveil"
function isNoWake(obj = data) {
  return obj.wakeCount === 0;
}

// Convertit une valeur en entier
function toInt(val) {
  return parseInt(val, 10) || 0;
}

// Affiche/masque les inputs de sieste selon le slider "Aucune"
function toggleNapInputs() {
  ['napCount', 'napDuration'].forEach(id => {
    document.getElementById(id).style.display = isNoNap() ? 'none' : 'inline';
  });
}

// Affiche/masque l'input de réveils selon le slider "Aucune"
function toggleWakeInputs() {
  document.getElementById('wakeCount').style.display =
    isNoWake() ? 'none' : 'inline';
}

// =====================
// 7. DATE MANAGEMENT
// =====================

// Retourne la date du jour au format ISO
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Affiche la date formatée dans l'interface
function setDateUI(dateStr) {
  document.getElementById('currentDate').textContent = formatDate(dateStr);
}

// Change la date de N jours (positif = futur, négatif = passé)
function changeDate(offset) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + offset);
  currentDate = d.toISOString().split('T')[0];
  setDateUI(currentDate);
  hydrateDayInputs();
  updateStatsTabs('day');
}

// =====================
// 8. STATS & TABS
// =====================

// Met à jour l'affichage des statistiques selon la période
function updateStatsTabs(period) {
  setStatsTabActive(period);
  const dates = (period === 'week') ? getWeekDates() :
                (period === 'month') ? getMonthDates() :
                [currentDate];
  const stats = getStatsAverages(dates);
  document.getElementById('statsDisplay').innerHTML = makeStatsHTML(stats);
}

// Récupère l'onglet stats actif
function getCurrentStatsTab() {
  return document.querySelector('.tab.active').dataset.period;
}

// Génère le HTML pour l'affichage des stats
function makeStatsHTML(stats) {
  return `
    <div class="stats-grid">
      <div>Sommeil Total: ${stats.sleepTotal}h</div>
      <div>Siestes: ${stats.naps}</div>
      <div>Réveils: ${stats.wakes}</div>
      <div>Qualité Nuit: ${stats.nightQuality}</div>
    </div>
  `;
}

// Calcule les moyennes pour un tableau de dates
function getStatsAverages(dateArr) {
  let totalSleep = 0, totalNaps = 0, totalWakes = 0, count = 0;
  dateArr.forEach(date => {
    const d = JSON.parse(localStorage.getItem(`sommeil_${currentChild}_${date}`) || '{}');
    if (d.bedtime !== undefined) {
      totalSleep += computeSleepHours(d);
      totalNaps += d.napCount || 0;
      totalWakes += d.wakeCount || 0;
      count++;
    }
  });
  return {
    sleepTotal: count ? (totalSleep / count).toFixed(1) : 0,
    naps: count ? (totalNaps / count).toFixed(1) : 0,
    wakes: count ? (totalWakes / count).toFixed(1) : 0,
    nightQuality: count === 0 ? '-' :
      totalWakes / count <= 1 ? '🟢 Bonne'
      : totalWakes / count <= 3 ? '🟡 Moyenne'
      : '🔴 Mauvaise'
  };
}

// Retourne les 7 derniers jours (semaine)
function getWeekDates() {
  const res = [];
  const today = new Date(currentDate);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    res.push(d.toISOString().split('T')[0]);
  }
  return res;
}

// Retourne les 30 derniers jours du mois courant
function getMonthDates() {
  const today = new Date(currentDate);
  const yearMonth = today.toISOString().slice(0, 7);
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Array.from({length: Math.min(30, dim)}, (_, idx) =>
    `${yearMonth}-${(dim - 29 + idx).toString().padStart(2, '0')}`
  );
}

// Calcule les heures totales de sommeil pour un jour
function computeSleepHours(d) {
  // À adapter selon la logique réelle (coucher + lever + siestes)
  let total = 0;
  if (d.bedtime) total += 10; // Placeholder
  if (!isNoNap(d) && d.napDuration)
    total += parseFloat(d.napDuration) || 0;
  return total;
}

// =====================
// 9. BACKEND API : /api/suivi-bebe/
// =====================

// Récupère les données d'un jour depuis l'API
function fetchDayData() {
  fetch(`/api/suivi-bebe/day?child=${currentChild}&date=${currentDate}`)
    .then(r => r.json())
    .then(j => {
      if (j && typeof j === 'object') {
        localStorage.setItem(dayKey(), JSON.stringify(j));
        hydrateDayInputs();
      }
    })
    .catch(() => { /* Mode offline, ignore l'erreur */ });
}

// Récupère la liste des enfants depuis l'API
function fetchChildrenList() {
  fetch('/api/suivi-bebe/children')
    .then(r => r.json())
    .then(arr => {
      if (Array.isArray(arr)) fillChildDropdown(arr);
    })
    .catch(() => { /* Ignore si offline */ });
}

// Remplit le dropdown avec la liste d'enfants
function fillChildDropdown(arr) {
  const sel = document.getElementById('childSelect');
  sel.innerHTML = '';
  arr.forEach(obj =>
    sel.appendChild(new Option(obj.name, obj.id))
  );
}

// =====================
// 10. DIVERS
// =====================

// Formate une date ISO en français lisible
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

// Enregistre le Service Worker pour PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
