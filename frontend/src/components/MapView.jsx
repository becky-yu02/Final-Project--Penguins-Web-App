import { useEffect, useRef, useState } from 'react';
import options from '../utils/options.json';

import cafeIconUrl from '../assets/cafe.svg';
import libraryIconUrl from '../assets/library.svg';
import publicIconUrl from '../assets/public.svg';
import universityIconUrl from '../assets/university.svg';
import barIconUrl from '../assets/bar.svg';
import restaurantIconUrl from '../assets/restaurant.svg';
import parkIconUrl from '../assets/park.svg';
import otherIconUrl from '../assets/other.svg';
import starIconUrl from '../assets/star.svg';
import groupIconUrl from '../assets/group.svg';
import friendIconUrl from '../assets/friend.svg';

const IOWA_CITY = { lat: 41.6611, lng: -91.5355 };

const typeIconUrls = {
  cafe: cafeIconUrl,
  library: libraryIconUrl,
  public: publicIconUrl,
  university: universityIconUrl,
  bar: barIconUrl,
  restaurant: restaurantIconUrl,
  park: parkIconUrl,
  other: otherIconUrl,
};

const TYPE_ICONS = Object.fromEntries(
  options.place_types.map(pt => [pt.value, { url: typeIconUrls[pt.value] ?? otherIconUrl, color: pt.color }])
);

// Fetch SVG text once, cache by URL, then recolor by replacing currentColor on demand
const svgTextCache = new Map();

async function preloadSvgTexts(urls) {
  await Promise.all(
    urls.filter(u => !svgTextCache.has(u)).map(async u => {
      try {
        const text = await fetch(u).then(r => r.text());
        svgTextCache.set(u, text);
      } catch { /* ignore */ }
    })
  );
}

function svgImg(url, color, size) {
  const text = svgTextCache.get(url);
  if (!text) return `<span style="display:inline-block;width:${size}px;height:${size}px;flex-shrink:0;"></span>`;
  const colored = text.replace(/currentColor/gi, color);
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`;
  return `<img src="${dataUri}" width="${size}" height="${size}" style="flex-shrink:0;" />`;
}

function avatarHTML(imageUrl, initials) {
  if (imageUrl) {
    return `<img class="avatar-img" src="${imageUrl}" alt="${initials}" data-initials="${initials}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,0.8);flex-shrink:0;" />`;
  }
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#5c6bc0;color:white;font-size:9px;font-weight:700;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.8);">${initials}</span>`;
}

function buildMarkerHTML({ isFavorite, typeIcon, gatheringVisibility, friendAvatars, isSelected }) {
  const bg = isSelected ? '#1a73e8' : '#ffffff';
  const triColor = isSelected ? '#1a73e8' : '#ffffff';
  const tIcon = typeIcon ?? TYPE_ICONS.other;
  const iconFg = isSelected ? '#ffffff' : null;

  const parts = [];

  if (isFavorite) {
    parts.push(svgImg(starIconUrl, '#ffd700', 16));
  }

  parts.push(svgImg(tIcon.url, iconFg ?? tIcon.color, 18));

  if (gatheringVisibility === 'public') {
    parts.push(svgImg(groupIconUrl, iconFg ?? '#555555', 16));
  } else if (gatheringVisibility === 'friends' || gatheringVisibility === 'private') {
    parts.push(svgImg(friendIconUrl, iconFg ?? '#555555', 16));
  }

  const shown = (friendAvatars ?? []).slice(0, 2);
  const extra = (friendAvatars ?? []).length - shown.length;
  shown.forEach(f => parts.push(avatarHTML(f.imageUrl, f.initials)));
  if (extra > 0) {
    parts.push(`<span style="font-size:10px;font-weight:700;color:${isSelected ? '#fff' : '#444'};line-height:1;flex-shrink:0;">+${extra}</span>`);
  }

  return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;"><div style="background:${bg};border-radius:8px;padding:5px 8px;display:flex;align-items:center;gap:4px;white-space:nowrap;">${parts.join('')}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid ${triColor};margin-top:-1px;flex-shrink:0;"></div></div>`;
}

let CustomMarkerClass = null;

function ensureCustomMarkerClass() {
  if (CustomMarkerClass) return;
  class CustomMarker extends window.google.maps.OverlayView {
    constructor(latLng, opts) {
      super();
      this.latLng = latLng;
      this.opts = opts;
      this.div = null;
    }

    onAdd() {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;cursor:pointer;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.28));';
      this.div = el;
      this._syncDOM();
      el.addEventListener('click', e => {
        e.stopPropagation();
        this.opts.onClick?.();
      });
      this.getPanes().overlayMouseTarget.appendChild(el);
    }

    _syncDOM() {
      if (!this.div) return;
      this.div.innerHTML = buildMarkerHTML(this.opts);
      this.div.style.zIndex = this.opts.isSelected ? '100' : '10';
      this.div.querySelectorAll('img.avatar-img').forEach(img => {
        img.addEventListener('error', () => {
          const span = document.createElement('span');
          span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#5c6bc0;color:white;font-size:9px;font-weight:700;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.8);';
          span.textContent = img.dataset.initials || '?';
          img.parentNode?.replaceChild(span, img);
        }, { once: true });
      });
    }

    draw() {
      if (!this.div) return;
      const pt = this.getProjection()?.fromLatLngToDivPixel(this.latLng);
      if (!pt) return;
      this.div.style.left = pt.x + 'px';
      this.div.style.top = pt.y + 'px';
      this.div.style.transform = 'translate(-50%, -100%)';
    }

    onRemove() {
      this.div?.parentNode?.removeChild(this.div);
      this.div = null;
    }

    update(opts) {
      this.opts = opts;
      this._syncDOM();
    }
  }
  CustomMarkerClass = CustomMarker;
}

function loadScript(apiKey) {
  if (document.getElementById('gmap-script')) return;
  const s = document.createElement('script');
  s.id = 'gmap-script';
  s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__gmapsReady`;
  s.async = true;
  document.head.appendChild(s);
}

