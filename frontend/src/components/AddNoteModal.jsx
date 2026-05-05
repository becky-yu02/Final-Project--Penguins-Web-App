import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';

function AmenityToggle({ label, value, onToggle }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <span className="small" style={{ minWidth: '80px' }}>{label}</span>
      <div className="btn-group btn-group-sm">
        <button
          type="button"
          className={`btn ${value === true ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => onToggle(value === true ? null : true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`btn ${value === false ? 'btn-danger' : 'btn-outline-secondary'}`}
          onClick={() => onToggle(value === false ? null : false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function AddNoteModal({ place, onClose }) {
  const { token } = useAuth();
  const placeId = place._id ?? place.id;

  const [note, setNote] = useState({
    wifi_available: null,
    outlets_available: null,
    parking_available: null,
    food_available: null,
    comment: '',
    image_url: '',
  });
  const [saveStatus, setSaveStatus] = useState('');

  function setField(field, value) {
    setNote(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaveStatus('saving');
    const body = {
      wifi_available: note.wifi_available,
      outlets_available: note.outlets_available,
      parking_available: note.parking_available,
      food_available: note.food_available,
      comment: note.comment || null,
      image_url: note.image_url || null,
    };
    try {
      const res = await fetch(`${API}/penguins/places/${placeId}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(onClose, 1500);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  }

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Note — {place.name}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <h6 className="mb-2">Amenities</h6>
              <AmenityToggle label="Wi-Fi" value={note.wifi_available} onToggle={v => setField('wifi_available', v)} />
              <AmenityToggle label="Outlets" value={note.outlets_available} onToggle={v => setField('outlets_available', v)} />
              <AmenityToggle label="Parking" value={note.parking_available} onToggle={v => setField('parking_available', v)} />
              <AmenityToggle label="Food" value={note.food_available} onToggle={v => setField('food_available', v)} />

              <hr />
              <div className="mb-3">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Share your experience…"
                  value={note.comment}
                  onChange={e => setField('comment', e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">
                  Image URL <span className="text-muted fw-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://…"
                  value={note.image_url}
                  onChange={e => setField('image_url', e.target.value)}
                />
              </div>

              {saveStatus === 'saved' && (
                <div className="alert alert-success py-2 mt-3 mb-0">Note submitted!</div>
              )}
              {saveStatus === 'error' && (
                <div className="alert alert-danger py-2 mt-3 mb-0">Failed to submit. Please try again.</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Submitting…' : 'Submit Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
