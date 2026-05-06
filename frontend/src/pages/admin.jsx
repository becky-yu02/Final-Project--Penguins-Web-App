import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import options from '../utils/options.json';

const API = 'http://127.0.0.1:8000';

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
            <td colSpan={6} className="p-0">
                <div className="px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="row g-3 mb-3">
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">ID</span>
                            <div className="small text-break">{place.id}</div>
                        </div>
                        <div className="col-auto">
                            <span className="text-muted small fw-semibold">Coordinates</span>
                            <div className="small">
                                {place.coordinates
                                    ? `${place.coordinates.lat}, ${place.coordinates.lng}`
                                    : '—'}
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
                            <span className="text-muted small fw-semibold">Community Summary</span>
                            <div className="d-flex flex-wrap gap-2 small mt-1">
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

function GatheringsTab({ token }) {
    const [gatherings, setGatherings] = useState([]);

    useEffect(() => {
        fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setGatherings(data.map(g => ({ ...g, id: g.id ?? g._id?.$oid ?? g._id }))))
            .catch(() => { });
    }, [token]);

    async function deleteGathering(gathering) {
        const res = await fetch(`${API}/penguins/gatherings/${gathering.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setGatherings(prev => prev.filter(g => g.id !== gathering.id));
        }
    }

    function statusVariant(status) {
        return { active: 'success', scheduled: 'primary', ended: 'secondary', cancelled: 'danger' }[status] ?? 'secondary';
    }

    function formatDt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead className="table-light">
                    <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Visibility</th>
                        <th>Start</th>
                        <th>End</th>
                        <th className="text-center">Participants</th>
                        <th>Host ID</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {gatherings.map(g => (
                        <tr key={g.id}>
                            <td className="fw-semibold">{g.title}</td>
                            <td><Badge variant={statusVariant(g.status)}>{g.status}</Badge></td>
                            <td className="text-capitalize">{g.visibility}</td>
                            <td className="small">{formatDt(g.datetime_start)}</td>
                            <td className="small">{formatDt(g.datetime_end)}</td>
                            <td className="text-center">{g.participant_user_ids?.length ?? 0}</td>
                            <td className="small text-muted text-truncate" style={{ maxWidth: '120px' }}>{g.host_user_id}</td>
                            <td className="text-center">
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => deleteGathering(g)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {gatherings.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted py-4">No gatherings found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function UsersTab({ token, currentUserId }) {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetch(`${API}/penguins/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setUsers(data.map(u => ({ ...u, id: u.id ?? u._id?.$oid ?? u._id }))))
            .catch(() => { });
    }, [token]);

    async function toggleRole(user) {
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

    async function deleteUser(user) {
        const res = await fetch(`${API}/penguins/users/${user.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
        }
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead className="table-light">
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th className="text-center">Role</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td className="fw-semibold">{user.username}</td>
                            <td>{user.first_name} {user.last_name}</td>
                            <td className="text-muted small">{user.email}</td>
                            <td className="text-center">
                                <Badge variant={user.role === 'admin' ? 'dark' : 'secondary'}>{user.role}</Badge>
                            </td>
                            <td className="text-center">
                                <div className="d-flex gap-2 justify-content-center">
                                    <button
                                        className={`btn btn-sm ${user.role === 'admin' ? 'btn-outline-secondary' : 'btn-outline-dark'}`}
                                        disabled={user.id === currentUserId}
                                        title={user.id === currentUserId ? "Can't change your own role" : undefined}
                                        onClick={() => toggleRole(user)}
                                    >
                                        {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={user.id === currentUserId}
                                        title={user.id === currentUserId ? "Can't delete your own account" : undefined}
                                        onClick={() => deleteUser(user)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted py-4">No users found.</td></tr>
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
