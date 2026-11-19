// ==========================
// Елементи сторінки
// ==========================

const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("currentMonth");
const selectedDayCard = document.getElementById("selectedDay");

const MONTH_NAMES = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

// ==========================
// Стан
// ==========================

// Перше число місяця, який зараз показано
let viewDate = new Date();
viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

// Вибраний день у форматі "2026-11-12" (null, якщо нічого не вибрано)
let selectedKey = getDateKey(new Date());

// Записи, згруповані за днем: { "2026-11-12": { duration, records } }
let sleepByDay = {};

// ==========================
// Календар
// ==========================

// Колір крапки: ціль виконана / трохи менше / мало сну
function getQuality(minutes) {
  const goal = getGoalMinutes();

  if (minutes >= goal) return "good";
  if (minutes >= goal * 0.75) return "mid";

  return "bad";
}

function createDayCell(date) {
  const key = getDateKey(date);
  const cell = document.createElement("div");

  cell.className = "day";
  cell.dataset.day = date.getDate();
  cell.textContent = date.getDate();

  if (key === getDateKey(new Date())) {
    cell.classList.add("today");
  }

  if (key === selectedKey) {
    cell.classList.add("selected");
  }

  const entry = sleepByDay[key];

  if (entry) {
    const dot = document.createElement("i");

    dot.className = getQuality(entry.duration);
    cell.appendChild(dot);
  }

  cell.addEventListener("click", () => {
    selectedKey = key;
    renderCalendar();
    renderSelectedDay();
  });

  return cell;
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  monthTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

  // Видаляємо старі дні, заголовки Пн-Нд залишаються
  calendarGrid.querySelectorAll(".day").forEach((cell) => cell.remove());

  // Скільки порожніх клітинок перед 1-м числом (тиждень починається з понеділка)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");

    empty.className = "day empty";
    calendarGrid.appendChild(empty);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    calendarGrid.appendChild(createDayCell(new Date(year, month, day)));
  }
}

// ==========================
// Інформація про вибраний день
// ==========================

function renderRecordHtml(record, isFirst) {
  const start = new Date(record.start_time);
  const end = new Date(record.end_time);
  const marginStyle = isFirst ? "" : ' style="margin-top: 14px"';

  let html = `<p class="record-time"${marginStyle}>${formatTime(start)} — ${formatTime(end)}</p>`;

  html += `<p class="muted">${formatDuration(record.duration)} · ${"⭐".repeat(record.rating)} · ${record.mood} ${getMoodText(record.mood)}</p>`;

  if (record.dream) {
    html += `<p style="margin-top: 10px">💭 ${escapeHtml(record.dream)}</p>`;
  }

  if (record.note) {
    html += `<p style="margin-top: 10px">📝 ${escapeHtml(record.note)}</p>`;
  }

  return html;
}

function renderSelectedDay() {
  if (selectedKey === null) {
    selectedDayCard.innerHTML =
      '<h3>🌙 Обери день</h3><p class="muted">Натисни на дату, щоб переглянути інформацію про сон.</p>';
    return;
  }

  const [year, month, day] = selectedKey.split("-").map(Number);
  const title = new Date(year, month - 1, day).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
  });

  let html = `<h3>🌙 ${title}</h3>`;
  const entry = sleepByDay[selectedKey];

  if (!entry) {
    html += '<p class="muted">За цей день записів немає.</p>';
  } else {
    // Записи приходять від новішого до старішого, показуємо за порядком доби
    const records = [...entry.records].reverse();

    if (records.length > 1) {
      html += `<p class="muted">Усього за день: ${formatDuration(entry.duration)}</p>`;
    }

    records.forEach((record, index) => {
      html += renderRecordHtml(record, index === 0);
    });
  }

  html += `<a href="../index.html?add=1&date=${selectedKey}" class="btn" style="margin-top:14px">➕ Додати сон за цей день</a>`;

  selectedDayCard.innerHTML = html;
}

// ==========================
// Перемикання місяців
// ==========================

function changeMonth(step) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + step, 1);

  // У поточному місяці одразу вибираємо сьогодні, в інших нічого не вибрано
  const today = new Date();
  const isCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  selectedKey = isCurrentMonth ? getDateKey(today) : null;

  renderCalendar();
  renderSelectedDay();
}

document
  .getElementById("prevMonth")
  .addEventListener("click", () => changeMonth(-1));

document
  .getElementById("nextMonth")
  .addEventListener("click", () => changeMonth(1));

// ==========================
// Запуск
// ==========================

async function loadData() {
  try {
    sleepByDay = groupByDay(await fetchRecords());
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити дані", true);
  }

  renderCalendar();
  renderSelectedDay();
}

renderCalendar();
renderSelectedDay();
loadData();