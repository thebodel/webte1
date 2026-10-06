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

const mapRoot = document.querySelector("[data-map-root]");

if (mapRoot) {
  const mapError = mapRoot.querySelector("[data-map-error]");

  if (!window.L) {
    mapError.hidden = false;
  } else {
    const MAP_STORAGE_KEY = "bohdan-sukhina-map-places";
    const fixedPlaces = {
      school: { name: "STU FEI", coordinates: [48.1517, 17.0727] },
      home: { name: "Domov (približná poloha)", coordinates: [48.1452, 17.1127] }
    };
    const mapElement = mapRoot.querySelector("#personal-map");
    const form = mapRoot.querySelector("[data-map-add-form]");
    const nameInput = form.elements["place-name"];
    const coordinatesNode = mapRoot.querySelector("[data-map-coordinates]");
    const placeList = mapRoot.querySelector("[data-map-place-list]");
    const emptyState = mapRoot.querySelector("[data-map-empty-state]");
    const distanceBlock = mapRoot.querySelector("[data-map-distance]");
    const destinationSelect = mapRoot.querySelector("[data-map-destination]");
    const map = L.map(mapElement).setView([48.1485, 17.091], 13);
    const fixedLayer = L.layerGroup().addTo(map);
    const customLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const markerIcon = L.divIcon({
      className: "map-marker-icon",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10]
    });
    const fixedMarkers = {};
    const customMarkers = new Map();
    let draftCoordinates = null;
    let selectedPlaceId = null;
    let customPlaces = loadPlaces();

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    Object.entries(fixedPlaces).forEach(([placeKey, place]) => {
      fixedMarkers[placeKey] = L.marker(place.coordinates, { icon: markerIcon })
        .addTo(fixedLayer)
        .bindPopup(createPopupContent(place.name));
    });

    function createPopupContent(title, details = "") {
      const container = document.createElement("div");
      const titleNode = document.createElement("strong");
      titleNode.textContent = title;
      container.append(titleNode);

      if (details) {
        const detailsNode = document.createElement("p");
        detailsNode.textContent = details;
        container.append(detailsNode);
      }

      return container;
    }

    function loadPlaces() {
      try {
        const savedPlaces = JSON.parse(localStorage.getItem(MAP_STORAGE_KEY));
        return Array.isArray(savedPlaces) ? savedPlaces : [];
      } catch {
        return [];
      }
    }

    function savePlaces() {
      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(customPlaces));
    }

    function calculateDistance(firstCoordinates, secondCoordinates) {
      const earthRadius = 6371;
      const toRadians = (value) => value * Math.PI / 180;
      const [firstLatitude, firstLongitude] = firstCoordinates;
      const [secondLatitude, secondLongitude] = secondCoordinates;
      const latitudeDifference = toRadians(secondLatitude - firstLatitude);
      const longitudeDifference = toRadians(secondLongitude - firstLongitude);
      const haversine = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(toRadians(firstLatitude)) * Math.cos(toRadians(secondLatitude))
        * Math.sin(longitudeDifference / 2) ** 2;

      return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }

    function selectPlace(placeId) {
      selectedPlaceId = placeId;
      renderPlaces();
      updateRoute();
    }

    function renderPlaces() {
      customLayer.clearLayers();
      customMarkers.clear();
      placeList.replaceChildren();
      emptyState.hidden = customPlaces.length > 0;

      if (!customPlaces.length) {
        distanceBlock.hidden = true;
        return;
      }

      const listTitle = document.createElement("h3");
      listTitle.textContent = "Vlastné miesta";
      const list = document.createElement("ul");

      customPlaces.forEach((place) => {
        const marker = L.marker(place.coordinates, { icon: markerIcon })
          .addTo(customLayer)
          .bindPopup(createPopupContent(place.name));
        customMarkers.set(place.id, marker);
        marker.on("click", () => selectPlace(place.id));

        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = place.name;
        button.classList.toggle("is-active", place.id === selectedPlaceId);
        button.addEventListener("click", () => {
          map.setView(place.coordinates, 15);
          selectPlace(place.id);
        });
        item.append(button);
        list.append(item);
      });

      placeList.append(listTitle, list);
      distanceBlock.hidden = !selectedPlaceId;
    }

    function updateRoute() {
      routeLayer.clearLayers();
      const selectedPlace = customPlaces.find((place) => place.id === selectedPlaceId);

      if (!selectedPlace) {
        distanceBlock.hidden = true;
        return;
      }

      const destination = fixedPlaces[destinationSelect.value];
      const distance = calculateDistance(selectedPlace.coordinates, destination.coordinates);
      const distanceLabel = `${distance.toFixed(2)} km vzdušnou čiarou`;
      const route = L.polyline([selectedPlace.coordinates, destination.coordinates], { color: "#111111", weight: 2 })
        .addTo(routeLayer)
        .bindPopup(createPopupContent("Vzdialenosť", distanceLabel));
      const selectedMarker = customMarkers.get(selectedPlace.id);

      Object.entries(fixedPlaces).forEach(([placeKey, place]) => {
        fixedMarkers[placeKey].bindPopup(createPopupContent(place.name));
      });

      selectedMarker.bindPopup(createPopupContent(selectedPlace.name, distanceLabel)).openPopup();
      fixedMarkers[destinationSelect.value].bindPopup(createPopupContent(destination.name, distanceLabel));
      route.bindTooltip(distanceLabel);
      distanceBlock.hidden = false;
    }

    map.on("click", (event) => {
      draftCoordinates = [event.latlng.lat, event.latlng.lng];
      coordinatesNode.textContent = `${draftCoordinates[0].toFixed(5)}, ${draftCoordinates[1].toFixed(5)}`;
      form.hidden = false;
      nameInput.value = "";
      nameInput.focus();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!draftCoordinates) {
        return;
      }

      const place = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: nameInput.value.trim(),
        coordinates: draftCoordinates
      };

      if (!place.name) {
        return;
      }

      customPlaces.push(place);
      savePlaces();
      form.hidden = true;
      draftCoordinates = null;
      selectPlace(place.id);
    });

    destinationSelect.addEventListener("change", updateRoute);
    renderPlaces();
  }
}
