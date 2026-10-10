const mapRoot = document.querySelector("[data-map-root]");

if (mapRoot) {
  const mapError = mapRoot.querySelector("[data-map-error]");

  if (!window.L) {
    mapError.hidden = false;
  } else {
    const MAP_STORAGE_KEY = "bohdan-sukhina-map-places";
    const fixedPlaces = {
      school: { name: "STU FEI", coordinates: [48.1517, 17.0727] },
      home: { name: "Domov ", coordinates: [48.1382, 17.1122] }
    };
    const mapElement = mapRoot.querySelector("#personal-map");
    const form = mapRoot.querySelector("[data-map-add-form]");
    const nameInput = form.elements["place-name"];
    const coordinatesNode = mapRoot.querySelector("[data-map-coordinates]");
    const placeList = mapRoot.querySelector("[data-map-place-list]");
    const emptyState = mapRoot.querySelector("[data-map-empty-state]");
    const distanceBlock = mapRoot.querySelector("[data-map-distance]");
    const destinationSelect = mapRoot.querySelector("[data-map-destination]");
    const map = L.map(mapElement).setView([48.1382, 17.1122], 13);
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
