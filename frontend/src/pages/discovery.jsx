import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PlaceCard from '../components/PlaceCard';
import MapView from '../components/MapView';
import mockPlaces from '../mock/places.json';

export default function Discovery() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const cardRefs = useRef({});

  const types = [...new Set(mockPlaces.map(p => p.type_of_place))];

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
    </div>
  );
}
