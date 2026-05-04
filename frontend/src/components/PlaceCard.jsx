import { useRef, useState, useEffect } from 'react';
import AmenitiesRow from './AmenitiesRow';
import { useUser, useToggleFavorite } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { calculateMatchRating } from '../scripts/match';
import FriendIcon from '../assets/friend.svg?react';
import FavIcon from '../assets/fav.svg?react';
import NotFavIcon from '../assets/not_fav.svg?react';
import HeartBrokenIcon from '../assets/heart_broken.svg?react';

const API = 'http://127.0.0.1:8000';

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

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PlaceCard({ place, gatherings = [], highlighted = false }) {
  const user = useUser();
  const { token } = useAuth();
  const toggleFavorite = useToggleFavorite();
  const matchPct = calculateMatchRating(place, user?.preferences);
  const isFavorited = user?.favorite_places?.includes(place.id) ?? false;
  const [heartHovered, setHeartHovered] = useState(false);
  const [friendDetails, setFriendDetails] = useState([]);
  const expandRef = useRef(null);

  const placeGatherings = gatherings.filter(g => g.place_id === place.id);
  const relevantGatherings = placeGatherings.filter(
    g => g.status === 'active' || g.status === 'scheduled'
  );

  // Friends whose IDs appear in active gathering participant lists at this place
  const activeParticipantIds = new Set(
    placeGatherings
      .filter(g => g.status === 'active')
      .flatMap(g => g.participant_user_ids ?? [])
  );
  const friendIdsHere = (user?.friend_ids ?? []).filter(id => activeParticipantIds.has(id));

  // Fetch friend details lazily when card expands
  useEffect(() => {
    if (!highlighted || friendIdsHere.length === 0 || !token) {
      setFriendDetails([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      friendIdsHere.map(id =>
        fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
      )
    ).then(results => {
      if (!cancelled) setFriendDetails(results.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [highlighted]); // eslint-disable-line react-hooks/exhaustive-deps

  const rating = place.community_summary?.overall_rating;
  const vibe = place.community_summary?.overall_feel;

  return (
    <div className={`card${highlighted ? ' border-primary border-2 shadow-sm' : ''}`}>
      <div className="card-body pb-2">
        {/* Row 1: Heart + Name left, match % + rating right */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link p-0 border-0 lh-1"
              onClick={e => { e.stopPropagation(); toggleFavorite(place.id); }}
              onMouseEnter={() => setHeartHovered(true)}
              onMouseLeave={() => setHeartHovered(false)}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited
                ? (heartHovered
                    ? <HeartBrokenIcon width={20} height={20} style={{ color: '#dc3545' }} />
                    : <FavIcon width={20} height={20} style={{ color: '#dc3545' }} />)
                : <NotFavIcon width={20} height={20} style={{ color: '#adb5bd' }} />
              }
            </button>
            <h5 className="card-title mb-0">{place.name}</h5>
          </div>
          <div className="d-flex gap-2 align-items-center flex-shrink-0 ms-2">
            <MatchBadge pct={matchPct} />
            {rating != null && (
              <span className="small fw-semibold text-nowrap">{rating.toFixed(1)} ★</span>
            )}
          </div>
        </div>

        {/* Row 2: Amenities left, friends count right */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <AmenitiesRow summary={place.community_summary} iconSize={20} />
          <div className="d-flex align-items-center gap-1 text-muted small flex-shrink-0">
            <FriendIcon width={16} height={16} style={{ color: '#6c757d' }} />
            <span>{friendIdsHere.length}</span>
          </div>
        </div>

        {/* Row 3: Vibe */}
        {vibe && (
          <p className="card-text small text-muted mb-0 text-capitalize">{vibe}</p>
        )}
      </div>

      <div
        style={{
          height: highlighted ? (expandRef.current?.scrollHeight ?? 'auto') : 0,
          overflow: 'hidden',
          transition: 'height 280ms ease',
        }}
      >
        <div ref={expandRef} className="card-body border-top pt-2">
          <p className="small text-muted mb-2">
            <i className="bi bi-geo-alt me-1" />
            {place.address}
          </p>

          {friendDetails.length > 0 && (
            <div className="mb-2">
              <p className="small fw-semibold mb-1">Friends here now</p>
              {friendDetails.map(u => (
                <p key={u.id} className="small mb-0">
                  {u.first_name} {u.last_name}{' '}
                  <span className="text-muted">@{u.username}</span>
                </p>
              ))}
            </div>
          )}

          {relevantGatherings.length > 0 && (
            <div>
              <p className="small fw-semibold mb-1">Gatherings</p>
              {relevantGatherings.map(g => (
                <div key={g.id} className="mb-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="small fw-medium">{g.title}</span>
                    <span className={`badge ${STATUS_BADGE[g.status]} ms-2 flex-shrink-0 text-capitalize`}>
                      {g.status}
                    </span>
                  </div>
                  <p className="small text-muted mb-0">
                    {formatDate(g.datetime_start)}
                    {g.datetime_end && ` – ${formatDate(g.datetime_end)}`}
                    {' · '}{g.participant_user_ids?.length ?? 0} going
                  </p>
                </div>
              ))}
            </div>
          )}

          {friendIdsHere.length === 0 && relevantGatherings.length === 0 && (
            <p className="small text-muted mb-0">No friends here and no upcoming gatherings.</p>
          )}
        </div>
      </div>
    </div>
  );
}
