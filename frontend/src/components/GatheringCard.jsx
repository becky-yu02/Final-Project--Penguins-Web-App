import AmenitiesRow from './AmenitiesRow';
import { useUser } from '../context/UserContext';
import { calculateMatchRating } from '../scripts/match';

function MatchBadge({ pct }) {
  if (pct === null) return null;
  const bg = pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning text-dark' : 'bg-danger';
  return <span className={`badge ${bg}`}>{pct}% match</span>;
}

const STATUS_BADGE = {
  active: 'bg-success',
  scheduled: 'bg-primary',
  ended: 'bg-secondary',
  cancelled: 'bg-danger',
};

const VISIBILITY_BADGE = {
  public: 'bg-light text-dark border',
  friends: 'bg-info text-dark',
  private: 'bg-warning text-dark',
};

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function GatheringCard({ gathering, place, placeSummary, highlighted = false }) {
  const user = useUser();
  const resolvedSummary = place?.community_summary ?? placeSummary;
  const matchPct = calculateMatchRating(place ?? { community_summary: placeSummary }, user?.preferences);

  return (
    <div className={`card h-100${highlighted ? ' border-primary border-2 shadow-sm' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h5 className="card-title mb-0">{gathering.title}</h5>
          <div className="d-flex gap-1 align-items-center">
            <MatchBadge pct={matchPct} />
            <span className={`badge ${STATUS_BADGE[gathering.status]} text-capitalize`}>
              {gathering.status}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <p className={`card-subtitle small mb-0 mt-0${highlighted ? ' text-primary fw-semibold' : ' text-muted'}`}>
            {place?.name}
          </p>
          {resolvedSummary && <AmenitiesRow summary={resolvedSummary} iconSize={16} />}
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
        <span className="small text-muted">{gathering.participant_user_ids?.length ?? 0} going</span>
        <span className={`badge ${VISIBILITY_BADGE[gathering.visibility]} text-capitalize`}>
          {gathering.visibility}
        </span>
      </div>
    </div>
  );
}
