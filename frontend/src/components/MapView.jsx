import { useEffect, useRef } from 'react';

const IOWA_CITY = { lat: 41.6611, lng: -91.5355 };

// Google Maps dot icons are 32×32px source images.
// Default pin is 25% smaller (24px), selected is 25% larger (40px).
const SIZE_DEFAULT = 24;
const SIZE_SELECTED = 40;

function iconDefault() {
  return {
    url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new window.google.maps.Size(SIZE_DEFAULT, SIZE_DEFAULT),
    anchor: new window.google.maps.Point(SIZE_DEFAULT / 2, SIZE_DEFAULT / 2),
  };
}

function iconSelected() {
  return {
    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    scaledSize: new window.google.maps.Size(SIZE_SELECTED, SIZE_SELECTED),
    anchor: new window.google.maps.Point(SIZE_SELECTED / 2, SIZE_SELECTED / 2),
  };
}

function loadScript(apiKey) {
  if (document.getElementById('gmap-script')) return;
  const s = document.createElement('script');
  s.id = 'gmap-script';
  s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__gmapsReady`;
  s.async = true;
  document.head.appendChild(s);
}

function placeMarkers(map, places, onMarkerClick, markersRef, selectedPlaceId) {
  // Remove existing markers
  Object.values(markersRef.current).forEach(m => m.setMap(null));
  markersRef.current = {};

  places.forEach(p => {
    if (!p.coordinates) return;
    const marker = new window.google.maps.Marker({
      map,
      position: { lat: p.coordinates.lat, lng: p.coordinates.lng },
      title: p.name,
      icon: p.id === selectedPlaceId ? iconSelected() : iconDefault(),
    });
    marker.addListener('click', () => onMarkerClick?.(p.id));
    markersRef.current[p.id] = marker;
  });
}

export default function MapView({ places = [], onMarkerClick, selectedPlaceId }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  // Keep a stable ref to the latest callback so marker listeners stay fresh
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);

  const placesRef = useRef(places);
  useEffect(() => { placesRef.current = places; }, [places]);

  // Initialize map once, then place initial markers
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    function initMap() {
      if (!divRef.current || mapRef.current) return;
      mapRef.current = new window.google.maps.Map(divRef.current, {
        center: IOWA_CITY,
        zoom: 15,
      });
      placeMarkers(mapRef.current, placesRef.current, id => onMarkerClickRef.current?.(id), markersRef, null);
    }

    if (window.google?.maps) {
      initMap();
    } else {
      window.__gmapsReady = initMap;
      loadScript(apiKey);
    }
  }, []);

  // Re-render markers whenever places list changes
  useEffect(() => {
    if (!mapRef.current) return;
    placeMarkers(mapRef.current, places, id => onMarkerClickRef.current?.(id), markersRef, selectedPlaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // Update marker icons and pan/zoom when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([placeId, marker]) => {
      marker.setIcon(placeId === selectedPlaceId ? iconSelected() : iconDefault());
    });
    if (selectedPlaceId && markersRef.current[selectedPlaceId]) {
      const pos = markersRef.current[selectedPlaceId].getPosition();
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(17);
    }
  }, [selectedPlaceId]);

  return <div ref={divRef} style={{ height: '100%', width: '100%' }} />;
}
