import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import GatheringCard from '../components/GatheringCard';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { isCurrentOrUpcoming } from '../utils/gathering_time_check';

const API = 'http://127.0.0.1:8000';

export default function Home() {
  const user = useUser();
  const { token } = useAuth();
  const [view, setView] = useState('gatherings');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedGatheringId, setSelectedGatheringId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [friendsData, setFriendsData] = useState([]);
  const cardRefs = useRef({});

  const friendIdsKey = user?.friend_ids?.join(',') ?? '';

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => setLocationLoading(false),
    );
  }, []);

  useEffect(() => {
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(data => setPlaces(data.map(p => ({ ...p, id: p.id ?? p._id }))))
      .catch(() => { });
    fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setGatherings)
      .catch(() => { });
  }, []);

  useEffect(() => {
    function refetch() {
      fetch(`${API}/penguins/gatherings`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(setGatherings)
        .catch(() => { });
    }
    window.addEventListener('gathering-created', refetch);
    return () => window.removeEventListener('gathering-created', refetch);
  }, [token]);

  useEffect(() => {
    const ids = user?.friend_ids ?? [];
    if (!ids.length || !token) { setFriendsData([]); return; }
    Promise.all(
      ids.map(id =>
        fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
      )
    ).then(results => setFriendsData(results.filter(Boolean)));
  }, [friendIdsKey, token]); // eslint-disable-line react-hooks/exhaustive-deps


  const active = gatherings.filter(g => g.status === 'active');
  const scheduled = gatherings.filter(g => g.status === 'scheduled');
  const cancelledForMe = gatherings.filter(g => g.status === 'cancelled' && (g.participant_user_ids ?? []).includes(user?.id));
  const allGatherings = [...active, ...scheduled];

  const favoritePlaces = places.filter(p =>
    user?.favorite_places?.includes(p.id)
  );

  const placesWithGatherings = places.filter(p =>
    gatherings.some(g => g.place_id === p.id && (g.status === 'active' || g.status === 'scheduled'))
  );

  const mapPlaces = view === 'favorites' ? favoritePlaces : placesWithGatherings;

  function switchView(next) {
    setView(next);
    setSelectedPlaceId(null);
    setSelectedGatheringId(null);
  }

  useEffect(() => {
    if (!selectedPlaceId) return;
    let matchId = null;
    if (view === 'gatherings') {
      const match = allGatherings.find(g => g.place_id === selectedPlaceId);
      matchId = match?._id;
      if (matchId) setSelectedGatheringId(matchId);
    } else {
      matchId = selectedPlaceId;
    }
    if (matchId && cardRefs.current[matchId]) {
      cardRefs.current[matchId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPlaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCancelled(updated) {
    setGatherings(prev => prev.map(g => g._id === updated._id ? { ...g, ...updated } : g));
  }

  function renderGatherings(gatheringsList) {
    return gatheringsList.map(g => (
      <div
        className="col"
        key={g._id}
        ref={el => { cardRefs.current[g._id] = el; }}
        onClick={() => {
          const opening = g._id !== selectedGatheringId;
          setSelectedGatheringId(opening ? g._id : null);
          setSelectedPlaceId(opening ? g.place_id : null);
        }}
        style={{ cursor: 'pointer' }}
      >
        <GatheringCard
          gathering={g}
          place={places.find(p => p.id === g.place_id)}
          highlighted={g._id === selectedGatheringId}
          onCancel={handleCancelled}
        />
      </div>
    ));
  }

  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>
      <Navbar />

      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Left: scrollable content */}
        <div className="overflow-auto p-4" style={{ width: '55%' }}>

          {/* Toggle */}
          <ul className="nav nav-pills mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${view === 'gatherings' ? 'active' : ''}`}
                onClick={() => switchView('gatherings')}
              >
                Gatherings
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${view === 'favorites' ? 'active' : ''}`}
                onClick={() => switchView('favorites')}
              >
                My Favorites
              </button>
            </li>
          </ul>

          {view === 'gatherings' && (
            <>
              <section className="mb-5">
                <h5 className="mb-3">Active Now</h5>
                {active.length === 0 ? (
                  <p className="text-muted">No active gatherings right now.</p>
                ) : (
                  <div className="row row-cols-1 row-cols-xl-2 g-3 align-items-start">
                    {renderGatherings(active)}
                  </div>
                )}
              </section>

              <section className="mb-5">
                <h5 className="mb-3">Coming Up</h5>
                {scheduled.length === 0 ? (
                  <p className="text-muted">No upcoming gatherings.</p>
                ) : (
                  <div className="row row-cols-1 row-cols-xl-2 g-3 align-items-start">
                    {renderGatherings(scheduled)}
                  </div>
                )}
              </section>

              {cancelledForMe.length > 0 && (
                <section>
                  <h5 className="mb-3 text-muted">Cancelled</h5>
                  <div className="row row-cols-1 row-cols-xl-2 g-3 align-items-start">
                    {renderGatherings(cancelledForMe)}
                  </div>
                </section>
              )}
            </>
          )}

          {view === 'favorites' && (
            <>
              <h5 className="mb-3">Saved Places</h5>
              {favoritePlaces.length === 0 ? (
                <p className="text-muted">No favorite places yet.</p>
              ) : (
                <div className="row row-cols-1 row-cols-xl-2 g-3">
                  {favoritePlaces.map(p => (
                    <div
                      className="col"
                      key={p.id}
                      ref={el => { cardRefs.current[p.id] = el; }}
                      onClick={() => setSelectedPlaceId(p.id === selectedPlaceId ? null : p.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <PlaceCard place={p} gatherings={gatherings} highlighted={p.id === selectedPlaceId} userLocation={userLocation} locationLoading={locationLoading} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Right: map */}
        <div style={{ width: '45%' }}>
          <MapView
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onMarkerClick={setSelectedPlaceId}
            currentUser={user}
            gatherings={gatherings}
            friendsData={friendsData}
            markerMode={view === 'favorites' ? 'places' : 'gatherings'}
          />
        </div>
      </div>
    </div>
  );
}
