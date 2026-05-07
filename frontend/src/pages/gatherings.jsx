import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import GatheringCard from '../components/GatheringCard';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import StarIcon from '../assets/star.svg?react';
import { isCurrentOrUpcoming } from '../utils/gathering_time_check';

const API = 'http://127.0.0.1:8000';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_15 = ['00', '15', '30', '45'];

function TimePicker({ value, onChange }) {
  const [hStr, mStr] = value.split(':');
  const h24 = parseInt(hStr, 10);
  const period = h24 < 12 ? 'AM' : 'PM';
  const hour12 = h24 % 12 || 12;
  const minute = mStr;

  function update(newHour12, newMinute, newPeriod) {
    const h = newPeriod === 'AM'
      ? (newHour12 === 12 ? 0 : newHour12)
      : (newHour12 === 12 ? 12 : newHour12 + 12);
    onChange(`${String(h).padStart(2, '0')}:${newMinute}`);
  }

  return (
    <div className="d-flex gap-1">
      <select className="form-select px-2" style={{ width: '68px' }} value={hour12} onChange={e => update(Number(e.target.value), minute, period)}>
        {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <select className="form-select px-2" style={{ width: '68px' }} value={minute} onChange={e => update(hour12, e.target.value, period)}>
        {MINUTES_15.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className="form-select px-2" style={{ width: '72px' }} value={period} onChange={e => update(hour12, minute, e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function toISO(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

function fromISO(isoStr) {
  if (!isoStr) return { date: '', time: '09:00' };
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const slot = Math.round((d.getHours() * 60 + d.getMinutes()) / 30) * 30;
  const rh = Math.floor(slot / 60) % 24;
  const rm = slot % 60;
  return {
    date: `${year}-${month}-${day}`,
    time: `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`,
  };
}

function PlaceSearch({ places, value, onChange }) {
  const user = useUser();
  const favorites = user?.favorite_places ?? [];
  const [query, setQuery] = useState(() => places.find(p => p.id === value)?.name ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const match = places.find(p => p.id === value);
    setQuery(match?.name ?? '');
  }, [value, places]);

  const filtered = query
    ? places.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.address ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : [...places].sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 0 : 1;
        const bFav = favorites.includes(b.id) ? 0 : 1;
        return aFav - bFav;
      });

  return (
    <div className="position-relative">
      <input
        type="text"
        className="form-control"
        placeholder="Search places…"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '220px', overflowY: 'auto', top: '100%' }}>
          {filtered.slice(0, 10).map(p => (
            <li
              key={p.id}
              className={`list-group-item list-group-item-action py-2 ${value === p.id ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onMouseDown={() => { onChange(p.id); setOpen(false); }}
            >
              <div className="small fw-semibold d-flex align-items-center gap-1">
                {favorites.includes(p.id) && <StarIcon width={12} height={12} style={{ color: '#ffd700', flexShrink: 0 }} />}
                {p.name}
              </div>
              {p.address && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.address}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateGatheringModal({ places, onClose, onCreated }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: '',
    place_id: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    description: '',
    visibility: 'public',
  });
  const [status, setStatus] = useState('');

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.title || !form.place_id || !form.start_date) return;
    setStatus('saving');
    const body = {
      title: form.title,
      place_id: form.place_id,
      datetime_start: toISO(form.start_date, form.start_time),
      datetime_end: form.end_date ? toISO(form.end_date, form.end_time) : null,
      description: form.description || null,
      visibility: form.visibility,
    };
    try {
      const res = await fetch(`${API}/penguins/gatherings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setStatus('saved');
        setTimeout(() => { window.dispatchEvent(new CustomEvent('gathering-created')); onCreated(created); onClose(); }, 1000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(''), 3000);
    }
  }

  const canSubmit = form.title && form.place_id && form.start_date && status !== 'saving';

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Create Gathering</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
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
                <PlaceSearch places={places} value={form.place_id} onChange={v => setField('place_id', v)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Start <span className="text-danger">*</span></label>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    type="date"
                    className="form-control"
                    style={{ minWidth: '150px', flex: '1' }}
                    value={form.start_date}
                    onChange={e => setField('start_date', e.target.value)}
                  />
                  <TimePicker value={form.start_time} onChange={v => setField('start_time', v)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  End <span className="text-muted fw-normal">(optional)</span>
                </label>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    type="date"
                    className="form-control"
                    style={{ minWidth: '150px', flex: '1' }}
                    value={form.end_date}
                    onChange={e => setField('end_date', e.target.value)}
                  />
                  <TimePicker value={form.end_time} onChange={v => setField('end_time', v)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Description <span className="text-muted fw-normal">(optional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="What's this gathering about?"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                />
              </div>
              <div className="mb-2">
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

              {status === 'saved' && (
                <div className="alert alert-success py-2 mt-3 mb-0">Gathering created!</div>
              )}
              {status === 'error' && (
                <div className="alert alert-danger py-2 mt-3 mb-0">Failed to create. Please try again.</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {status === 'saving' ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EditGatheringModal({ gathering, onClose, onUpdated }) {
  const { token } = useAuth();
  const startParts = fromISO(gathering.datetime_start);
  const endParts = fromISO(gathering.datetime_end);
  const [form, setForm] = useState({
    title: gathering.title ?? '',
    start_date: startParts.date,
    start_time: startParts.time,
    end_date: endParts.date,
    end_time: endParts.time,
    description: gathering.description ?? '',
    visibility: gathering.visibility ?? 'public',
    status: gathering.status ?? 'scheduled',
  });
  const [status, setStatus] = useState('');

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.title || !form.start_date) return;
    setStatus('saving');
    const body = {
      title: form.title,
      datetime_start: toISO(form.start_date, form.start_time),
      datetime_end: form.end_date ? toISO(form.end_date, form.end_time) : null,
      description: form.description || null,
      visibility: form.visibility,
      status: form.status,
    };
    try {
      const res = await fetch(`${API}/penguins/gatherings/${gathering._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setStatus('saved');
        setTimeout(() => { onUpdated(updated); onClose(); }, 1000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(''), 3000);
    }
  }

  const canSubmit = form.title && form.start_date && status !== 'saving';

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Gathering</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Start <span className="text-danger">*</span></label>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    type="date"
                    className="form-control"
                    style={{ minWidth: '150px', flex: '1' }}
                    value={form.start_date}
                    onChange={e => setField('start_date', e.target.value)}
                  />
                  <TimePicker value={form.start_time} onChange={v => setField('start_time', v)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  End <span className="text-muted fw-normal">(optional)</span>
                </label>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    type="date"
                    className="form-control"
                    style={{ minWidth: '150px', flex: '1' }}
                    value={form.end_date}
                    onChange={e => setField('end_date', e.target.value)}
                  />
                  <TimePicker value={form.end_time} onChange={v => setField('end_time', v)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Description <span className="text-muted fw-normal">(optional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                />
              </div>
              <div className="mb-3">
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
              <div className="mb-2">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => setField('status', e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {status === 'saved' && (
                <div className="alert alert-success py-2 mt-3 mb-0">Gathering updated!</div>
              )}
              {status === 'error' && (
                <div className="alert alert-danger py-2 mt-3 mb-0">Failed to update. Please try again.</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {status === 'saving' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Gatherings() {
  const user = useUser();
  const [gatherings, setGatherings] = useState([]);
  const [places, setPlaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGathering, setEditingGathering] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id }))))
      .catch(() => {});
    fetch(`${API}/penguins/gatherings`)
      .then(r => r.json())
      .then(setGatherings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function refetch() {
      fetch(`${API}/penguins/gatherings`)
        .then(r => r.json())
        .then(setGatherings)
        .catch(() => {});
    }
    window.addEventListener('gathering-created', refetch);
    return () => window.removeEventListener('gathering-created', refetch);
  }, []);

  const myGatherings = gatherings.filter(g => g.host_user_id === user?.id && (g.status === 'active' || g.status === 'scheduled') && isCurrentOrUpcoming(g));
  const active = gatherings.filter(g => g.status === 'active' && g.host_user_id !== user?.id && isCurrentOrUpcoming(g));
  const scheduled = gatherings.filter(g => g.status === 'scheduled' && g.host_user_id !== user?.id && isCurrentOrUpcoming(g));
  const cancelledForMe = gatherings.filter(g => g.status === 'cancelled' && (g.host_user_id === user?.id || (g.participant_user_ids ?? []).includes(user?.id)));
  const pastGatherings = gatherings
    .filter(g => g.status === 'ended' && (g.host_user_id === user?.id || (g.participant_user_ids ?? []).includes(user?.id)))
    .sort((a, b) => new Date(b.datetime_start) - new Date(a.datetime_start));

  function handleCreated(newGathering) {
    setGatherings(prev => [newGathering, ...prev]);
  }

  function handleUpdated(updated) {
    setGatherings(prev => prev.map(g => g._id === updated._id ? updated : g));
  }

  function handleCancelled(updated) {
    setGatherings(prev => prev.map(g => g._id === updated._id ? { ...g, ...updated } : g));
  }

  function renderGatherings(list, isOwned = false) {
    return list.map(g => (
      <div
        className="col"
        key={g._id}
        ref={el => { cardRefs.current[g._id] = el; }}
        onClick={() => setSelectedId(prev => prev === g._id ? null : g._id)}
        style={{ cursor: 'pointer' }}
      >
        <GatheringCard
          gathering={g}
          place={places.find(p => p.id === g.place_id)}
          highlighted={g._id === selectedId}
          onEdit={isOwned ? () => setEditingGathering(g) : undefined}
          onCancel={isOwned ? handleCancelled : undefined}
        />
      </div>
    ));
  }

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="container-xl py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Gatherings</h4>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Gathering
          </button>
        </div>

        <div className="row g-4 align-items-start">
          {/* Left column — My Gatherings + Active Now */}
          <div className="col-12 col-lg-8">
            {myGatherings.length > 0 && (
              <section className="mb-5">
                <h5 className="mb-3">My Gatherings</h5>
                <div className="row row-cols-1 row-cols-md-2 g-3 align-items-start">
                  {renderGatherings(myGatherings, true)}
                </div>
              </section>
            )}

            <section className="mb-5">
              <h5 className="mb-3">Active Now</h5>
              {active.length === 0 ? (
                <p className="text-muted">No active gatherings right now.</p>
              ) : (
                <div className="row row-cols-1 row-cols-md-2 g-3 align-items-start">
                  {renderGatherings(active)}
                </div>
              )}
            </section>
          </div>

          {/* Right column — Coming Up + Cancelled */}
          <div className="col-12 col-lg-4">
            <div className="sticky-top" style={{ top: '1rem' }}>
              <section className="mb-5">
                <h5 className="mb-3">Coming Up</h5>
                {scheduled.length === 0 ? (
                  <p className="text-muted">No upcoming gatherings.</p>
                ) : (
                  <div className="row row-cols-1 g-3 align-items-start">
                    {renderGatherings(scheduled)}
                  </div>
                )}
              </section>

              {cancelledForMe.length > 0 && (
                <section className="mb-5">
                  <h5 className="mb-3 text-muted">Cancelled</h5>
                  <div className="row row-cols-1 g-3 align-items-start">
                    {renderGatherings(cancelledForMe, cancelledForMe.some(g => g.host_user_id === user?.id))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {pastGatherings.length > 0 && (
          <section className="mt-2">
            <h5 className="mb-3">Past Gatherings</h5>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 align-items-start">
              {renderGatherings(pastGatherings)}
            </div>
          </section>
        )}
      </div>

      {showCreate && (
        <CreateGatheringModal
          places={places}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {editingGathering && (
        <EditGatheringModal
          gathering={editingGathering}
          onClose={() => setEditingGathering(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
