// ==========================
// Елементи сторінки
// ==========================

const goalMinus = document.getElementById("goalMinus");
const goalPlus = document.getElementById("goalPlus");
const goalInput = document.getElementById("goalInput");
const goalCircle = document.getElementById("goalCircle");
const weekDots = document.getElementById("weekDots");

// ==========================
// Стан
// ==========================

const GOAL_STEP = 30; // хвилин
const MIN_GOAL = 4 * 60;
const MAX_GOAL = 12 * 60;

let draftGoal = getGoalMinutes();
let sleepDays = {};
let lastSleepRecord = null;

// ==========================
// Вибір цілі
// ==========================

function renderDraft() {
  goalInput.textContent = formatHours(draftGoal);

  if (goalCircle) {
    goalCircle.textContent = formatHours(draftGoal);
  }
}

function changeGoal(step) {
  draftGoal = Math.min(MAX_GOAL, Math.max(MIN_GOAL, draftGoal + step));
  renderDraft();
}

goalMinus.addEventListener("click", () => changeGoal(-GOAL_STEP));
goalPlus.addEventListener("click", () => changeGoal(GOAL_STEP));

document.getElementById("saveGoal").addEventListener("click", () => {
  localStorage.setItem("goalMinutes", String(draftGoal));

  renderStats();
  showToast("Ціль збережено 🎯");
});

// ==========================
// Тиждень, серія, відбій
// ==========================

// "1 день", "2 дні", "5 днів"
function pluralDays(n) {
  const last = n % 10;
  const lastTwo = n % 100;

  if (lastTwo >= 11 && lastTwo <= 14) return "днів";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дні";

  return "днів";
}

function renderWeekDots(goal) {
  if (!weekDots) return;

  const names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;

  let html = "";

  for (let i = 0; i < 7; i++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset + i,
    );
    const day = sleepDays[getDateKey(date)];
    const done = day && day.duration >= goal;

    html += `<div class="${done ? "ok" : ""}"><span>${done ? "✅" : "·"}</span>${names[i]}</div>`;
  }

  weekDots.innerHTML = html;
}

function renderBadge(goal) {
  let text = "😴 Записів ще немає";
  let percent = 0;

  if (lastSleepRecord !== null) {
    const key = getDateKey(new Date(lastSleepRecord.start_time));
    const night = sleepDays[key].duration;

    percent = Math.min(100, Math.round((night / goal) * 100));
    text =
      night >= goal
        ? "✅ Ціль виконана"
        : `⏳ Ще ${formatDuration(goal - night)}`;
  }

  if (goalCircle) {
    goalCircle.style.setProperty("--progress", percent);
  }

  setText("goalBadge", text);
}

// Час відбою: час нагадування + 30 хвилин
function renderBedtime() {
  const saved = localStorage.getItem("reminderTime") || "22:00";
  const [hours, minutes] = saved.split(":").map(Number);
  const total = (hours * 60 + minutes + 30) % (24 * 60);

  setText("bedtimeValue", localStorage.getItem("reminderTime") || "22:00");
}

function renderStats() {
  const goal = getGoalMinutes();
  const streaks = calcStreaks(sleepDays, goal);

  renderWeekDots(goal);
  renderBadge(goal);

  setText("streakValue", `${streaks.current} ${pluralDays(streaks.current)}`);
  setText(
    "streakNote",
    `поспіль з виконаною ціллю. Рекорд: ${streaks.best} ${pluralDays(streaks.best)}.`,
  );
}

// ==========================
// Запуск
// ==========================

async function loadGoals() {
  try {
    const records = await fetchRecords();

    sleepDays = groupByDay(records);
    lastSleepRecord = records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити дані", true);
  }

  renderStats();
}

renderDraft();
renderBedtime();
loadGoals();