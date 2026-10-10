const SEMESTER_START = "14.09.2026";
const SEMESTER_END = "14.12.2026";

const scheduleRoot = document.querySelector(".schedule-card");

if (scheduleRoot) {
  const filterButtons = Array.from(scheduleRoot.querySelectorAll("[data-schedule-filter]"));
  const scheduleEvents = Array.from(scheduleRoot.querySelectorAll(".schedule-event"));
  const currentTitle = scheduleRoot.querySelector("[data-schedule-current-title]");
  const currentMeta = scheduleRoot.querySelector("[data-schedule-current-meta]");
  const semesterStartNode = scheduleRoot.querySelector("[data-semester-start]");
  const semesterEndNode = scheduleRoot.querySelector("[data-semester-end]");
  const semesterPercentNode = scheduleRoot.querySelector("[data-semester-progress-percent]");
  const semesterBar = scheduleRoot.querySelector("[data-semester-progress-bar]");
  const DAYS = [
    null,
    { key: "mon", label: "Pondelok" },
    { key: "tue", label: "Utorok" },
    { key: "wed", label: "Streda" },
    { key: "thu", label: "Štvrtok" },
    { key: "fri", label: "Piatok" }
  ];
  const DAY_LABELS = Object.fromEntries(
    DAYS.filter(Boolean).map((dayItem) => [dayItem.key, dayItem.label])
  );
  const DAY_ORDER = DAYS.filter(Boolean).map((dayItem) => dayItem.key);
  const eventItems = scheduleEvents.map((eventCard) => ({
    node: eventCard,
    day: eventCard.dataset.day,
    start: toMinutes(eventCard.dataset.start),
    end: toMinutes(eventCard.dataset.end),
    title: eventCard.dataset.title,
    meta: eventCard.dataset.meta,
    text: eventCard.querySelector("p").textContent,
    type: eventCard.classList.contains("schedule-event--lecture") ? "lecture" : "seminar"
  }));

  function toMinutes(timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function parseSemesterDate(dateValue) {
    const [day, month, year] = dateValue.split(".").map(Number);
    return new Date(year, month - 1, day);
  }

  function getDayLabel(dayKey) {
    return DAY_LABELS[dayKey] || "";
  }

  function getNextEvent(dayKey, currentMinutes) {
    if (!dayKey) {
      return getFirstWeeklyEvent();
    }

    const currentDayIndex = DAY_ORDER.indexOf(dayKey);

    const nextEvent = eventItems
      .filter((eventItem) => {
        const eventDayIndex = DAY_ORDER.indexOf(eventItem.day);

        if (eventDayIndex === currentDayIndex) {
          return eventItem.start > currentMinutes;
        }

        return eventDayIndex > currentDayIndex;
      })
      .sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day) || left.start - right.start)[0];

    return nextEvent || getFirstWeeklyEvent();
  }

  function getFirstWeeklyEvent() {
    return [...eventItems]
      .sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day) || left.start - right.start)[0];
  }

  function matchesFilter(eventItem, filterKey) {
    return filterKey === "all" || eventItem.type === filterKey;
  }

  function updateFilters(filterKey) {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.scheduleFilter === filterKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    eventItems.forEach((eventItem) => {
      eventItem.node.classList.toggle("schedule-event-is-hidden", !matchesFilter(eventItem, filterKey));
    });
  }

  function updateCurrentSchedule() {
    const now = new Date();
    const dayInfo = DAYS[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (!dayInfo) {
      const nextEvent = getNextEvent(null, currentMinutes);

      if (nextEvent) {
        currentTitle.textContent = "Najbližšie nasleduje";
        currentMeta.textContent = `${nextEvent.title} · ${getDayLabel(nextEvent.day)} · ${nextEvent.text}`;
        return;
      }

      currentTitle.textContent = "Mimo vyučovania";
      currentMeta.textContent = "Počas víkendu nemám v tomto rozvrhu naplánované bloky.";
      return;
    }

    const todayEvents = eventItems
      .filter((eventItem) => eventItem.day === dayInfo.key)
      .sort((left, right) => left.start - right.start);

    const activeEvent = todayEvents.find((eventItem) => currentMinutes >= eventItem.start && currentMinutes < eventItem.end);
    const nextEvent = todayEvents.find((eventItem) => currentMinutes < eventItem.start);

    if (activeEvent) {
      currentTitle.textContent = activeEvent.title;
      currentMeta.textContent = activeEvent.text;
      return;
    }

    if (nextEvent) {
      const minutesLeft = nextEvent.start - currentMinutes;

      currentTitle.textContent = "Najbližšie nasleduje";
      currentMeta.textContent = `${nextEvent.title} · začína o ${minutesLeft} minút.`;
      return;
    }

    const followingEvent = getNextEvent(dayInfo.key, currentMinutes);

    if (followingEvent) {
      currentTitle.textContent = "Najbližšie nasleduje";
      currentMeta.textContent = `${followingEvent.title} · ${getDayLabel(followingEvent.day)} · ${followingEvent.text}`;
      return;
    }

    currentTitle.textContent = "Mimo vyučovania";
    currentMeta.textContent = "V rozvrhu už nie je naplánované ďalšie vyučovanie.";
  }

  function updateSemesterProgress() {
    const semesterStart = parseSemesterDate(SEMESTER_START);
    const semesterEnd = parseSemesterDate(SEMESTER_END);
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const totalDuration = semesterEnd.getTime() - semesterStart.getTime();
    const elapsedDuration = currentDate.getTime() - semesterStart.getTime();
    const rawPercent = totalDuration <= 0 ? 0 : (elapsedDuration / totalDuration) * 100;
    const clampedPercent = Math.min(100, Math.max(0, rawPercent));

    semesterStartNode.textContent = SEMESTER_START;
    semesterEndNode.textContent = SEMESTER_END;
    semesterPercentNode.textContent = `${Math.round(clampedPercent)} % semestra`;
    semesterBar.style.width = `${clampedPercent}%`;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      updateFilters(button.dataset.scheduleFilter);
    });
  });

  updateFilters("all");
  updateCurrentSchedule();
  updateSemesterProgress();
  window.setInterval(updateCurrentSchedule, 60000);
}
