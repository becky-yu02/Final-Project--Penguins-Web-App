import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProfileCard from '../components/ProfileCard';
import PlaceCard from '../components/PlaceCard';
import GatheringCard from '../components/GatheringCard';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

const API = 'http://127.0.0.1:8000';

export default function Profile() {
  const { token, logout } = useAuth();
  const user = useUser();
  const [tab, setTab] = useState('friends');
  const [showEditModal, setShowEditModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [allGatherings, setAllGatherings] = useState([]);
  const [gatheringPlaces, setGatheringPlaces] = useState({});
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedGatheringId, setSelectedGatheringId] = useState(null);

  const friendIdsKey = user?.friend_ids?.join(',') ?? '';
  useEffect(() => {
    if (!friendIdsKey || !token) { setFriends([]); return; }
    Promise.all(
      user.friend_ids.map(id =>
        fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
      )
    ).then(results => setFriends(results.filter(Boolean)));
  }, [friendIdsKey, token]);

  const favIdsKey = user?.favorite_places?.join(',') ?? '';
  useEffect(() => {
    if (!favIdsKey) { setFavoritePlaces([]); return; }
    Promise.all(
      user.favorite_places.map(id =>
        fetch(`${API}/penguins/places/${id}`).then(r => r.ok ? r.json() : null)
      )
    ).then(results => setFavoritePlaces(
      results.filter(Boolean).map(p => ({ ...p, id: p.id ?? p._id?.$oid ?? p._id }))
    ));
  }, [favIdsKey]);

  useEffect(() => {
    if (!user?.id || !token) { setGatherings([]); return; }
    fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(all => {
        setAllGatherings(all);
        const mine = all.filter(g => g.host_user_id === user.id);
        setGatherings(mine);
        const uniquePlaceIds = [...new Set(mine.map(g => g.place_id).filter(Boolean))];
        Promise.all(
          uniquePlaceIds.map(id =>
            fetch(`${API}/penguins/places/${id}`).then(r => r.ok ? r.json() : null)
          )
        ).then(results => {
          const map = {};
          results.filter(Boolean).forEach(p => { map[p.id ?? p._id?.$oid ?? p._id] = p; });
          setGatheringPlaces(map);
        });
      });
  }, [user?.id, token]);

  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <>
      <Navbar />
      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
      <div className="container py-4">

        <div className="card mb-4">
          <div className="card-body d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden"
              style={{ width: 80, height: 80 }}
            >
              {user.profile_image_url
                ? <img src={user.profile_image_url} alt="avatar" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                : <span className="text-white fs-3">{initials}</span>
              }
            </div>
            <div className="flex-grow-1">
              <h3 className="mb-0">{user.first_name} {user.last_name}</h3>
              <p className="text-muted mb-1">@{user.username}</p>
              <span className={`badge ${user.online_status?.is_online ? 'bg-success' : 'bg-secondary'}`}>
                {user.online_status?.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowEditModal(true)}>Edit Profile</button>
              <button className="btn btn-outline-danger btn-sm" onClick={logout}>Log Out</button>
            </div>
          </div>
        </div>

        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'friends' ? 'active' : ''}`}
              onClick={() => setTab('friends')}
            >
              Friends ({friends.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'favorites' ? 'active' : ''}`}
              onClick={() => setTab('favorites')}
            >
              Favorite Places ({favoritePlaces.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'gatherings' ? 'active' : ''}`}
              onClick={() => setTab('gatherings')}
            >
              My Gatherings ({gatherings.length})
            </button>
          </li>
        </ul>

        {tab === 'friends' && (
          friends.length === 0
            ? <p className="text-muted">No friends yet.</p>
            : (
              <div className="row row-cols-2 row-cols-md-4 g-3">
                {friends.map(friend => (
                  <div className="col" key={friend.id}>
                    <ProfileCard user={friend} />
                  </div>
                ))}
              </div>
            )
        )}

        {tab === 'favorites' && (
          favoritePlaces.length === 0
            ? <p className="text-muted">No favorites yet.</p>
            : (
              <div className="row row-cols-1 row-cols-md-3 g-3">
                {favoritePlaces.map(place => (
                  <div
                    className="col"
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id === selectedPlaceId ? null : place.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <PlaceCard place={place} gatherings={allGatherings} highlighted={place.id === selectedPlaceId} />
                  </div>
                ))}
              </div>
            )
        )}

        {tab === 'gatherings' && (
          gatherings.length === 0
            ? <p className="text-muted">No gatherings yet.</p>
            : (
              <div className="row row-cols-1 row-cols-md-3 g-3">
                {gatherings.map(g => {
                  const id = g._id ?? g.id;
                  return (
                    <div
                      className="col"
                      key={id}
                      onClick={() => setSelectedGatheringId(id === selectedGatheringId ? null : id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <GatheringCard
                        gathering={g}
                        place={gatheringPlaces[g.place_id]}
                        highlighted={id === selectedGatheringId}
                      />
                    </div>
                  );
                })}
              </div>
            )
        )}
      </div>
    </>
  );
}
