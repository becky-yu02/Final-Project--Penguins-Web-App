import AmenitiesRow from './AmenitiesRow';

const STATUS_BADGE = {
  ACTIVE: 'bg-success',
  SCHEDULED: 'bg-primary',
  ENDED: 'bg-secondary',
  CANCELLED: 'bg-danger',
};

const VISIBILITY_BADGE = {
  PUBLIC: 'bg-light text-dark border',
  FRIENDS: 'bg-info text-dark',
  PRIVATE: 'bg-warning text-dark',
};

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function GatheringCard({ gathering, placeSummary, highlighted = false }) {
  return (
    <div className={`card h-100${highlighted ? ' border-primary border-2 shadow-sm' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h5 className="card-title mb-0">{gathering.title}</h5>
          <span className={`badge ${STATUS_BADGE[gathering.status]}`}>
            {gathering.status}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <p className={`card-subtitle small mb-0 mt-0${highlighted ? ' text-primary fw-semibold' : ' text-muted'}`}>
            {gathering.place_name}
          </p>
          {placeSummary && <AmenitiesRow summary={placeSummary} iconSize={16} />}
        </div>
        {gathering.description && (
          <p className="card-text small mb-2" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {gathering.description}
          </p>
        )}
        <p className="card-text small mb-0">
          {formatDate(gathering.datetime_start)}
          {gathering.datetime_end && ` – ${formatDate(gathering.datetime_end)}`}
        </p>
      </div>
      <div className="card-footer d-flex justify-content-between align-items-center">
        <span className="small text-muted">{gathering.participant_count} going</span>
        <span className={`badge ${VISIBILITY_BADGE[gathering.visibility]}`}>
          {gathering.visibility}
        </span>
      </div>
    </div>
  );
}
