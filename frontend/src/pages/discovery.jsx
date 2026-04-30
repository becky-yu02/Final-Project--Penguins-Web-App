import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import mockPlaces from '../mock/places.json';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';
const PLACE_TYPES = [...new Set(mockPlaces.map(p => p.type_of_place))];

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
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [prefs, setPrefs] = useState({
    preferred_types: [],
    max_distance_miles: '',
    wifi_required: false,
    outlets_required: false,
    parking_required: false,
  });
  const cardRefs = useRef({});

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/penguins/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(user => {
        if (hasNoPreferences(user.preferences)) {
          setShowPrefsModal(true);
        }
      })
      .catch(() => { });
  }, [token]);

  async function savePrefs() {
    const body = {
      preferences: {
        ...prefs,
        max_distance_miles: prefs.max_distance_miles ? parseFloat(prefs.max_distance_miles) : null,
      },
    };
    await fetch(`${API}/penguins/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowPrefsModal(false);
  }

  function toggleType(type) {
    setPrefs(p => ({
      ...p,
      preferred_types: p.preferred_types.includes(type)
        ? p.preferred_types.filter(t => t !== type)
        : [...p.preferred_types, type],
    }));
  }

  const types = PLACE_TYPES;

  const filtered = mockPlaces.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    const matchType = !selectedType || p.type_of_place === selectedType;
    return matchSearch && matchType;
  });

  // Scroll to card when marker clicked
  useEffect(() => {
    if (!selectedPlaceId) return;
    if (cardRefs.current[selectedPlaceId]) {
      cardRefs.current[selectedPlaceId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPlaceId]);

  // Clear selection if the selected place is filtered out
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
          <h2 className="mb-4">Discover Places</h2>

          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="mb-4 d-flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm ${!selectedType ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedType('')}
            >
              All
            </button>
            {types.map(type => (
              <button
                key={type}
                className={`btn btn-sm ${selectedType === type ? 'btn-dark' : 'btn-outline-secondary'} text-capitalize`}
                onClick={() => setSelectedType(type)}
              >
                {type}
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
                  <PlaceCard place={place} highlighted={place.id === selectedPlaceId} />
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
                  <button className="btn btn-outline-secondary" onClick={() => setShowPrefsModal(false)}>
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
