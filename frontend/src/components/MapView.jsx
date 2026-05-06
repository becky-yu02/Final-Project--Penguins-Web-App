import { useEffect, useRef } from 'react';

const IOWA_CITY = { lat: 41.6611, lng: -91.5355 };

async function createAvatarIcon(imageUrl, initials, size = 42) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Clip everything to a circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  let drewImage = false;
  if (imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toDataURL(); // throws if canvas is CORS-tainted
      drewImage = true;
    } catch {
      ctx.clearRect(0, 0, size, size);
    }
  }

  if (!drewImage) {
    ctx.fillStyle = '#5c6bc0';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.round(size * 0.36)}px Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);
  }

  // White border ring
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
  ctx.stroke();

  return {
    url: canvas.toDataURL(),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
}

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

export default function MapView({ places = [], onMarkerClick, selectedPlaceId, friendMarkers = [] }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const friendMarkersRef = useRef({});
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

  // Render circular avatar markers for broadcasting friends
  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(friendMarkersRef.current).forEach(m => m.setMap(null));
    friendMarkersRef.current = {};

    let cancelled = false;
    friendMarkers.forEach(async (f) => {
      const initials = f.name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);
      const icon = await createAvatarIcon(f.imageUrl, initials);
      if (cancelled || !mapRef.current) return;
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: f.position,
        title: `${f.name} (@${f.username}) · Broadcasting`,
        icon,
        zIndex: 10,
      });
      friendMarkersRef.current[f.userId] = marker;
    });

    return () => { cancelled = true; };
  }, [friendMarkers]); // eslint-disable-next-line react-hooks/exhaustive-deps

  return <div ref={divRef} style={{ height: '100%', width: '100%' }} />;
}
