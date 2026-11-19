// ==========================
// Елементи сторінки
// ==========================

const sleepButton = document.getElementById("sleepButton");
const sleepButtonText = document.getElementById("buttonText");
const sleepButtonIcon = sleepButton.querySelector(".button-icon");
const sleepTimer = document.getElementById("sleepTimer");

const sleepModal = document.getElementById("sleepModal");
const manualModal = document.getElementById("manualSleepModal");
const recordModal = document.getElementById("recordModal");

// Вікно "Сон завершено"
const modalDuration = document.getElementById("modalDuration");
const ratingStars = document.querySelectorAll("#ratingStars span");
const sleepMoods = document.querySelectorAll("#sleepModal .moods button");
const dreamInput = document.getElementById("dreamInput");
const noteInput = document.getElementById("noteInput");

// Вікно ручного додавання
const manualDate = document.getElementById("manualDate");
const manualStart = document.getElementById("manualStart");
const manualEnd = document.getElementById("manualEnd");
const manualStars = document.querySelectorAll("#manualRating span");
const manualMoods = document.querySelectorAll("#manualMoods button");
const manualDream = document.getElementById("manualDream");
const manualNote = document.getElementById("manualNote");

// ==========================
// Стан
// ==========================

let sleepStart = null; // коли заснули
let sleepEnd = null; // коли прокинулись
let timerId = null;

let lastRecord = null;

let sleepRating = 5;
let sleepMood = "😊";

let manualRating = 5;
let manualMood = "😊";

// ==========================
// Привітання й дата
// ==========================

setText("greeting", getGreeting(getUserName()));
setText("currentDate", `📅 ${formatLongDate(new Date())}`);

// ==========================
// Таймер сну
// ==========================

function setSleepingView(isSleeping) {
  sleepButtonText.textContent = isSleeping ? "Прокинувся" : "Почати сон";
  sleepButtonIcon.textContent = isSleeping ? "☀️" : "🌙";
}

