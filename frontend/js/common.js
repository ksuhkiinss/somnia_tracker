// ==========================
// Бокове меню
// ==========================

function initSidebar() {
  const menuButton = document.querySelector(".menu-button");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  if (!menuButton || !sidebar || !overlay) return;

  menuButton.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
}

// Кнопка "+" у нижній навігації.
// На головній вона відкриває вікно додавання сну (це робить main.js),
// на інших сторінках веде на головну з відкритим вікном.
function initPlusButton() {
  const plusButton = document.querySelector(".bottom-nav .plus");
  const homeLink = document.querySelector(".bottom-nav a");

  if (!plusButton || !homeLink) return;
  if (document.getElementById("manualSleepModal")) return;

  plusButton.addEventListener("click", () => {
    window.location.href = homeLink.getAttribute("href") + "?add=1";
  });
}

initSidebar();
initPlusButton();

// ==========================
// Аватар
// ==========================

const AVATARS = ["👩", "👨", "🧑", "🦊", "🐱", "🐼", "🦉", "🌙"];

function getAvatar() {
  return localStorage.getItem("avatar") || "👩";
}

function applyAvatar() {
  document.querySelectorAll(".profile-button, .avatar").forEach((el) => {
    el.textContent = getAvatar();
  });
}

applyAvatar();

// ==========================
// Налаштування (localStorage)
// ==========================

// Ціль сну в хвилинах (за замовчуванням 8 годин)
function getGoalMinutes() {
  return Number(localStorage.getItem("goalMinutes")) || 8 * 60;
}

// Ім'я користувача (порожнє, якщо не вказане)
function getUserName() {
  return localStorage.getItem("userName") || "";
}

// Тема (застосовується одразу при завантаженні)
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

applyTheme(localStorage.getItem("theme") || "light");

// "8:02" (години:хвилини)
function formatClock(minutes) {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

// Серії днів з виконаною ціллю: поточна й рекордна
function calcStreaks(days, goal) {
  const keys = Object.keys(days).sort();

  if (keys.length === 0) return { current: 0, best: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);

  let run = 0;
  let best = 0;

  for (let d = new Date(`${keys[0]}T00:00:00`); d <= today; d.setDate(d.getDate() + 1)) {
    const key = getDateKey(d);
    const met = days[key] && days[key].duration >= goal;

    if (met) {
      run += 1;
      best = Math.max(best, run);
    } else if (key !== todayKey) {
      run = 0; // сьогодні ще можна виконати, серія не рветься
    }
  }

  return { current: run, best };
}

// ==========================
// Дата й час
// ==========================

function pad(number) {
  return String(number).padStart(2, "0");
}

// "2026-11-12"
function getDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "23:10"
function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "2026-11-12T23:10:00" (локальний час, без UTC)
function formatLocalDateTime(date) {
  return `${getDateKey(date)}T${formatTime(date)}:${pad(date.getSeconds())}`;
}

// "12 листопада 2026"
function formatLongDate(date) {
  return date
    .toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/\s?р\.$/, "");
}

// "7 год 55 хв"
function formatDuration(minutes) {
  if (!minutes) return "0 хв";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} хв`;
  if (mins === 0) return `${hours} год`;

  return `${hours} год ${mins} хв`;
}

// "7,9 год"
function formatHours(minutes) {
  const hours = Math.round((minutes / 60) * 10) / 10;

  return `${String(hours).replace(".", ",")} год`;
}

// Початок і кінець сну з полів форми (дата + два часи).
// Якщо кінець раніше за початок, сон закінчився після півночі.
function getSleepTimes(dateValue, startValue, endValue) {
  const start = new Date(`${dateValue}T${startValue}`);
  const end = new Date(`${dateValue}T${endValue}`);

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  const duration = Math.round((end - start) / 60000);

  return { start, end, duration };
}

// Вітання залежно від часу доби
function getGreeting(name) {
  const hour = new Date().getHours();
  let text = "Доброї ночі";

  if (hour >= 5 && hour < 12) {
    text = "Добрий ранок";
  } else if (hour >= 12 && hour < 18) {
    text = "Добрий день";
  } else if (hour >= 18 && hour < 23) {
    text = "Добрий вечір";
  }

  return name ? `${text}, ${name} 💜` : `${text} 💜`;
}

// ==========================
// Оцінка й настрій
// ==========================

const MOOD_TEXT = {
  "😄": "Почуваюсь чудово",
  "😊": "Почуваюсь добре",
  "😐": "Нормально",
  "😴": "Хочу ще спати",
  "😣": "Погано",
};

function getMoodText(mood) {
  return MOOD_TEXT[mood] || "";
}

// "⭐⭐⭐☆☆"
function formatRating(rating) {
  return "⭐".repeat(rating) + "☆".repeat(5 - rating);
}

// Підсвічує зірки до вибраної оцінки
function setStars(stars, rating) {
  stars.forEach((star) => {
    star.classList.toggle("active", Number(star.dataset.rating) <= rating);
  });
}

function setupStars(stars, onChange) {
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = Number(star.dataset.rating);

      setStars(stars, rating);
      onChange(rating);
    });
  });
}

// Підсвічує вибраний настрій
function setMood(buttons, mood) {
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === mood);
  });
}

function setupMoods(buttons, onChange) {
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setMood(buttons, button.dataset.mood);
      onChange(button.dataset.mood);
    });
  });
}

// ==========================
// Дані
// ==========================

// Усі записи, від найновішого до найстарішого
async function fetchRecords() {
  const response = await fetch("/sleep");

  if (!response.ok) {
    throw new Error("Не вдалося завантажити записи");
  }

  const records = await response.json();

  records.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  return records;
}

// Групує записи за днем початку сну:
// { "2026-11-12": { duration: 475, records: [...] } }
function groupByDay(records) {
  const days = {};

  records.forEach((record) => {
    const key = getDateKey(new Date(record.start_time));

    if (!days[key]) {
      days[key] = { duration: 0, records: [] };
    }

    days[key].duration += record.duration;
    days[key].records.push(record);
  });

  return days;
}

// ==========================
// Інтерфейс
// ==========================

function openModal(modal) {
  modal.classList.add("open");
}

function closeModal(modal) {
  modal.classList.remove("open");
}

// Записує текст в елемент за id (якщо елемента немає, нічого не робить)
function setText(id, text) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = text;
  }
}

// Захист від вставки HTML з тексту користувача (для innerHTML)
function escapeHtml(text) {
  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}

// Коротке повідомлення знизу екрана
let toastTimer = null;

function showToast(message, isError = false) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// Нагадування працює, поки відкрита будь-яка сторінка сайту
function checkReminder() {
  if (localStorage.getItem("reminderEnabled") === "0") return;

  const bedtime = localStorage.getItem("reminderTime") || "22:00";
  const [h, m] = bedtime.split(":").map(Number);
  const total = (h * 60 + m - 30 + 24 * 60) % (24 * 60);
  const time = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  const now = new Date();
  const today = getDateKey(now);

  if (formatTime(now) === time && localStorage.getItem("reminderShown") !== today) {
    localStorage.setItem("reminderShown", today);
    showToast("Скоро час спати 🌙 Готуйся до відбою");
  }
}

setInterval(checkReminder, 20000);