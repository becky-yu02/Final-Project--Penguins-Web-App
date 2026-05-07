import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import options from '../utils/options.json';

const API = 'http://127.0.0.1:8000';

function loadMaps() {
    if (window.google?.maps) return Promise.resolve();
    return new Promise(resolve => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        window.__gmapsReady = resolve;
        if (!document.getElementById('gmap-script')) {
            const s = document.createElement('script');
            s.id = 'gmap-script';
            s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__gmapsReady`;
            s.async = true;
            document.head.appendChild(s);
        }
    });
}

function Badge({ children, variant = 'secondary' }) {
    return <span className={`badge bg-${variant}`}>{children}</span>;
}

function tri(val) {
    if (val === true) return <Badge variant="success">Yes</Badge>;
    if (val === false) return <Badge variant="danger">No</Badge>;
    return <span className="text-muted small">—</span>;
}

const AMENITY_FIELDS = [
    ['wifi_available', 'Wi-Fi'],
    ['outlets_available', 'Outlets'],
    ['parking_available', 'Parking'],
    ['food_available', 'Food'],
];

function EditPlaceModal({ place, token, onSave, onClose }) {
    const [form, setForm] = useState({
        name: place.name ?? '',
        address: place.address ?? '',
        type_of_place: place.type_of_place ?? '',
        lat: place.coordinates?.lat ?? '',
        lng: place.coordinates?.lng ?? '',
    });
    const [overrides, setOverridesState] = useState({
        wifi_available: place.admin_amenity_override?.wifi_available ?? null,
        outlets_available: place.admin_amenity_override?.outlets_available ?? null,
        parking_available: place.admin_amenity_override?.parking_available ?? null,
        food_available: place.admin_amenity_override?.food_available ?? null,
    });
    const [overridesChanged, setOverridesChanged] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function set(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    function setOverride(field, value) {
        setOverridesState(prev => ({ ...prev, [field]: value }));
        setOverridesChanged(true);
    }

    async function handleSave() {
        setSaving(true);
        setError('');

        const body = {
            name: form.name.trim(),
            address: form.address.trim(),
            type_of_place: form.type_of_place,
            coordinates: form.lat !== '' && form.lng !== ''
                ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
                : null,
        };
        const res = await fetch(`${API}/penguins/places/${place.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            setError('Failed to save. Please try again.');
            setSaving(false);
            return;
        }
        let updated = await res.json();

        if (overridesChanged) {
            const allNull = Object.values(overrides).every(v => v === null);
            const amenityRes = await fetch(`${API}/penguins/places/${place.id}/amenities`, {
                method: allNull ? 'DELETE' : 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                ...(allNull ? {} : { body: JSON.stringify(overrides) }),
            });
            if (!amenityRes.ok) {
                setError('Place saved but failed to update amenity overrides.');
                setSaving(false);
                return;
            }
            updated = await amenityRes.json();
        }

        onSave({ ...updated, id: updated.id ?? updated._id?.$oid ?? updated._id });
    }

    return (
        <div onClick={e => e.stopPropagation()}>
            <div className="modal-backdrop fade show" onClick={onClose} />
            <div className="modal fade show d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Place</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Name</label>
                                <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Address</label>
                                <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Type</label>
                                <select className="form-select" value={form.type_of_place} onChange={e => set('type_of_place', e.target.value)}>
                                    <option value="">Select a type…</option>
                                    {options.place_types.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Coordinates</label>
                                <div className="d-flex gap-2">
                                    <input
                                        className="form-control"
                                        type="number"
                                        placeholder="Latitude"
                                        value={form.lat}
                                        onChange={e => set('lat', e.target.value)}
                                    />
                                    <input
                                        className="form-control"
                                        type="number"
                                        placeholder="Longitude"
                                        value={form.lng}
                                        onChange={e => set('lng', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Amenity Overrides</label>
                                <p className="text-muted small mb-2">
                                    Override the community vote for specific amenities. "Community" removes the override for that field.
                                </p>
                                {AMENITY_FIELDS.map(([field, label]) => (
                                    <div key={field} className="d-flex align-items-center gap-3 mb-2">
                                        <span className="small" style={{ minWidth: '68px' }}>{label}</span>
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button
                                                type="button"
                                                className={`btn ${overrides[field] === true ? 'btn-success' : 'btn-outline-success'}`}
                                                onClick={() => setOverride(field, true)}
                                            >Yes</button>
                                            <button
                                                type="button"
                                                className={`btn ${overrides[field] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                                                onClick={() => setOverride(field, false)}
                                            >No</button>
                                            <button
                                                type="button"
                                                className={`btn ${overrides[field] === null ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                                onClick={() => setOverride(field, null)}
                                            >Community</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NoteRow({ note, onDelete }) {
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        setDeleting(true);
        const ok = await onDelete(note.note_id);
        if (!ok) setDeleting(false);
    }

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    return (
        <div className="border rounded p-3 mb-2 bg-white">
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="small text-muted">
                    <span className="fw-semibold text-dark">User:</span> {note.user_id}
                    <span className="ms-3 fw-semibold text-dark">Submitted:</span> {formatDt(note.created_at)}
                </div>
                <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? '…' : 'Delete'}
                </button>
            </div>
            <div className="d-flex flex-wrap gap-3 small mb-2">
                <span>Wi-Fi: {tri(note.wifi_available)}</span>
                <span>Outlets: {tri(note.outlets_available)}</span>
                <span>Parking: {tri(note.parking_available)}</span>
                <span>Food: {tri(note.food_available)}</span>
                {note.rating != null && <span>Rating: <strong>{note.rating}/5</strong></span>}
            </div>
            {note.feel?.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mb-2">
                    {note.feel.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                </div>
            )}
            {note.comment && <p className="mb-1 small">{note.comment}</p>}
            {note.image_url && (
                <a href={note.image_url} target="_blank" rel="noopener noreferrer" className="small">View image</a>
            )}
        </div>
    );
}

function PlaceExpandedRow({ place, token, onUpdate }) {
    const [geocoding, setGeocoding] = useState(false);
    const [geoStatus, setGeoStatus] = useState('');
    const [geoMsg, setGeoMsg] = useState('');
    const [recomputing, setRecomputing] = useState(false);
    const [recomputeStatus, setRecomputeStatus] = useState('');

    async function handleRecalculate() {
        if (!place.address) {
            setGeoStatus('error');
            setGeoMsg('No address set for this place.');
            return;
        }
        setGeocoding(true);
        setGeoStatus('');
        setGeoMsg('');
        await loadMaps();
        new window.google.maps.Geocoder().geocode({ address: place.address }, async (results, status) => {
            if (status !== 'OK' || !results?.[0]) {
                setGeoStatus('error');
                setGeoMsg(status === 'ZERO_RESULTS' ? 'Address not found.' : `Geocoding failed: ${status}`);
                setGeocoding(false);
                return;
            }
            const loc = results[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            try {
                const res = await fetch(`${API}/penguins/places/${place.id}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coordinates: { lat, lng } }),
                });
                if (!res.ok) throw new Error('Failed to save coordinates');
                const updated = await res.json();
                onUpdate({ ...place, ...updated, id: updated.id ?? updated._id?.$oid ?? updated._id });
                setGeoStatus('success');
                setGeoMsg(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            } catch (err) {
                setGeoStatus('error');
                setGeoMsg(err.message || 'Failed to save');
            } finally {
                setGeocoding(false);
            }
        });
    }

    async function handleRecompute() {
        setRecomputing(true);
        setRecomputeStatus('');
        const res = await fetch(`${API}/penguins/places/${place.id}/recompute-summary`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        setRecomputing(false);
        if (res.ok) {
            const updated = await res.json();
            onUpdate({ ...place, ...updated, id: updated.id ?? updated._id?.$oid ?? updated._id });
            setRecomputeStatus('ok');
        } else {
            setRecomputeStatus('error');
        }
    }

    async function deleteNote(noteId) {
        const res = await fetch(`${API}/penguins/places/${place.id}/notes/${noteId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            onUpdate({ ...place, community_notes: place.community_notes.filter(n => n.note_id !== noteId) });
            return true;
        }
        return false;
    }

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    return (
        <tr>
            <td colSpan={7} className="p-0">
                <div className="px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="row g-3 mb-3">
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">ID</span>
                            <div className="small text-break">{place.id}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Coordinates</span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="small">
                                    {place.coordinates
                                        ? `${place.coordinates.lat}, ${place.coordinates.lng}`
                                        : '—'}
                                </span>
                                <button
                                    className="btn btn-outline-secondary"
                                    style={{ fontSize: '0.72rem', padding: '1px 8px' }}
                                    onClick={handleRecalculate}
                                    disabled={geocoding}
                                >
                                    {geocoding ? '…' : '↺ Recalculate'}
                                </button>
                                {geoStatus === 'success' && (
                                    <span className="small text-success">Updated → {geoMsg}</span>
                                )}
                                {geoStatus === 'error' && (
                                    <span className="small text-danger">{geoMsg}</span>
                                )}
                            </div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Created</span>
                            <div className="small">{formatDt(place.created_at)}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Updated</span>
                            <div className="small">{formatDt(place.updated_at)}</div>
                        </div>
                        <div className="col-auto">
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="text-muted small fw-semibold">Community Summary</span>
                                <button
                                    className="btn btn-outline-secondary"
                                    style={{ fontSize: '0.72rem', padding: '1px 8px' }}
                                    onClick={handleRecompute}
                                    disabled={recomputing}
                                >
                                    {recomputing ? '…' : '↺ Recompute'}
                                </button>
                                {recomputeStatus === 'ok' && <span className="small text-success">Updated</span>}
                                {recomputeStatus === 'error' && <span className="small text-danger">Failed</span>}
                            </div>
                            <div className="d-flex flex-wrap gap-2 small">
                                <span>Wi-Fi: {tri(place.community_summary?.wifi_available)}</span>
                                <span>Outlets: {tri(place.community_summary?.outlets_available)}</span>
                                <span>Parking: {tri(place.community_summary?.parking_available)}</span>
                                <span>Food: {tri(place.community_summary?.food_available)}</span>
                                {place.community_summary?.overall_rating != null && (
                                    <span>Rating: <strong>{place.community_summary.overall_rating}</strong></span>
                                )}
                                {place.community_summary?.overall_feel?.length > 0 && (
                                    <span>Vibes: {place.community_summary.overall_feel.join(', ')}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="fw-semibold mb-2">
                        Community Notes ({place.community_notes?.length ?? 0})
                    </div>
                    {place.community_notes?.length > 0
                        ? place.community_notes.map(note => (
                            <NoteRow key={note.note_id} note={note} onDelete={deleteNote} />
                        ))
                        : <p className="text-muted small">No notes yet.</p>
                    }
                </div>
            </td>
        </tr>
    );
}

function PlacesTab({ token }) {
    const [places, setPlaces] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [editingPlace, setEditingPlace] = useState(null);

    useEffect(() => {
        fetch(`${API}/penguins/places`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id?.$oid ?? p._id }))))
            .catch(() => { });
    }, [token]);

    function updatePlace(updated) {
        setPlaces(prev => prev.map(p => p.id === updated.id ? updated : p));
    }

    async function toggleApproval(e, place) {
        e.stopPropagation();
        const res = await fetch(`${API}/penguins/places/${place.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_approved: !place.admin_approved }),
        });
        if (res.ok) {
            updatePlace({ ...place, admin_approved: !place.admin_approved });
        }
    }

    return (
        <>
            {editingPlace && (
                <EditPlaceModal
                    place={editingPlace}
                    token={token}
                    onSave={updated => { updatePlace(updated); setEditingPlace(null); }}
                    onClose={() => setEditingPlace(null)}
                />
            )}
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th></th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Address</th>
                            <th className="text-center">Notes</th>
                            <th className="text-center">Approved</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {places.map(place => {
                            const expanded = expandedId === place.id;
                            return (
                                <React.Fragment key={place.id}>
                                    <tr
                                        onClick={() => setExpandedId(expanded ? null : place.id)}
                                        style={{ cursor: 'pointer' }}
                                        className={expanded ? 'table-active' : ''}
                                    >
                                        <td className="text-muted small" style={{ width: '24px' }}>
                                            {expanded ? '▾' : '▸'}
                                        </td>
                                        <td className="fw-semibold">{place.name}</td>
                                        <td><span className="text-capitalize">{place.type_of_place?.replace(/_/g, ' ')}</span></td>
                                        <td className="text-muted small">{place.address}</td>
                                        <td className="text-center">{place.community_notes?.length ?? 0}</td>
                                        <td className="text-center">
                                            {place.admin_approved
                                                ? <Badge variant="success">Yes</Badge>
                                                : <Badge variant="warning">No</Badge>}
                                        </td>
                                        <td className="text-center" onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2 justify-content-center">
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => setEditingPlace(place)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${place.admin_approved ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                    onClick={e => toggleApproval(e, place)}
                                                >
                                                    {place.admin_approved ? 'Revoke approval' : 'Approve'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <PlaceExpandedRow
                                            key={`${place.id}-expanded`}
                                            place={place}
                                            token={token}
                                            onUpdate={updatePlace}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {places.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted py-4">No places found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function GatheringExpandedRow({ gathering, token }) {
    const [host, setHost] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            fetch(`${API}/penguins/users/${gathering.host_user_id}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null),
            Promise.all(
                (gathering.participant_user_ids ?? []).map(id =>
                    fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.ok ? r.json() : null)
                )
            ),
        ]).then(([hostData, participantResults]) => {
            if (cancelled) return;
            setHost(hostData);
            setParticipants(participantResults.filter(Boolean));
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [gathering.id]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <tr>
            <td colSpan={9} className="p-0">
                <div className="px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
                    {loading ? (
                        <p className="text-muted small mb-0">Loading…</p>
                    ) : (
                        <>
                            <div className="row g-3 mb-3">
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">ID</span>
                                    <div className="small text-break">{gathering.id}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">Place ID</span>
                                    <div className="small text-break">{gathering.place_id ?? '—'}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">Visibility</span>
                                    <div className="small text-capitalize">{gathering.visibility}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">Start</span>
                                    <div className="small">{formatDt(gathering.datetime_start)}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">End</span>
                                    <div className="small">{formatDt(gathering.datetime_end)}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">Created</span>
                                    <div className="small">{formatDt(gathering.created_at)}</div>
                                </div>
                                <div className="col-auto">
                                    <span className="text-muted small fw-semibold">Updated</span>
                                    <div className="small">{formatDt(gathering.updated_at)}</div>
                                </div>
                                {gathering.image_url && (
                                    <div className="col-auto">
                                        <span className="text-muted small fw-semibold">Image</span>
                                        <div><a href={gathering.image_url} target="_blank" rel="noopener noreferrer" className="small">View</a></div>
                                    </div>
                                )}
                            </div>

                            {gathering.description && (
                                <div className="mb-3">
                                    <span className="text-muted small fw-semibold">Description</span>
                                    <p className="small mb-0">{gathering.description}</p>
                                </div>
                            )}

                            <div className="mb-3">
                                <span className="text-muted small fw-semibold">Host</span>
                                {host ? (
                                    <div className="small">
                                        {host.first_name} {host.last_name}{' '}
                                        <span className="text-muted">@{host.username}</span>
                                        <span className="ms-2 text-muted" style={{ fontSize: '0.8em' }}>{gathering.host_user_id}</span>
                                    </div>
                                ) : (
                                    <div className="small text-muted">{gathering.host_user_id}</div>
                                )}
                            </div>

                            <div>
                                <span className="text-muted small fw-semibold">
                                    Participants ({gathering.participant_user_ids?.length ?? 0})
                                </span>
                                {participants.length === 0 ? (
                                    <p className="small text-muted mb-0">None</p>
                                ) : (
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {participants.map(u => (
                                            <span key={u.id} className="badge bg-light text-dark border small fw-normal">
                                                {u.first_name} {u.last_name} <span className="text-muted">@{u.username}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

function GatheringsTab({ token }) {
    const [gatherings, setGatherings] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setGatherings(data.map(g => ({ ...g, id: g.id ?? g._id?.$oid ?? g._id }))))
            .catch(() => { });
    }, [token]);

    useEffect(() => {
        function refetch() {
            fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(data => setGatherings(data.map(g => ({ ...g, id: g.id ?? g._id?.$oid ?? g._id }))))
                .catch(() => { });
        }
        window.addEventListener('gathering-created', refetch);
        return () => window.removeEventListener('gathering-created', refetch);
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    async function cancelGathering(gathering) {
        const res = await fetch(`${API}/penguins/gatherings/${gathering.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' }),
        });
        if (res.ok) {
            setGatherings(prev => prev.map(g => g.id === gathering.id ? { ...g, status: 'cancelled' } : g));
        }
    }

    async function deleteGathering(gathering) {
        const res = await fetch(`${API}/penguins/gatherings/${gathering.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setGatherings(prev => prev.filter(g => g.id !== gathering.id));
            if (expandedId === gathering.id) setExpandedId(null);
        }
    }

    function statusVariant(status) {
        return { active: 'success', scheduled: 'primary', ended: 'secondary', cancelled: 'danger' }[status] ?? 'secondary';
    }

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    const visible = gatherings.filter(g => {
        const t = g.datetime_start ? new Date(g.datetime_start).getTime() : null;
        if (t === null) return true;
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;
        return true;
    });

    return (
        <>
            <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small fw-semibold text-nowrap">From</label>
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{ width: 160 }}
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                    />
                </div>
                <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small fw-semibold text-nowrap">To</label>
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{ width: 160 }}
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                    />
                </div>
                {(dateFrom || dateTo) && (
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                    >
                        Clear
                    </button>
                )}
                <span className="small text-muted ms-auto">{visible.length} of {gatherings.length}</span>
            </div>
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th></th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Visibility</th>
                            <th>Start</th>
                            <th>End</th>
                            <th className="text-center">Participants</th>
                            <th>Host</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(g => {
                            const expanded = expandedId === g.id;
                            return (
                                <React.Fragment key={g.id}>
                                    <tr
                                        onClick={() => setExpandedId(expanded ? null : g.id)}
                                        style={{ cursor: 'pointer' }}
                                        className={expanded ? 'table-active' : ''}
                                    >
                                        <td className="text-muted small" style={{ width: '24px' }}>
                                            {expanded ? '▾' : '▸'}
                                        </td>
                                        <td className="fw-semibold">{g.title}</td>
                                        <td><Badge variant={statusVariant(g.status)}>{g.status}</Badge></td>
                                        <td className="text-capitalize">{g.visibility}</td>
                                        <td className="small">{formatDt(g.datetime_start)}</td>
                                        <td className="small">{formatDt(g.datetime_end)}</td>
                                        <td className="text-center">{g.participant_user_ids?.length ?? 0}</td>
                                        <td className="small text-muted text-truncate" style={{ maxWidth: '120px' }}>{g.host_user_id}</td>
                                        <td className="text-center" onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2 justify-content-center">
                                                {g.status !== 'cancelled' && g.status !== 'ended' && (
                                                    <button
                                                        className="btn btn-sm btn-outline-warning"
                                                        onClick={() => cancelGathering(g)}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => deleteGathering(g)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <GatheringExpandedRow
                                            key={`${g.id}-expanded`}
                                            gathering={g}
                                            token={token}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {visible.length === 0 && (
                            <tr><td colSpan={9} className="text-center text-muted py-4">No gatherings found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function UserExpandedRow({ user, token, onUpdate }) {
    const [form, setForm] = useState({
        username: user.username ?? '',
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        profile_image_url: user.profile_image_url ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [deletingPic, setDeletingPic] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    async function handleSave() {
        setSaving(true);
        setSaveStatus('');
        const body = {};
        if (form.username !== user.username) body.username = form.username;
        if (form.first_name !== user.first_name) body.first_name = form.first_name;
        if (form.last_name !== user.last_name) body.last_name = form.last_name;
        const newPic = form.profile_image_url.trim() || null;
        if (newPic !== (user.profile_image_url ?? null)) body.profile_image_url = newPic;
        if (Object.keys(body).length === 0) { setSaving(false); return; }
        const res = await fetch(`${API}/penguins/users/${user.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        if (res.ok) {
            const updated = await res.json();
            onUpdate({ ...user, ...updated });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 3000);
        } else {
            const data = await res.json().catch(() => ({}));
            setErrorMsg(data.detail ?? 'Failed to save.');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(''), 4000);
        }
    }

    async function handleDeletePic() {
        setDeletingPic(true);
        const res = await fetch(`${API}/penguins/users/${user.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_image_url: null }),
        });
        setDeletingPic(false);
        if (res.ok) {
            setForm(f => ({ ...f, profile_image_url: '' }));
            onUpdate({ ...user, profile_image_url: null });
        }
    }

    return (
        <tr>
            <td colSpan={6} className="p-0">
                <div className="px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="row g-3 mb-3">
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">ID</span>
                            <div className="small text-break">{user.id}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Email</span>
                            <div className="small">{user.email ?? '—'}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Friends</span>
                            <div className="small">{user.friend_ids?.length ?? 0}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Online</span>
                            <div className="small">{user.online_status?.is_online ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Broadcasting</span>
                            <div className="small">{user.online_status?.broadcasting ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Created</span>
                            <div className="small">{formatDt(user.created_at)}</div>
                        </div>
                    </div>

                    <div className="row g-2 mb-3" style={{ maxWidth: 600 }}>
                        <div className="col-12 col-sm-4">
                            <label className="form-label small fw-semibold mb-1">Username</label>
                            <input
                                className="form-control form-control-sm"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            />
                        </div>
                        <div className="col-12 col-sm-4">
                            <label className="form-label small fw-semibold mb-1">First Name</label>
                            <input
                                className="form-control form-control-sm"
                                value={form.first_name}
                                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                            />
                        </div>
                        <div className="col-12 col-sm-4">
                            <label className="form-label small fw-semibold mb-1">Last Name</label>
                            <input
                                className="form-control form-control-sm"
                                value={form.last_name}
                                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                            />
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-semibold mb-1">Profile Picture URL</label>
                            <div className="d-flex align-items-center gap-2">
                                {form.profile_image_url && (
                                    <img
                                        src={form.profile_image_url}
                                        alt="preview"
                                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <input
                                    type="url"
                                    className="form-control form-control-sm"
                                    placeholder="https://…"
                                    value={form.profile_image_url}
                                    onChange={e => setForm(f => ({ ...f, profile_image_url: e.target.value }))}
                                />
                                {form.profile_image_url && (
                                    <button
                                        className="btn btn-sm btn-outline-danger flex-shrink-0"
                                        onClick={handleDeletePic}
                                        disabled={deletingPic}
                                    >
                                        {deletingPic ? '…' : 'Delete'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-sm btn-dark" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        {saveStatus === 'saved' && <span className="small text-success">Saved!</span>}
                        {saveStatus === 'error' && <span className="small text-danger">{errorMsg}</span>}
                    </div>
                </div>
            </td>
        </tr>
    );
}

function UsersTab({ token, currentUserId }) {
    const [users, setUsers] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetch(`${API}/penguins/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setUsers(data.map(u => ({ ...u, id: u.id ?? u._id?.$oid ?? u._id }))))
            .catch(() => { });
    }, [token]);

    function updateUser(updated) {
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    }

    async function toggleRole(e, user) {
        e.stopPropagation();
        const newRole = user.role === 'admin' ? 'basic' : 'admin';
        const res = await fetch(`${API}/penguins/users/${user.id}/access`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        }
    }

    async function deleteUser(e, user) {
        e.stopPropagation();
        const res = await fetch(`${API}/penguins/users/${user.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
            if (expandedId === user.id) setExpandedId(null);
        }
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead className="table-light">
                    <tr>
                        <th></th>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th className="text-center">Role</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => {
                        const expanded = expandedId === user.id;
                        return (
                            <React.Fragment key={user.id}>
                                <tr
                                    onClick={() => setExpandedId(expanded ? null : user.id)}
                                    style={{ cursor: 'pointer' }}
                                    className={expanded ? 'table-active' : ''}
                                >
                                    <td className="text-muted small" style={{ width: '24px' }}>
                                        {expanded ? '▾' : '▸'}
                                    </td>
                                    <td className="fw-semibold">{user.username}</td>
                                    <td>{user.first_name} {user.last_name}</td>
                                    <td className="text-muted small">{user.email}</td>
                                    <td className="text-center">
                                        <Badge variant={user.role === 'admin' ? 'dark' : 'secondary'}>{user.role}</Badge>
                                    </td>
                                    <td className="text-center" onClick={e => e.stopPropagation()}>
                                        <div className="d-flex gap-2 justify-content-center">
                                            <button
                                                className={`btn btn-sm ${user.role === 'admin' ? 'btn-outline-secondary' : 'btn-outline-dark'}`}
                                                disabled={user.id === currentUserId}
                                                title={user.id === currentUserId ? "Can't change your own role" : undefined}
                                                onClick={e => toggleRole(e, user)}
                                            >
                                                {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                disabled={user.id === currentUserId}
                                                title={user.id === currentUserId ? "Can't delete your own account" : undefined}
                                                onClick={e => deleteUser(e, user)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expanded && (
                                    <UserExpandedRow
                                        key={`${user.id}-expanded`}
                                        user={user}
                                        token={token}
                                        onUpdate={updateUser}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                    {users.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-muted py-4">No users found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function Admin() {
    const { token } = useAuth();
    const user = useUser();
    const navigate = useNavigate();
    const [tab, setTab] = useState('places');

    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/home', { replace: true });
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
            <Navbar />
            <div className="container-fluid py-4 px-4">
                <h2 className="mb-4">Admin Panel</h2>

                <ul className="nav nav-tabs mb-4">
                    {[['places', 'Places'], ['gatherings', 'Gatherings'], ['users', 'Users']].map(([key, label]) => (
                        <li className="nav-item" key={key}>
                            <button
                                className={`nav-link ${tab === key ? 'active' : ''}`}
                                onClick={() => setTab(key)}
                            >
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>

                {tab === 'places' && <PlacesTab token={token} />}
                {tab === 'gatherings' && <GatheringsTab token={token} />}
                {tab === 'users' && <UsersTab token={token} currentUserId={user.id} />}
            </div>
        </div>
    );
}