function updateTimer() {
  const diff = new Date() - sleepStart;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  sleepTimer.innerHTML = `😴 Сон триває<br><br>${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function startTimer(startDate) {
  sleepStart = startDate;
  localStorage.setItem("sleepStart", sleepStart.toISOString());

  setSleepingView(true);
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  localStorage.removeItem("sleepStart");

  setSleepingView(false);
}

function resetSleepState() {
  sleepStart = null;
  sleepEnd = null;
  sleepTimer.textContent = "😴 Сон ще не розпочато";
}

// Якщо сторінку перезавантажили під час сну, таймер продовжується
function restoreTimer() {
  const saved = localStorage.getItem("sleepStart");

  if (!saved) return;

  const startDate = new Date(saved);

  if (isNaN(startDate)) {
    localStorage.removeItem("sleepStart");
    return;
  }

  startTimer(startDate);
}

sleepButton.addEventListener("click", () => {
  if (timerId === null) {
    startTimer(new Date());
    return;
  }

  sleepEnd = new Date();

  const minutes = Math.floor((sleepEnd - sleepStart) / 60000);

  stopTimer();

  if (minutes < 1) {
    resetSleepState();
    showToast("Сон тривав менше хвилини, запис не створено", true);
    return;
  }

  sleepTimer.textContent = "😴 Сон завершено";
  modalDuration.textContent = `Ви спали ${formatDuration(minutes)}`;

  resetSleepForm();
  openModal(sleepModal);
});

// ==========================
// Збереження запису
// ==========================

async function saveRecord(data) {
  try {
    const response = await fetch("/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Помилка сервера");
    }

    return true;
  } catch (error) {
    console.error(error);
    showToast("Не вдалося зберегти запис", true);

    return false;
  }
}

// ==========================
// Вікно "Сон завершено"
// ==========================

function resetSleepForm() {
  sleepRating = 5;
  sleepMood = "😊";

  setStars(ratingStars, sleepRating);
  setMood(sleepMoods, sleepMood);

  dreamInput.value = "";
  noteInput.value = "";
}

setupStars(ratingStars, (rating) => {
  sleepRating = rating;
});

setupMoods(sleepMoods, (mood) => {
  sleepMood = mood;
});

document.getElementById("saveSleep").addEventListener("click", async () => {
  if (!sleepStart || !sleepEnd) return;

  const saved = await saveRecord({
    start_time: formatLocalDateTime(sleepStart),
    end_time: formatLocalDateTime(sleepEnd),
    duration: Math.floor((sleepEnd - sleepStart) / 60000),
    rating: sleepRating,
    mood: sleepMood,
    dream: dreamInput.value.trim(),
    note: noteInput.value.trim(),
  });

  if (!saved) return;

  closeModal(sleepModal);
  resetSleepState();
  showToast("Сон збережено 🌙");

  await loadData();
});

document
  .querySelector("#sleepModal .close-modal")
  .addEventListener("click", () => {
    if (!confirm("Закрити без збереження? Запис сну буде втрачено.")) return;

    closeModal(sleepModal);
    resetSleepState();
  });

// ==========================
// Вікно ручного додавання
// ==========================

function resetManualForm() {
  manualRating = 5;
  manualMood = "😊";

  setStars(manualStars, manualRating);
  setMood(manualMoods, manualMood);

  manualDate.value = getDateKey(new Date());
  manualStart.value = "";
  manualEnd.value = "";
  manualDream.value = "";
  manualNote.value = "";
}

function openManualModal() {
  resetManualForm();
  openModal(manualModal);
}

setupStars(manualStars, (rating) => {
  manualRating = rating;
});

setupMoods(manualMoods, (mood) => {
  manualMood = mood;
});

document
  .getElementById("addSleepButton")
  .addEventListener("click", openManualModal);

document.getElementById("bottomAdd").addEventListener("click", openManualModal);

document
  .getElementById("closeManualModal")
  .addEventListener("click", () => closeModal(manualModal));

document
  .getElementById("saveManualSleep")
  .addEventListener("click", async () => {
    if (!manualDate.value || !manualStart.value || !manualEnd.value) {
      showToast("Заповніть дату, початок і кінець сну", true);
      return;
    }

    const times = getSleepTimes(
      manualDate.value,
      manualStart.value,
      manualEnd.value,
    );

    if (times.duration <= 0) {
      showToast("Початок і кінець сну збігаються", true);
      return;
    }

    const saved = await saveRecord({
      start_time: formatLocalDateTime(times.start),
      end_time: formatLocalDateTime(times.end),
      duration: times.duration,
      rating: manualRating,
      mood: manualMood,
      dream: manualDream.value.trim(),
      note: manualNote.value.trim(),
    });

    if (!saved) return;

    closeModal(manualModal);
    showToast("Сон додано 🌙");

    await loadData();
  });

// Перехід з іншої сторінки кнопкою "+" (index.html?add=1)
const params = new URLSearchParams(window.location.search);

if (params.get("add") === "1") {
  openManualModal();

  if (params.get("date")) {
    manualDate.value = params.get("date");
  }

  window.history.replaceState(null, "", window.location.pathname);
}

// ==========================
// Перегляд останнього запису
// ==========================

document.getElementById("openLastRecord").addEventListener("click", () => {
  if (lastRecord === null) {
    showToast("Записів ще немає 😴", true);
    return;
  }

  const start = new Date(lastRecord.start_time);
  const end = new Date(lastRecord.end_time);

  setText("viewDate", `📅 ${start.toLocaleDateString("uk-UA")}`);
  setText("viewTime", `🕒 ${formatTime(start)} — ${formatTime(end)}`);
  setText("viewDuration", `🌙 ${formatDuration(lastRecord.duration)}`);
  setText("viewRating", formatRating(lastRecord.rating));
  setText("viewMood", `${lastRecord.mood} ${getMoodText(lastRecord.mood)}`);
  setText(
    "viewDream",
    lastRecord.dream ? `💭 ${lastRecord.dream}` : "💭 Сон не записаний",
  );
  setText(
    "viewNote",
    lastRecord.note ? `📝 ${lastRecord.note}` : "📝 Нотаток немає",
  );

  openModal(recordModal);
});

document
  .getElementById("closeRecordModal")
  .addEventListener("click", () => closeModal(recordModal));

// ==========================
// Показ даних на сторінці
// ==========================

function renderLastSleep() {
  const chips = document.getElementById("lastChips");

  if (lastRecord === null) {
    setText("mainDuration", "---");
    setText("mainRating", formatRating(0));
    setText("mainMood", "Записів ще немає");
    setText("lastDate", "---");
    setText("lastTime", "---");
    setText("lastDuration", "🕐 ---");
    setText("lastRating", formatRating(0));
    setText("lastMood", "");

    if (chips) chips.innerHTML = "";

    return;
  }

  const start = new Date(lastRecord.start_time);
  const end = new Date(lastRecord.end_time);
  const moodText = `${lastRecord.mood} ${getMoodText(lastRecord.mood)}`;

  setText("mainDuration", formatDuration(lastRecord.duration));
  setText("mainRating", formatRating(lastRecord.rating));
  setText("mainMood", moodText);

  setText("lastDate", start.toLocaleDateString("uk-UA"));
  setText("lastTime", `${formatTime(start)} — ${formatTime(end)}`);
  setText("lastDuration", `🕐 ${formatDuration(lastRecord.duration)}`);
  setText("lastRating", formatRating(lastRecord.rating));
  setText("lastMood", moodText);

  if (chips) {
    chips.innerHTML =
      (lastRecord.dream ? '<span class="chip">☁️ Сон</span>' : "") +
      (lastRecord.note ? '<span class="chip">📝 Нотатка</span>' : "");
  }
}

// Статистика за поточний місяць
function renderStats(days) {
  const monthKey = getDateKey(new Date()).slice(0, 7);
  const goal = getGoalMinutes();

  let total = 0;
  let sleepDaysCount = 0;
  let goalDaysCount = 0;
  let dreamDaysCount = 0;

  Object.keys(days).forEach((key) => {
    if (!key.startsWith(monthKey)) return;

    const day = days[key];

    total += day.duration;
    sleepDaysCount += 1;

    if (day.duration >= goal) goalDaysCount += 1;
    if (day.records.some((record) => record.dream)) dreamDaysCount += 1;
  });

  const average = sleepDaysCount > 0 ? Math.round(total / sleepDaysCount) : 0;

  setText("totalSleep", formatDuration(total));
  setText("averageSleep", formatDuration(average));
  setText("goalDays", goalDaysCount);
  setText("sleepDays", dreamDaysCount);
}

// Картка цілі: остання ніч порівняно з ціллю
function renderGoal(days) {
  const goal = getGoalMinutes();
  const circle = document.getElementById("goalCircle");

  let night = 0;

  if (lastRecord !== null) {
    night = days[getDateKey(new Date(lastRecord.start_time))].duration;
  }

  const percent = Math.min(100, Math.round((night / goal) * 100));

  if (circle) {
    circle.textContent = formatHours(night);
    circle.style.setProperty("--progress", percent);
  }

  let badgeText = "😴 Записів ще немає";

  if (lastRecord !== null) {
    badgeText =
      night >= goal
        ? "✅ Ціль виконана"
        : `⏳ Ще ${formatDuration(goal - night)}`;
  }

  setText("goalLabel", "Остання ніч");
  setText("goalValue", formatHours(goal));
  setText("goalBadge", badgeText);
}

async function loadData() {
  try {
    const records = await fetchRecords();
    const days = groupByDay(records);

    lastRecord = records.length > 0 ? records[0] : null;

    renderLastSleep();
    renderStats(days);
    renderGoal(days);
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити дані", true);
  }
}

// ==========================
// Запуск
// ==========================

restoreTimer();
loadData();