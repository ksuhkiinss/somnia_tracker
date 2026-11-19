// ==========================
// Елементи сторінки
// ==========================

const reminderToggle = document.getElementById("reminderToggle");
const reminderTime = document.getElementById("reminderTime");
const darkToggle = document.getElementById("darkToggle");
const nameInput = document.getElementById("nameInput");

nameInput.value = getUserName();

document.getElementById("saveName").addEventListener("click", () => {
  localStorage.setItem("userName", nameInput.value.trim());
  showToast("Ім'я збережено 💜");
});

// ==========================
// Аватар
// ==========================

const avatarPicker = document.getElementById("avatarPicker");

function renderAvatars() {
  avatarPicker.innerHTML = AVATARS.map(
    (avatar) =>
      `<button type="button" data-avatar="${avatar}" class="${avatar === getAvatar() ? "active" : ""}">${avatar}</button>`,
  ).join("");
}

avatarPicker.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  localStorage.setItem("avatar", button.dataset.avatar);
  applyAvatar();
  renderAvatars();
  showToast("Аватар змінено ✨");
});

renderAvatars();

// ==========================
// Нагадування
// ==========================

// За замовчуванням нагадування увімкнене
reminderToggle.checked = localStorage.getItem("reminderEnabled") !== "0";
reminderTime.value = localStorage.getItem("reminderTime") || "22:00";

reminderToggle.addEventListener("change", () => {
  localStorage.setItem("reminderEnabled", reminderToggle.checked ? "1" : "0");
  showToast(reminderToggle.checked ? "Нагадування увімкнено" : "Нагадування вимкнено");
});

reminderTime.addEventListener("change", () => {
  if (!reminderTime.value) return;

  localStorage.setItem("reminderTime", reminderTime.value);
  showToast("Час нагадування збережено ⏰");
});

// ==========================
// Темна тема
// ==========================

darkToggle.checked = document.documentElement.dataset.theme === "dark";

darkToggle.addEventListener("change", () => {
  const theme = darkToggle.checked ? "dark" : "light";

  applyTheme(theme);
  localStorage.setItem("theme", theme);
});

// ==========================
// Експорт
// ==========================

document.getElementById("exportBtn").addEventListener("click", async () => {
  try {
    const records = await fetchRecords();

    if (records.length === 0) {
      showToast("Записів для експорту ще немає 😴", true);
      return;
    }

    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `somnia-${getDateKey(new Date())}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast("Записи експортовано 📁");
  } catch (error) {
    console.error(error);
    showToast("Не вдалося експортувати записи", true);
  }
});

// ==========================
// Видалення всіх даних
// ==========================

document.getElementById("deleteAllBtn").addEventListener("click", async () => {
  if (!confirm("Видалити ВСІ записи? Цю дію не можна скасувати.")) return;

  try {
    const records = await fetchRecords();

    const results = await Promise.all(
      records.map((record) => fetch(`/sleep/${record.id}`, { method: "DELETE" })),
    );

    if (results.some((response) => !response.ok)) {
      throw new Error("Частину записів не вдалося видалити");
    }

    // Локальні налаштування теж скидаємо, окрім теми та імені
    localStorage.removeItem("goalMinutes");
    localStorage.removeItem("sleepStart");

    showToast("Усі дані видалено 🗑️");
  } catch (error) {
    console.error(error);
    showToast("Не вдалося видалити дані", true);
  }
});