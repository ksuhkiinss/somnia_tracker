// ==========================
// Елементи сторінки
// ==========================

const historyList = document.getElementById("historyList");

const editModal = document.getElementById("editModal");
const editDate = document.getElementById("editDate");
const editStart = document.getElementById("editStart");
const editEnd = document.getElementById("editEnd");
const editStars = document.querySelectorAll("#editRating span");
const editMoods = document.querySelectorAll("#editMoods button");
const editDream = document.getElementById("editDream");
const editNote = document.getElementById("editNote");

// ==========================
// Стан
// ==========================

let records = [];
let editingId = null;
let editRating = 5;
let editMood = "😊";

// ==========================
// Список записів
// ==========================

// "14 жовтня" (рік показуємо, тільки якщо він не поточний)
function formatDayLabel(date) {
  const options = { day: "numeric", month: "long" };

  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }

  return date.toLocaleDateString("uk-UA", options).replace(/\s?р\.$/, "");
}

function createItemHtml(record) {
  const start = new Date(record.start_time);
  const end = new Date(record.end_time);

  // Позначки, що в записі є сон або нотатка
  const hints = (record.dream ? " ☁️" : "") + (record.note ? " 📝" : "");

  return `
    <div class="item">
      <div class="ico">🌙</div>
      <div class="body">
        <b>${formatDayLabel(start)}</b>
        <p>${formatTime(start)} — ${formatTime(end)} · ${formatDuration(record.duration)}</p>
        <p>${"⭐".repeat(record.rating)} ${escapeHtml(record.mood)}${hints}</p>
      </div>
      <button type="button" class="edit" data-id="${record.id}">Редагувати</button>
    </div>
  `;
}

const EMPTY_HTML = `
  <div class="empty-state">
    <div class="big">😴</div>
    <h3>Записів ще немає</h3>
    <p>Додай свій перший сон на головній сторінці</p>
    <a href="../index.html?add=1" class="btn">➕ Додати сон</a>
  </div>
`;

function renderHistory() {
  if (records.length === 0) {
    historyList.innerHTML = EMPTY_HTML;
    return;
  }

  historyList.innerHTML = records.map(createItemHtml).join("");
}

async function loadHistory() {
  try {
    records = await fetchRecords();
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити історію", true);
    return;
  }

  renderHistory();
}

// Один обробник на весь список: ловимо натискання на кнопки "Редагувати"
historyList.addEventListener("click", (event) => {
  const button = event.target.closest(".edit");

  if (!button) return;

  openEditModal(Number(button.dataset.id));
});

// ==========================
// Запити до сервера
// ==========================

async function sendRequest(url, method, data) {
  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error("Помилка сервера");
    }

    return true;
  } catch (error) {
    console.error(error);

    return false;
  }
}

// ==========================
// Вікно редагування
// ==========================

function openEditModal(id) {
  const record = records.find((item) => item.id === id);

  if (!record) return;

  const start = new Date(record.start_time);
  const end = new Date(record.end_time);

  editingId = record.id;
  editRating = record.rating;
  editMood = record.mood;

  editDate.value = getDateKey(start);
  editStart.value = formatTime(start);
  editEnd.value = formatTime(end);
  editDream.value = record.dream || "";
  editNote.value = record.note || "";

  setStars(editStars, editRating);
  setMood(editMoods, editMood);

  openModal(editModal);
}

function closeEditModal() {
  closeModal(editModal);
  editingId = null;
}

setupStars(editStars, (rating) => {
  editRating = rating;
});

setupMoods(editMoods, (mood) => {
  editMood = mood;
});

document.getElementById("closeEdit").addEventListener("click", closeEditModal);

document.getElementById("saveEdit").addEventListener("click", async () => {
  if (editingId === null) return;

  if (!editDate.value || !editStart.value || !editEnd.value) {
    showToast("Заповніть дату, початок і кінець сну", true);
    return;
  }

  const times = getSleepTimes(editDate.value, editStart.value, editEnd.value);

  if (times.duration <= 0) {
    showToast("Початок і кінець сну збігаються", true);
    return;
  }

  const saved = await sendRequest(`/sleep/${editingId}`, "PUT", {
    start_time: formatLocalDateTime(times.start),
    end_time: formatLocalDateTime(times.end),
    duration: times.duration,
    rating: editRating,
    mood: editMood,
    dream: editDream.value.trim(),
    note: editNote.value.trim(),
  });

  if (!saved) {
    showToast("Не вдалося оновити запис", true);
    return;
  }

  closeEditModal();
  showToast("Запис оновлено ✏️");

  await loadHistory();
});

document.getElementById("deleteEdit").addEventListener("click", async () => {
  if (editingId === null) return;

  if (!confirm("Ви впевнені, що хочете видалити цей запис?")) return;

  const deleted = await sendRequest(`/sleep/${editingId}`, "DELETE");

  if (!deleted) {
    showToast("Не вдалося видалити запис", true);
    return;
  }

  closeEditModal();
  showToast("Запис видалено 🗑️");

  await loadHistory();
});

// ==========================
// Запуск
// ==========================

loadHistory();