function getInitials(first, last) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function getFriendsAtPlace(placeId, friendsData, gatherings) {
  return friendsData
    .filter(f => {
      if (!f.online_status?.broadcasting || !f.online_status?.current_gathering_id) return false;
      const g = gatherings.find(g => (g._id ?? g.id) === f.online_status.current_gathering_id);
      return g?.place_id === placeId;
    })
    .map(f => ({
      imageUrl: f.profile_image_url ?? null,
      initials: getInitials(f.first_name, f.last_name),
    }));
}

function getGatheringAtPlace(placeId, gatherings) {
  return (
    gatherings.find(g => g.place_id === placeId && g.status === 'active') ??
    gatherings.find(g => g.place_id === placeId && g.status === 'scheduled') ??
    null
  );
}

export default function MapView({
  places = [],
  onMarkerClick,
  selectedPlaceId,
  currentUser = null,
  gatherings = [],
  friendsData = [],
  markerMode = 'gatherings',
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onMarkerClickRef = useRef(onMarkerClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const allSvgUrls = [...Object.values(typeIconUrls), starIconUrl, groupIconUrl, friendIconUrl];

    function initMap() {
      if (!divRef.current || mapRef.current) return;
      mapRef.current = new window.google.maps.Map(divRef.current, {
        center: IOWA_CITY,
        zoom: 15,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
      });
      preloadSvgTexts(allSvgUrls).then(() => setMapReady(true));
    }

    if (window.google?.maps) {
      initMap();
    } else {
      window.__gmapsReady = initMap;
      loadScript(apiKey);
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    ensureCustomMarkerClass();

    const activeIds = new Set(places.map(p => p.id).filter(Boolean));

    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    places.forEach(p => {
      if (!p.coordinates) return;

      const isFavorite = markerMode === 'places' && (currentUser?.favorite_places ?? []).includes(p.id);
      const typeIcon = TYPE_ICONS[p.type_of_place] ?? TYPE_ICONS.other;
      const gathering = markerMode === 'gatherings' ? getGatheringAtPlace(p.id, gatherings) : null;
      const gatheringVisibility = gathering?.visibility ?? null;
      const friendAvatars = getFriendsAtPlace(p.id, friendsData, gatherings);
      const isSelected = p.id === selectedPlaceId;

      const opts = {
        isFavorite,
        typeIcon,
        gatheringVisibility,
        friendAvatars,
        isSelected,
        onClick: () => onMarkerClickRef.current?.(p.id),
      };

      if (markersRef.current[p.id]) {
        markersRef.current[p.id].update(opts);
      } else {
        const latLng = new window.google.maps.LatLng(p.coordinates.lat, p.coordinates.lng);
        const marker = new CustomMarkerClass(latLng, opts);
        marker.setMap(mapRef.current);
        markersRef.current[p.id] = marker;
      }
    });
  }, [mapReady, places, selectedPlaceId, currentUser, gatherings, friendsData, markerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedPlaceId && markersRef.current[selectedPlaceId]) {
      mapRef.current?.panTo(markersRef.current[selectedPlaceId].latLng);
      mapRef.current?.setZoom(17);
    }
  }, [selectedPlaceId]);

  return <div ref={divRef} style={{ height: '100%', width: '100%' }} />;
}
