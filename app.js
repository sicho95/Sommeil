// ÉTAT GLOBAL
let currentChild = 'default';
let currentDate = new Date().toISOString().split('T')[0];
let data = {};

// INITIALISATION SYNCHRONE (zéro écran blanc)
document.addEventListener('DOMContentLoaded', () => {
  const prefs = JSON.parse(localStorage.getItem('sommeil_prefs') || '{}');
  currentChild = prefs.lastChild || 'default';
  currentDate = new Date().toISOString().split('T')[0];
  
  // UI IMMÉDIATE
  document.getElementById('childSelect').value = currentChild;
  document.getElementById('currentDate').textContent = formatDate(currentDate);
  loadDayData();
  
  // Événements
  setupEventListeners();
  
  // ARRIÈRE-PLAN (100ms après)
  setTimeout(() => {
    syncBackend();
    updateStats('day');
  }, 100);
});

function setupEventListeners() {
  // Enfant
  document.getElementById('childSelect').addEventListener('change', (e) => {
    currentChild = e.target.value;
    savePrefs();
    loadDayData();
  });
  
  // Navigation dates
  document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
  document.getElementById('nextDay').addEventListener('click', () => changeDate(1));
  
  // Sliders "Aucune"
  document.getElementById('noNaps').addEventListener('change', toggleNapInputs);
  document.getElementById('noWakes').addEventListener('change', toggleWakeInputs);
  
  // Tabs Stats
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelector('.tab.active').classList.remove('active');
      e.target.classList.add('active');
      updateStats(e.target.dataset.period);
    });
  });
  
  // Auto-save TOUS les inputs
  document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', saveDayData);
  });
}

function loadDayData() {
  const saved = localStorage.getItem(`sommeil_${currentChild}_${currentDate}`);
  data = saved ? JSON.parse(saved) : {};
  populateInputs();
}

function saveDayData() {
  data = readInputs();
  localStorage.setItem(`sommeil_${currentChild}_${currentDate}`, JSON.stringify(data));
  updateStats('day');
}

function readInputs() {
  const noNaps = document.getElementById('noNaps').checked;
  const noWakes = document.getElementById('noWakes').checked;
  
  return {
    bedtime: document.getElementById('bedtime').value,
    wakeCount: noWakes ? 0 : parseInt(document.getElementById('wakeCount').value) || 0,
    napCount: noNaps ? 0 : parseInt(document.getElementById('napCount').value) || 0,
    napDuration: noNaps ? '' : document.getElementById('napDuration').value,
    mealQuality: document.getElementById('mealQuality').value
  };
}

function populateInputs() {
  document.getElementById('bedtime').value = data.bedtime || '';
  document.getElementById('wakeCount').value = data.wakeCount || '';
  document.getElementById('napCount').value = data.napCount || '';
  document.getElementById('napDuration').value = data.napDuration || '';
  document.getElementById('mealQuality').value = data.mealQuality || 'Bien';
  
  // Sliders selon données
  document.getElementById('noNaps').checked = data.napCount === 0 && !data.napDuration;
  document.getElementById('noWakes').checked = data.wakeCount === 0;
  
  toggleNapInputs();
  toggleWakeInputs();
}

function toggleNapInputs() {
  const inputs = document.querySelectorAll('#napCount, #napDuration');
  const display = document.getElementById('noNaps').checked ? 'none' : 'inline';
  inputs.forEach(input => input.style.display = display);
}

function toggleWakeInputs() {
  document.getElementById('wakeCount').style.display = 
    document.getElementById('noWakes').checked ? 'none' : 'inline';
}

function updateStats(period) {
  const dates = period === 'week' ? getWeekDates() : 
                period === 'month' ? getMonthDates() : [currentDate];
  const stats = calculateAverages(dates);
  
  document.getElementById('statsDisplay').innerHTML = `
    <div class="stats-grid">
      <div>Sommeil Total: ${stats.sleepTotal}h</div>
      <div>Siestes: ${stats.naps}</div>
      <div>Réveils: ${stats.wakes}</div>
      <div>Qualité Nuit: ${stats.nightQuality}</div>
    </div>
  `;
}

function calculateAverages(dates) {
  let totalSleep = 0, totalNaps = 0, totalWakes = 0, count = 0;
  
  dates.forEach(date => {
    const dayData = JSON.parse(localStorage.getItem(`sommeil_${currentChild}_${date}`) || '{}');
    if (dayData.bedtime !== undefined) {
      totalSleep += calculateSleepHours(dayData);
      totalNaps += dayData.napCount || 0;
      totalWakes += dayData.wakeCount || 0;
      count++;
    }
  });
  
  return {
    sleepTotal: count ? (totalSleep / count).toFixed(1) : 0,
    naps: count ? (totalNaps / count).toFixed(1) : 0,
    wakes: count ? (totalWakes / count).toFixed(1) : 0,
    nightQuality: totalWakes / count <= 1 ? '🟢 Bonne' : 
                  totalWakes / count <= 3 ? '🟡 Moyenne' : '🔴 Mauvaise'
  };
}

function calculateSleepHours(dayData) {
  // TODO: Calcul réel heures sommeil depuis bedtime + siestes
  return 10; // Placeholder
}

function getWeekDates() {
  const dates = [];
  const today = new Date(currentDate);
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function getMonthDates() {
  const today = new Date(currentDate);
  const yearMonth = today.toISOString().slice(0, 7);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Array.from({length: Math.min(30, daysInMonth)}, (_, i) => 
    `${yearMonth}-${(daysInMonth - 29 + i).toString().padStart(2, '0')}`
  );
}

function changeDate(days) {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + days);
  currentDate = date.toISOString().split('T')[0];
  document.getElementById('currentDate').textContent = formatDate(currentDate);
  loadDayData();
  updateStats('day');
}

function savePrefs() {
  localStorage.setItem('sommeil_prefs', JSON.stringify({
    lastChild: currentChild,
    theme: document.documentElement.getAttribute('data-theme')
  }));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { 
    weekday: 'short', day: 'numeric', month: 'short' 
  });
}

async function syncBackend() {
  try {
    // TODO: Vercel API sync
    await fetch(`/api/enfants/${currentChild}/${currentDate}.json`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch(e) {
    console.log('Sync offline OK');
  }
}

// Service Worker PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
