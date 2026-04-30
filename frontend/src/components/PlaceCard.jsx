import AmenitiesRow from './AmenitiesRow';

export default function PlaceCard({ place, highlighted = false }) {
  return (
    <div className={`card h-100${highlighted ? ' border-primary border-2 shadow-sm' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h5 className="card-title mb-0">{place.name}</h5>
          <span className="badge bg-secondary text-capitalize">{place.type_of_place}</span>
        </div>
        <p className="card-subtitle text-muted small mb-2">{place.address}</p>
        <AmenitiesRow summary={place.community_summary} />
        {place.community_summary?.overall_feel && (
          <p className="card-text small text-muted mt-2 mb-0">
            Vibe: {place.community_summary.overall_feel}
          </p>
        )}
        {place.community_summary?.overall_rating != null && (
          <p className="card-text small mt-1 mb-0">
            Rating: {place.community_summary.overall_rating.toFixed(1)} / 5
          </p>
        )}
      </div>
    </div>
  );
}
