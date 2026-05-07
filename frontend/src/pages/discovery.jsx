import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import SuggestPlaceModal from '../components/SuggestPlaceModal';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { calculateMatchRating } from '../utils/match';
import options from '../utils/options.json';
import StarIcon from '../assets/star.svg?react';

const API = 'http://127.0.0.1:8000';

function hasNoPreferences(prefs) {
  if (!prefs) return true;
  return (
    !prefs.max_distance_miles &&
    !prefs.wifi_required &&
    !prefs.outlets_required &&
    !prefs.parking_required &&
    (!prefs.preferred_types || prefs.preferred_types.length === 0)
  );
}


export default function Discovery() {
  const { token } = useAuth();
  const user = useUser();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('match');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    preferred_types: [],
    max_distance_miles: '',
    wifi_required: false,
    outlets_required: false,
    parking_required: false,
  });
  const cardRefs = useRef({});

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => setLocationLoading(false),
      { maximumAge: 300000, timeout: 8000, enableHighAccuracy: false },
    );
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id }))))
      .catch(() => { });
    fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setGatherings(data); })
      .catch(() => { });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/penguins/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(user => {
        setUserId(user.id);
        const alreadySeen = localStorage.getItem(`prefs_modal_seen_${user.id}`);
        if (!alreadySeen && hasNoPreferences(user.preferences)) {
          setShowPrefsModal(true);
        }
      })
      .catch(() => { });
  }, [token]);

  function dismissModal() {
    if (userId) localStorage.setItem(`prefs_modal_seen_${userId}`, '1');
    setShowPrefsModal(false);
  }

  async function savePrefs() {
    const body = {
      preferences: {
        ...prefs,
        max_distance_miles: prefs.max_distance_miles ? parseFloat(prefs.max_distance_miles) : null,
      },
    };
    const res = await fetch(`${API}/penguins/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) dismissModal();
  }

  function toggleType(type) {
    setPrefs(p => ({
      ...p,
      preferred_types: p.preferred_types.includes(type)
        ? p.preferred_types.filter(t => t !== type)
        : [...p.preferred_types, type],
    }));
  }

  function friendsHereCount(place) {
    const ids = new Set(
      gatherings
        .filter(g => g.place_id === place.id && g.status === 'active')
        .flatMap(g => g.participant_user_ids ?? [])
    );
    return (user?.friend_ids ?? []).filter(id => ids.has(id)).length;
  }

  function distanceKm(place) {
    if (!userLocation || !place.coordinates) return Infinity;
    const R = 6371;
    const dLat = (place.coordinates.lat - userLocation.lat) * Math.PI / 180;
    const dLng = (place.coordinates.lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(place.coordinates.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const filtered = places
    .filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase());
      const matchType = !selectedType || p.type_of_place === selectedType;
      const matchFavorites = !showFavoritesOnly || user?.favorite_places?.includes(p.id);
      return matchSearch && matchType && matchFavorites;
    })
    .sort((a, b) => {
      if (sortBy === 'friends') return friendsHereCount(b) - friendsHereCount(a);
      if (sortBy === 'distance') return distanceKm(a) - distanceKm(b);
      const rA = calculateMatchRating(a, user?.preferences) ?? -1;
      const rB = calculateMatchRating(b, user?.preferences) ?? -1;
      return rB - rA;
    });

  useEffect(() => {
    if (!selectedPlaceId) return;
    if (cardRefs.current[selectedPlaceId]) {
      cardRefs.current[selectedPlaceId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPlaceId]);

  useEffect(() => {
    if (selectedPlaceId && !filtered.some(p => p.id === selectedPlaceId)) {
      setSelectedPlaceId(null);
    }
  }, [filtered, selectedPlaceId]);

  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>
      <Navbar />

      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Left: scrollable content */}
        <div className="overflow-auto p-4" style={{ width: '55%' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Discover Places</h2>
            {user && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowSuggestModal(true)}
              >
                Don't see your spot?
              </button>
            )}
          </div>

          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="mb-4 d-flex gap-2 flex-wrap align-items-center">
            <button
              className="btn btn-sm"
              style={!selectedType
                ? { backgroundColor: '#212529', color: '#fff', borderColor: '#212529' }
                : { backgroundColor: 'transparent', color: '#6c757d', borderColor: '#6c757d', borderWidth: 1, borderStyle: 'solid' }
              }
              onClick={() => setSelectedType('')}
            >
              All
            </button>
            {options.place_types.map(({ value, label, color }) => {
              const active = selectedType === value;
              return (
                <button
                  key={value}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: active ? color : 'transparent',
                    borderColor: color,
                    color: active ? '#fff' : color,
                    borderWidth: 1,
                    borderStyle: 'solid',
                  }}
                  onClick={() => setSelectedType(active ? '' : value)}
                >
                  {label}
                </button>
              );
            })}
            <div className="vr mx-1" />
            <button
              className={`btn btn-sm ${showFavoritesOnly ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setShowFavoritesOnly(prev => !prev)}
            >
              <StarIcon width={14} height={14} style={{ verticalAlign: '-1px' }} /> Favorites
            </button>
          </div>

          <div className="mb-4 d-flex gap-2 align-items-center">
            <span className="small text-muted me-1">Sort by:</span>
            {[
              { key: 'match', label: 'Match %' },
              { key: 'friends', label: 'Friends Here' },
              { key: 'distance', label: 'Walk Distance' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`btn btn-sm ${sortBy === key ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setSortBy(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted">No places found.</p>
          ) : (
            <div className="row row-cols-1 row-cols-xl-2 g-3">
              {filtered.map(place => (
                <div
                  className="col"
                  key={place.id}
                  ref={el => { cardRefs.current[place.id] = el; }}
                  onClick={() => setSelectedPlaceId(place.id === selectedPlaceId ? null : place.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <PlaceCard place={place} gatherings={gatherings} highlighted={place.id === selectedPlaceId} userLocation={userLocation} locationLoading={locationLoading} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: map */}
        <div style={{ width: '45%' }}>
          <MapView
            places={filtered}
            selectedPlaceId={selectedPlaceId}
            onMarkerClick={setSelectedPlaceId}
            currentUser={user}
            gatherings={gatherings}
            markerMode="places"
          />
        </div>
      </div>

      {showSuggestModal && (
        <SuggestPlaceModal onClose={() => setShowSuggestModal(false)} />
      )}

      {/* Modal Popup if user hasn't set preferences */}
      {showPrefsModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Set Your Location Preferences</h5>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">Help us show you the most relevant places.</p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Preferred place types</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {options.place_types.map(({ value, label, color }) => {
                        const active = prefs.preferred_types.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: active ? color : 'transparent',
                              borderColor: color,
                              color: active ? '#fff' : color,
                              borderWidth: 1,
                              borderStyle: 'solid',
                            }}
                            onClick={() => toggleType(value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Max distance (miles)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 10"
                      min="5"
                      value={prefs.max_distance_miles}
                      onChange={e => setPrefs(p => ({ ...p, max_distance_miles: e.target.value }))}
                    />
                  </div>

                  <div className="mb-1">
                    <label className="form-label fw-semibold">Amenities</label>
                  </div>
                  {[['wifi_required', 'Wi-Fi'], ['outlets_required', 'Outlets'], ['parking_required', 'Parking']].map(([key, label]) => (
                    <div className="form-check mb-2" key={key}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={key}
                        checked={prefs[key]}
                        onChange={e => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor={key}>{label} required</label>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={dismissModal}>
                    Skip
                  </button>
                  <button className="btn btn-primary" onClick={savePrefs}>
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
