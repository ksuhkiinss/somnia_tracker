// ==========================
// Елементи сторінки
// ==========================

const notesList = document.getElementById("notesList");
const notesSearch = document.getElementById("notesSearch");

// ==========================
// Стан
// ==========================

let notes = []; // записи, у яких є сон або нотатка

// ==========================
// Список
// ==========================

// "14 жовтня" (рік показуємо, тільки якщо він не поточний)
function formatNoteDate(date) {
  const options = { day: "numeric", month: "long" };

  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }

  return date.toLocaleDateString("uk-UA", options).replace(/\s?р\.$/, "");
}

function createNoteHtml(record) {
  const date = new Date(record.start_time);
  const icon = record.dream ? "☁️" : "📝";

  let text = "";

  if (record.dream) {
    text += `<p>💭 ${escapeHtml(record.dream)}</p>`;
  }

  if (record.note) {
    text += `<p>📝 ${escapeHtml(record.note)}</p>`;
  }

  return `
    <div class="item">
      <div class="ico">${icon}</div>
      <div class="body">
        <b>${formatNoteDate(date)}</b>
        ${text}
      </div>
      <div class="side">
        <div>${escapeHtml(record.mood)}</div>
        <button type="button" class="edit" data-action="edit" data-id="${record.id}">✏️</button>
        <button type="button" class="edit danger" data-action="delete" data-id="${record.id}">🗑️</button>
      </div>
    </div>
  `;
}

// ===== Редагування й видалення =====

const noteModal = document.getElementById("noteModal");
const noteModalDream = document.getElementById("noteModalDream");
const noteModalNote = document.getElementById("noteModalNote");
let editingRecord = null;

async function saveNoteText(record, dream, note) {
  try {
    const response = await fetch(`/sleep/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: record.start_time,
        end_time: record.end_time,
        duration: record.duration,
        rating: record.rating,
        mood: record.mood,
        dream,
        note,
      }),
    });

    if (!response.ok) throw new Error("Помилка сервера");

    await loadNotes();
    return true;
  } catch (error) {
    console.error(error);
    showToast("Не вдалося зберегти", true);
    return false;
  }
}

notesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const record = notes.find((item) => item.id === Number(button.dataset.id));
  if (!record) return;

  if (button.dataset.action === "edit") {
    editingRecord = record;
    noteModalDream.value = record.dream || "";
    noteModalNote.value = record.note || "";
    openModal(noteModal);
    return;
  }

  if (confirm("Видалити текст нотатки? Сам запис про сон залишиться.")) {
    if (await saveNoteText(record, "", "")) showToast("Нотатку видалено 🗑️");
  }
});

document.getElementById("noteModalSave").addEventListener("click", async () => {
  if (!editingRecord) return;

  const ok = await saveNoteText(
    editingRecord,
    noteModalDream.value.trim(),
    noteModalNote.value.trim(),
  );

  if (ok) {
    closeModal(noteModal);
    showToast("Нотатку оновлено ✏️");
  }
});

document
  .getElementById("noteModalClose")
  .addEventListener("click", () => closeModal(noteModal));

function emptyHtml(title, hint, withButton) {
  return `
    <div class="empty-state">
      <div class="big">📝</div>
      <h3>${title}</h3>
      <p>${hint}</p>
      ${withButton ? '<a href="./note-new.html" class="btn">➕ Нова нотатка</a>' : ""}
    </div>
  `;
}

function renderNotes() {
  const query = notesSearch.value.trim().toLowerCase();

  if (notes.length === 0) {
    notesList.innerHTML = emptyHtml(
      "Нотаток ще немає",
      "Запиши свій перший сон або думку",
      false,
    );
    return;
  }

  const found = notes.filter((record) => {
    const text = `${record.dream || ""} ${record.note || ""}`.toLowerCase();

    return text.includes(query);
  });

  if (found.length === 0) {
    notesList.innerHTML = emptyHtml(
      "Нічого не знайдено",
      "Спробуй інший запит",
      false,
    );
    return;
  }

  notesList.innerHTML = found.map(createNoteHtml).join("");
}

notesSearch.addEventListener("input", renderNotes);

// ==========================
// Запуск
// ==========================

async function loadNotes() {
  try {
    const records = await fetchRecords();

    notes = records.filter((record) => record.dream || record.note);
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити нотатки", true);
    return;
  }

  renderNotes();
}

loadNotes();