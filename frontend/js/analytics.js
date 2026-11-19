// ==========================
// Статистика: тиждень і оцінки за місяць
// ==========================

const WEEKDAY_SHORT = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

// Останні N днів: від найстарішого до сьогодні
function getLastDays(count) {
  const result = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();

    date.setDate(date.getDate() - i);
    result.push(date);
  }

  return result;
}

// ==========================
// Тиждень
// ==========================

let allDays = {};
let period = 7;

function renderWeek(days, count) {
  const goal = getGoalMinutes();

  setText(
    "goalNote",
    `Світлі стовпчики — менше за ціль (${formatHours(goal)}).`,
  );
  setText(
    "periodNote",
    count === 7 ? "Твій сон за останній тиждень" : "Твій сон за останні 30 днів",
  );

  const week = getLastDays(count).map((date, i) => {
    const day = days[getDateKey(date)];

    // Для 7 днів підписуємо день тижня, для 30 лише кожен 5-й день
    let label = WEEKDAY_SHORT[date.getDay()];

    if (count > 7) {
      label = i % 5 === 0 || i === count - 1 ? date.getDate() : "";
    }

    return { label, minutes: day ? day.duration : 0 };
  });

  const withSleep = week.filter((item) => item.minutes > 0);
  const total = withSleep.reduce((sum, item) => sum + item.minutes, 0);
  const best = withSleep.reduce((max, item) => Math.max(max, item.minutes), 0);
  const goalDays = week.filter((item) => item.minutes >= goal).length;

  setText(
    "avgSleep",
    withSleep.length ? formatClock(Math.round(total / withSleep.length)) : "---",
  );
  setText("bestNight", best ? formatClock(best) : "---");
  setText("goalDays", `${goalDays}/${count}`);

  const bars = document.getElementById("barsChart");

  bars.style.gap = count > 7 ? "2px" : "";

  bars.innerHTML = week
    .map((item) => {
      const hours = Math.round((item.minutes / 60) * 10) / 10;
      const height = Math.max(2, Math.min(100, hours * 10));
      const lowClass = item.minutes < goal ? "low" : "";
      // Над стовпчиками числа показуємо лише для тижня, на 30 днів вони не влізуть
      const value = count === 7 ? `<span>${hours > 0 ? hours : "–"}</span>` : "";

      return `
        <div class="bar" style="white-space: nowrap">
          ${value}
          <div class="${lowClass}" style="height: ${height}%"></div>
          ${item.label}
        </div>
      `;
    })
    .join("");
}

document.getElementById("periodSwitch").addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  period = Number(button.dataset.period);

  document
    .querySelectorAll("#periodSwitch button")
    .forEach((item) => item.classList.toggle("active", item === button));

  renderWeek(allDays, period);
});

// ==========================
// Оцінки за місяць
// ==========================

function renderRatings(records) {
  const monthKey = getDateKey(new Date()).slice(0, 7);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  records.forEach((record) => {
    const key = getDateKey(new Date(record.start_time));

    if (key.startsWith(monthKey) && counts[record.rating] !== undefined) {
      counts[record.rating] += 1;
    }
  });

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  let html = "";

  for (let stars = 5; stars >= 1; stars--) {
    const count = counts[stars];
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    html += `
      <div class="dist">
        <span>${"⭐".repeat(stars)}</span>
        <div class="track"><b style="width: ${percent}%"></b></div>
        <span>${count}</span>
      </div>
    `;
  }

  document.getElementById("ratingsChart").innerHTML = html;
}

// ==========================
// Запуск
// ==========================

async function loadAnalytics() {
  try {
    const records = await fetchRecords();

    allDays = groupByDay(records);
    renderWeek(allDays, period);
    renderRatings(records);
  } catch (error) {
    console.error(error);
    showToast("Не вдалося завантажити статистику", true);
  }
}

loadAnalytics();