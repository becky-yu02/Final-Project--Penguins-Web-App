import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import options from '../utils/options.json';
import StarIcon from '../assets/star.svg?react';

const API = 'http://127.0.0.1:8000';
const STAR_SIZE = 36;

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;
  const clear = useCallback(() => setHovered(null), []);

  return (
    <div className="d-flex gap-1" onMouseLeave={clear}>
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star;
        const half = !full && display >= star - 0.5;
        return (
          <div key={star} style={{ position: 'relative', width: STAR_SIZE, height: STAR_SIZE, flexShrink: 0 }}>
            <StarIcon width={STAR_SIZE} height={STAR_SIZE} style={{ color: '#dee2e6', display: 'block' }} />
            {(full || half) && (
              <StarIcon
                width={STAR_SIZE}
                height={STAR_SIZE}
                style={{
                  color: '#ffc107',
                  position: 'absolute',
                  top: 0, left: 0,
                  clipPath: half ? 'inset(0 50% 0 0)' : 'none',
                }}
              />
            )}
            <button
              type="button"
              aria-label={`${star - 0.5} stars`}
              onMouseEnter={() => setHovered(star - 0.5)}
              onClick={() => onChange(value === star - 0.5 ? null : star - 0.5)}
              style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
            <button
              type="button"
              aria-label={`${star} stars`}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(value === star ? null : star)}
              style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
          </div>
        );
      })}
    </div>
  );
}

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

export default function SuggestPlaceModal({ onClose, initialCoordinates = null }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', address: '', type_of_place: '' });
  const [coordinates, setCoordinates] = useState(initialCoordinates);
  const [coordSource, setCoordSource] = useState(initialCoordinates ? 'geolocation' : null);
  const [coordError, setCoordError] = useState('');
  const [geolocating, setGeolocating] = useState(false);
  const [note, setNote] = useState({
    wifi_available: null,
    outlets_available: null,
    parking_available: null,
    food_available: null,
    rating: null,
    feel: [],
    comment: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
    geocoder.geocode({ address: address.trim() }, (results, gStatus) => {
      if (gStatus === 'OK' && results[0]) {
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

  // Reverse-geocode when coordinates come from geolocation
  useEffect(() => {
    if (coordSource !== 'geolocation' || !coordinates) return;
    if (!window.google?.maps) { setGeolocating(false); return; }
    let cancelled = false;
    new window.google.maps.Geocoder().geocode({ location: coordinates }, (results, gStatus) => {
      if (cancelled) return;
      if (gStatus === 'OK' && results[0]) {
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

  const canSubmit = form.name.trim() && form.address.trim() && form.type_of_place && note.comment.trim() && note.feel.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
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
      if (!placeRes.ok) {
        if (placeRes.status === 409) {
          alert('This spot has already been submitted for review. Check back soon!');
        } else {
          alert('Failed to submit suggestion. Please try again.');
        }
        setSaving(false);
        return;
      }

      const { id } = await placeRes.json();

      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        await fetch(`${API}/penguins/places/${id}/photos`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      const noteRes = await fetch(`${API}/penguins/places/${id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wifi_available: note.wifi_available,
          outlets_available: note.outlets_available,
          parking_available: note.parking_available,
          food_available: note.food_available,
          rating: note.rating,
          feel: note.feel.length > 0 ? note.feel : null,
          comment: note.comment.trim(),
        }),
      });
      if (noteRes.ok) {
        alert('Suggestion submitted! It will appear on the map after admin review.');
        onClose();
      } else {
        alert('Failed to submit suggestion. Please try again.');
        setSaving(false);
      }
    } catch {
      alert('Failed to submit suggestion. Please try again.');
      setSaving(false);
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
                    className="btn btn-outline-primary btn-sm flex-shrink-0 ms-auto"
                    onClick={useGeolocation}
                    disabled={geolocating}
                    title="Use my current location instead"
                  >
                    {geolocating ? 'Locating…' : '📍'}
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
                  <option value="">Select a type</option>
                  {options.place_types.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
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
                <label className="form-label fw-semibold">
                  Rating{note.rating != null && <span className="text-muted fw-normal ms-2">{note.rating} / 5</span>}
                </label>
                <StarRating value={note.rating} onChange={v => setNoteField('rating', v)} />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Vibe <span className="text-muted fw-normal">({note.feel.length}/3)</span>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {options.vibes.map(({ label, color }) => {
                    const value = label.toLowerCase();
                    const selected = note.feel.includes(value);
                    const atLimit = note.feel.length >= 3;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={!selected && atLimit}
                        onClick={() => setNoteField('feel',
                          selected ? note.feel.filter(f => f !== value) : [...note.feel, value]
                        )}
                        style={{
                          backgroundColor: selected ? color : 'transparent',
                          borderColor: color,
                          color: selected ? '#fff' : color,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          opacity: !selected && atLimit ? 0.35 : 1,
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
                  placeholder="Share what makes this spot worth visiting"
                  maxLength={200}
                  value={note.comment}
                  onChange={e => setNoteField('comment', e.target.value)}
                />
                <div className={`text-end small mt-1 ${note.comment.length >= 200 ? 'text-danger' : 'text-muted'}`}>
                  {note.comment.length}/200
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold">
                  Photo <span className="text-muted fw-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={e => setPhotoFile(e.target.files[0] ?? null)}
                />
                {photoFile && (
                  <img
                    src={URL.createObjectURL(photoFile)}
                    alt="preview"
                    className="mt-2 rounded"
                    style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving || !canSubmit}
              >
                {saving ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
