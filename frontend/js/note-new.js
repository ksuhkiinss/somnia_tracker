// ==========================
// Елементи сторінки
// ==========================

const noteForm = document.getElementById("noteForm");
const noteDate = document.getElementById("noteDate");
const noteStars = document.querySelectorAll("#noteRating span");
const noteMoodButtons = document.querySelectorAll("#noteMoods button");
const dreamField = document.getElementById("dream");
const noteField = document.getElementById("noteText");
const submitButton = document.getElementById("submitBtn");
const formError = document.getElementById("formError");
const sleepTimes = document.getElementById("sleepTimes");
const noteStart = document.getElementById("noteStart");
const noteEnd = document.getElementById("noteEnd");

// ==========================
// Стан
// ==========================

let chosenRating = null;
let chosenMood = null;

noteDate.value = getDateKey(new Date());

async function setDefaultDate() {
  try {
    const records = await fetchRecords();

    if (records.length > 0) {
      noteDate.value = getDateKey(new Date(records[0].start_time));
    }
  } catch (error) {
    console.error(error);
  }
}

setDefaultDate();

setupStars(noteStars, (rating) => {
  chosenRating = rating;
});

setupMoods(noteMoodButtons, (mood) => {
  chosenMood = mood;
});

// ==========================
// Помилки
// ==========================

function setFieldError(fieldId, errorId, show) {
  document.getElementById(fieldId).classList.toggle("error", show);
  document.getElementById(errorId).hidden = !show;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

// Додає текст до наявного через новий рядок
function joinText(oldText, newText) {
  if (oldText && newText) return `${oldText}\n${newText}`;

  return oldText || newText;
}

// ==========================
// Відправка
// ==========================

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;

  const dream = dreamField.value.trim();
  const note = noteField.value.trim();

  const dateOk = noteDate.value !== "";
  const textOk = dream !== "" || note !== "";

  setFieldError("noteDateField", "noteDateError", !dateOk);
  setFieldError("noteTextField", "noteTextError", !textOk);

  if (!dateOk || !textOk) return;

  submitButton.disabled = true;

  try {
    const records = await fetchRecords();

    // Записи йдуть від новішого до старішого, беремо останній за цей день
    const record = records.find(
      (item) => getDateKey(new Date(item.start_time)) === noteDate.value,
    );

    let url = "/sleep";
    let method = "POST";
    let body;

    if (record) {
      url = `/sleep/${record.id}`;
      method = "PUT";
      body = {
        start_time: record.start_time,
        end_time: record.end_time,
        duration: record.duration,
        rating: chosenRating ?? record.rating,
        mood: chosenMood ?? record.mood,
        dream: joinText(record.dream, dream),
        note: joinText(record.note, note),
      };
    } else {
      if (sleepTimes.hidden) {
        sleepTimes.hidden = false;
        showFormError("За цю дату сну немає. Вкажи час сну й натисни «Зберегти» ще раз.");
        submitButton.disabled = false;
        return;
      }

      if (!noteStart.value || !noteEnd.value) {
        showFormError("Вкажи початок і кінець сну");
        submitButton.disabled = false;
        return;
      }

      const times = getSleepTimes(noteDate.value, noteStart.value, noteEnd.value);

      if (times.duration <= 0) {
        showFormError("Початок і кінець сну збігаються");
        submitButton.disabled = false;
        return;
      }

      body = {
        start_time: formatLocalDateTime(times.start),
        end_time: formatLocalDateTime(times.end),
        duration: times.duration,
        rating: chosenRating ?? 5,
        mood: chosenMood ?? "😊",
        dream,
        note,
      };
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Помилка сервера");
    }

    showToast("Нотатку збережено 📝");
    setTimeout(() => {
      window.location.href = "./dreams.html";
    }, 800);
  } catch (error) {
    console.error(error);
    submitButton.disabled = false;
    showToast("Не вдалося зберегти нотатку", true);
  }
});