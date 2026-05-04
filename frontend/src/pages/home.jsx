import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import GatheringCard from '../components/GatheringCard';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import { useUser } from '../context/UserContext';

const API = 'http://127.0.0.1:8000';

export default function Home() {
  const user = useUser();
  const [view, setView] = useState('gatherings');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const cardRefs = useRef({});

  useEffect(() => {
    fetch(`${API}/penguins/places`)
      .then(r => r.json())
      .then(setPlaces)
      .catch(() => {});
    fetch(`${API}/penguins/gatherings`)
      .then(r => r.json())
      .then(setGatherings)
      .catch(() => {});
  }, []);

  const active = gatherings.filter(g => g.status === 'active');
  const scheduled = gatherings.filter(g => g.status === 'scheduled');
  const allGatherings = [...active, ...scheduled];

  const favoritePlaces = places.filter(p =>
    user?.favorite_places?.includes(p.id)
  );

  const placesWithGatherings = places.filter(p =>
    gatherings.some(g => g.place_id === p.id)
  );

  const mapPlaces = view === 'favorites' ? favoritePlaces : placesWithGatherings;

  function switchView(next) {
    setView(next);
    setSelectedPlaceId(null);
  }

  useEffect(() => {
    if (!selectedPlaceId) return;
    let matchId = null;
    if (view === 'gatherings') {
      const match = allGatherings.find(g => g.place_id === selectedPlaceId);
      matchId = match?.id;
    } else {
      matchId = selectedPlaceId;
    }
    if (matchId && cardRefs.current[matchId]) {
      cardRefs.current[matchId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPlaceId]);

  function renderGatherings(gatheringsList) {
    return gatheringsList.map(g => (
      <div
        className="col"
        key={g.id}
        ref={el => { cardRefs.current[g.id] = el; }}
        onClick={() => setSelectedPlaceId(g.place_id === selectedPlaceId ? null : g.place_id)}
        style={{ cursor: 'pointer' }}
      >
        <GatheringCard
          gathering={g}
          place={places.find(p => p.id === g.place_id)}
          highlighted={g.place_id === selectedPlaceId}
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
                  <div className="row row-cols-1 row-cols-xl-2 g-3">
                    {renderGatherings(active)}
                  </div>
                )}
              </section>

              <section>
                <h5 className="mb-3">Coming Up</h5>
                {scheduled.length === 0 ? (
                  <p className="text-muted">No upcoming gatherings.</p>
                ) : (
                  <div className="row row-cols-1 row-cols-xl-2 g-3">
                    {renderGatherings(scheduled)}
                  </div>
                )}
              </section>
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
                      <PlaceCard place={p} gatherings={gatherings} highlighted={p.id === selectedPlaceId} />
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
          />
        </div>
      </div>
    </div>
  );
}
