import { useState, useRef, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { calculateMatchRating } from '../utils/match';
import vibeOptions from '../utils/vibe_options.json';

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

const PLACE_TYPE_OPTIONS = [
  'cafe', 'library', 'study_space', 'student_union', 'bar', 'restaurant', 'park', 'other',
];

function AmenityToggle({ label, value, onToggle }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <span className="small" style={{ minWidth: '80px' }}>{label}</span>
      <div className="btn-group btn-group-sm">
        <button
          type="button"
          className={`btn ${value === true ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => onToggle(value === true ? null : true)}
        >Yes</button>
        <button
          type="button"
          className={`btn ${value === false ? 'btn-danger' : 'btn-outline-secondary'}`}
          onClick={() => onToggle(value === false ? null : false)}
        >No</button>
      </div>
    </div>
  );
}

function SuggestPlaceModal({ token, onClose }) {
  const [form, setForm] = useState({ name: '', address: '', type_of_place: '' });
  const [coordinates, setCoordinates] = useState(null);
  const [coordSource, setCoordSource] = useState(null); // 'geocoded' | 'geolocation'
  const [coordError, setCoordError] = useState('');
  const [geolocating, setGeolocating] = useState(false);
  const [note, setNote] = useState({
    wifi_available: null,
    outlets_available: null,
    parking_available: null,
    food_available: null,
    rating: null,
    feel: '',
    comment: '',
    image_url: '',
  });
  const [status, setStatus] = useState('');

  function setFormField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }
  function setNoteField(field, value) {
    setNote(prev => ({ ...prev, [field]: value }));
  }

  function geocodeAddress(address) {
    if (!address.trim() || !window.google?.maps) return;
    setCoordError('');
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: address.trim() }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setCoordinates({ lat: loc.lat(), lng: loc.lng() });
        setCoordSource('geocoded');
      } else {
        setCoordinates(null);
        setCoordSource(null);
        setCoordError('Address not found — coordinates will be omitted.');
      }
    });
  }

  useEffect(() => {
    if (coordSource !== 'geolocation' || !coordinates) return;
    if (!window.google?.maps) { setGeolocating(false); return; }
    let cancelled = false;
    new window.google.maps.Geocoder().geocode({ location: coordinates }, (results, status) => {
      if (cancelled) return;
      if (status === 'OK' && results[0]) {
        setForm(prev => ({ ...prev, address: results[0].formatted_address }));
      }
      setGeolocating(false);
    });
    return () => { cancelled = true; };
  }, [coordinates, coordSource]); // eslint-disable-line react-hooks/exhaustive-deps

  function useGeolocation() {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    setCoordError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordSource('geolocation');
      },
      () => {
        setCoordError('Could not get your location.');
        setGeolocating(false);
      },
    );
  }

  const canSubmit = form.name.trim() && form.address.trim() && form.type_of_place && note.comment.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus('saving');
    try {
      const placeRes = await fetch(`${API}/penguins/places`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          type_of_place: form.type_of_place,
          coordinates: coordinates ?? null,
        }),
      });
      if (!placeRes.ok) { setStatus('error'); setTimeout(() => setStatus(''), 3000); return; }

      const { id } = await placeRes.json();
      const noteRes = await fetch(`${API}/penguins/places/${id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wifi_available: note.wifi_available,
          outlets_available: note.outlets_available,
          parking_available: note.parking_available,
          food_available: note.food_available,
          rating: note.rating,
          feel: note.feel || null,
          comment: note.comment.trim(),
          image_url: note.image_url || null,
        }),
      });
      setStatus(noteRes.ok ? 'saved' : 'error');
      if (noteRes.ok) setTimeout(onClose, 2000);
      else setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(''), 3000);
    }
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Suggest a Place</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="text-muted small mb-3">
                Suggestions are reviewed by an admin before appearing on the map.
              </p>

              {/* Place fields */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. The Java House"
                  value={form.name}
                  onChange={e => setFormField('name', e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Address <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 211 E Washington St, Iowa City, IA"
                  value={form.address}
                  onChange={e => { setFormField('address', e.target.value); setCoordinates(null); setCoordSource(null); setCoordError(''); }}
                  onBlur={e => geocodeAddress(e.target.value)}
                />
                <div className="d-flex align-items-center gap-2 mt-2">
                  {coordSource === 'geocoded' && (
                    <span className="small text-success">&#10003; Coordinates found from address</span>
                  )}
                  {coordSource === 'geolocation' && (
                    <span className="small text-success">&#10003; Using your current location</span>
                  )}
                  {coordError && <span className="small text-warning">{coordError}</span>}
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm ms-auto"
                    onClick={useGeolocation}
                    disabled={geolocating}
                    title="Use my current location instead"
                  >
                    {geolocating ? 'Locating…' : "I'm here"}
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Type <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  value={form.type_of_place}
                  onChange={e => setFormField('type_of_place', e.target.value)}
                >
                  <option value="">Select a type…</option>
                  {PLACE_TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <hr />
              <h6 className="mb-3">Your Note <span className="text-danger">*</span></h6>

              <AmenityToggle label="Wi-Fi" value={note.wifi_available} onToggle={v => setNoteField('wifi_available', v)} />
              <AmenityToggle label="Outlets" value={note.outlets_available} onToggle={v => setNoteField('outlets_available', v)} />
              <AmenityToggle label="Parking" value={note.parking_available} onToggle={v => setNoteField('parking_available', v)} />
              <AmenityToggle label="Food" value={note.food_available} onToggle={v => setNoteField('food_available', v)} />

              <div className="mb-3 mt-2">
                <label className="form-label fw-semibold">Rating</label>
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className="btn btn-link p-0 lh-1 fs-5"
                      style={{ color: note.rating >= star ? '#ffc107' : '#dee2e6' }}
                      onClick={() => setNoteField('rating', note.rating === star ? null : star)}
                      aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                    >★</button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Vibe <span className="text-muted fw-normal">(optional)</span>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {vibeOptions.vibes.map(({ label, color }) => {
                    const selected = note.feel === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setNoteField('feel', selected ? '' : label)}
                        style={{
                          backgroundColor: selected ? color : 'transparent',
                          borderColor: color,
                          color: selected ? '#fff' : color,
                          borderWidth: 1,
                          borderStyle: 'solid',
                        }}
                        className="btn btn-sm"
                      >{label}</button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Comment <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Share what makes this spot worth visiting…"
                  value={note.comment}
                  onChange={e => setNoteField('comment', e.target.value)}
                />
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold">
                  Image URL <span className="text-muted fw-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://…"
                  value={note.image_url}
                  onChange={e => setNoteField('image_url', e.target.value)}
                />
              </div>

              {status === 'saved' && (
                <div className="alert alert-success py-2 mt-3 mb-0">
                  Suggestion submitted! It will appear after admin review.
                </div>
              )}
              {status === 'error' && (
                <div className="alert alert-danger py-2 mt-3 mb-0">Failed to submit. Please try again.</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={status === 'saving' || !canSubmit}
              >
                {status === 'saving' ? 'Submitting…' : 'Submit Suggestion'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Discovery() {
  const { token } = useAuth();
  const user = useUser();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
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
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { },
    );
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id }))))
      .catch(() => { });
    fetch(`${API}/penguins/gatherings`)
      .then(r => r.json())
      .then(setGatherings)
      .catch(() => { });
  }, []);

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

  const PLACE_TYPES = useMemo(
    () => [...new Set(places.map(p => p.type_of_place))].sort(),
    [places]
  );

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
              className={`btn btn-sm ${!selectedType ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedType('')}
            >
              All
            </button>
            {PLACE_TYPES.map(type => (
              <button
                key={type}
                className={`btn btn-sm ${selectedType === type ? 'btn-dark' : 'btn-outline-secondary'} text-capitalize`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
            <div className="vr mx-1" />
            <button
              className={`btn btn-sm ${showFavoritesOnly ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setShowFavoritesOnly(prev => !prev)}
            >
              ★ Favorites
            </button>
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
                  <PlaceCard place={place} gatherings={gatherings} highlighted={place.id === selectedPlaceId} userLocation={userLocation} />
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
          />
        </div>
      </div>

      {showSuggestModal && (
        <SuggestPlaceModal token={token} onClose={() => setShowSuggestModal(false)} />
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
                      {PLACE_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          className={`btn btn-sm text-capitalize ${prefs.preferred_types.includes(type) ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => toggleType(type)}
                        >
                          {type}
                        </button>
                      ))}
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
