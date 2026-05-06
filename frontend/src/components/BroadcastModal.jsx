import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SuggestPlaceModal from './SuggestPlaceModal';

const API = 'http://127.0.0.1:8000';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const period = h < 12 ? 'AM' : 'PM';
  const display = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${period}`;
  const value = `${String(h).padStart(2, '0')}:${m}`;
  return { value, display };
});

function toISO(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export default function BroadcastModal({ onConfirm, onClose }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('create');
  const [places, setPlaces] = useState([]);
  const [activeGatherings, setActiveGatherings] = useState([]);
  const [selectedGatheringId, setSelectedGatheringId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [noPlaceFound, setNoPlaceFound] = useState(false);
  const [locatedCoords, setLocatedCoords] = useState(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const [form, setForm] = useState(() => {
    const now = new Date();
    const totalMins = now.getHours() * 60 + now.getMinutes();
    const rounded = Math.round(totalMins / 30) * 30;
    const h = Math.floor(rounded / 60) % 24;
    const m = rounded % 60;
    return {
      title: '',
      place_id: '',
      start_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      end_date: '',
      end_time: '12:00',
      description: '',
      visibility: 'friends',
    };
  });

  useEffect(() => {
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id }))))
      .catch(() => { });
    fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setActiveGatherings(
        data.filter(g => g.status === 'active')
      ))
      .catch(() => { });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function distanceMiles(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setNoPlaceFound(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocatedCoords({ lat, lng });
        const THRESHOLD_MILES = 0.15;
        let closest = null;
        let closestDist = Infinity;
        for (const p of places) {
          if (!p.coordinates?.lat || !p.coordinates?.lng) continue;
          const d = distanceMiles(lat, lng, p.coordinates.lat, p.coordinates.lng);
          if (d < closestDist) { closestDist = d; closest = p; }
        }
        if (closest && closestDist <= THRESHOLD_MILES) {
          setField('place_id', closest.id);
          setNoPlaceFound(false);
        } else {
          setField('place_id', '');
          setNoPlaceFound(true);
        }
        setLocating(false);
      },
      () => setLocating(false),
    );
  }

  async function handleConfirm() {
    setError('');
    if (tab === 'create') {
      if (!form.title || !form.place_id) return;
      setCreating(true);
      try {
        const res = await fetch(`${API}/penguins/gatherings`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            place_id: form.place_id,
            datetime_start: new Date().toISOString(),
            datetime_end: form.end_date ? toISO(form.end_date, form.end_time) : null,
            description: form.description || null,
            visibility: form.visibility,
          }),
        });
        if (!res.ok) {
          setError('Failed to create gathering.');
          setCreating(false);
          return;
        }
        const created = await res.json();
        window.dispatchEvent(new CustomEvent('gathering-created'));
        onConfirm(created.id);
      } catch {
        setError('Failed to create gathering.');
        setCreating(false);
      }
    } else {
      if (!selectedGatheringId) return;
      onConfirm(selectedGatheringId);
    }
  }

  const canConfirm = tab === 'create'
    ? (form.title && form.place_id && !creating)
    : !!selectedGatheringId;

  function formatDt(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1" onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Start Broadcasting</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="text-muted small mb-3">
                Link your broadcast to a Gathering so friends can see you on the map.
              </p>

              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    className={`nav-link ${tab === 'create' ? 'active' : ''}`}
                    onClick={() => setTab('create')}
                  >
                    Create Gathering
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${tab === 'join' ? 'active' : ''}`}
                    onClick={() => setTab('join')}
                  >
                    Select an Active Gathering
                  </button>
                </li>
              </ul>

              {tab === 'create' && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Title <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Give your gathering a name"
                      value={form.title}
                      onChange={e => setField('title', e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Place <span className="text-danger">*</span></label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        value={form.place_id}
                        onChange={e => { setField('place_id', e.target.value); setNoPlaceFound(false); }}
                      >
                        <option value="">Select a place…</option>
                        {places.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm flex-shrink-0"
                        onClick={handleLocate}
                        disabled={locating}
                        title="Detect my current location"
                      >
                        {locating ? 'Locating…' : '📍'}
                      </button>
                    </div>
                    {noPlaceFound && (
                      <div className="mt-2 small text-muted d-flex align-items-center gap-2 flex-wrap">
                        We don't have your spot on Penguins. Add it?
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          onClick={() => setShowSuggestModal(true)}
                        >
                          Suggest a Place
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      End <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        type="date"
                        className="form-control"
                        value={form.end_date}
                        onChange={e => setField('end_date', e.target.value)}
                      />
                      <select
                        className="form-select"
                        style={{ maxWidth: 140 }}
                        value={form.end_time}
                        onChange={e => setField('end_time', e.target.value)}
                      >
                        {TIME_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.display}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="What's this gathering about?"
                      value={form.description}
                      onChange={e => setField('description', e.target.value)}
                    />
                  </div>
                  <div className="mb-1">
                    <label className="form-label">Visibility</label>
                    <select
                      className="form-select"
                      value={form.visibility}
                      onChange={e => setField('visibility', e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </>
              )}

              {tab === 'join' && (
                activeGatherings.length === 0 ? (
                  <p className="text-muted small">No active or upcoming gatherings available.</p>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {activeGatherings.map(g => {
                      const id = g._id ?? g.id;
                      const selected = selectedGatheringId === id;
                      return (
                        <button
                          key={id}
                          className={`btn text-start ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setSelectedGatheringId(id)}
                        >
                          <div className="fw-semibold">{g.title}</div>
                          <div className="small opacity-75">
                            <span className="text-capitalize">{g.status}</span>
                            {g.datetime_start && ` · ${formatDt(g.datetime_start)}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {error && <div className="alert alert-danger py-2 mt-3 mb-0 small">{error}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
                {creating ? 'Creating…' : 'Start Broadcasting'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSuggestModal && (
        <SuggestPlaceModal
          initialCoordinates={locatedCoords}
          onClose={() => setShowSuggestModal(false)}
        />
      )}
    </>
  );
}
