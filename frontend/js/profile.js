// ==========================
// Профіль
// ==========================

const MONTHS_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

function formatSince(date) {
  return `З нами з ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

function renderProfile(records) {
  const goal = getGoalMinutes();
  const days = groupByDay(records);
  const dayKeys = Object.keys(days);
  const streaks = calcStreaks(days, goal);

  // Ім'я: якщо його немає, лишається те, що в HTML
  const name = getUserName();

  if (name) setText("profileName", name);

  // Дата реєстрації. Поки її немає на сервері, беремо найстаріший запис
  const savedSince = localStorage.getItem("userSince");

  if (savedSince) {
    setText("profileSince", formatSince(new Date(savedSince)));
  } else if (records.length > 0) {
    const oldest = records[records.length - 1];

    setText("profileSince", formatSince(new Date(oldest.start_time)));
  }

  // Числа
  const goalDays = dayKeys.filter((key) => days[key].duration >= goal).length;
  const total = dayKeys.reduce((sum, key) => sum + days[key].duration, 0);
  const average = dayKeys.length ? Math.round(total / dayKeys.length) : 0;

  setText("statRecords", records.length);
  setText("statGoalDays", goalDays);
  setText("statAvgSleep", average ? formatClock(average) : "---");

  // Досягнення (порядок такий самий, як у profile.html)
  const unlocked = [
    records.length >= 1, // Перший сон
    streaks.best >= 3, // Серія 3 дні
    records.filter((record) => record.rating === 5).length >= 10, // 5 зірок ×10
    streaks.best >= 7, // Серія 7 днів
    records.filter((record) => record.dream).length >= 10, // 10 снів
    streaks.best >= 30, // Місяць з ціллю
  ];

  document.querySelectorAll(".badge-item").forEach((badge, index) => {
    badge.classList.toggle("locked", !unlocked[index]);
  });
}

async function loadProfile() {
  try {
    renderProfile(await fetchRecords());
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити профіль", true);
  }
}

loadProfile();