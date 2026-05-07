import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import AmenitiesRow from './AmenitiesRow';
import options from '../utils/options.json';
import AddNoteModal from './AddNoteModal';
import { useUser, useToggleFavorite } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { calculateMatchRating } from '../utils/match';
import { isCurrentOrUpcoming } from '../utils/gathering_time_check';
import FriendIcon from '../assets/friend.svg?react';
import FavIcon from '../assets/fav.svg?react';
import NotFavIcon from '../assets/not_fav.svg?react';
import HeartBrokenIcon from '../assets/heart_broken.svg?react';
import WalkIcon from '../assets/walk.svg?react';
import StarIcon from '../assets/star.svg?react';
import LoadingIcon from '../assets/loading.svg?react';

const API = 'http://127.0.0.1:8000';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MatchBadge({ pct }) {
  if (pct === null) return null;
  const bg = pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning text-dark' : 'bg-danger';
  return (
    <span
      className={`badge ${bg}`}
      title="How well this place matches your saved preferences"
    >
      {pct}% match
    </span>
  );
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

export default function PlaceCard({ place, gatherings = [], highlighted = false, userLocation = null, locationLoading = false }) {
  const user = useUser();
  const { token } = useAuth();
  const toggleFavorite = useToggleFavorite();
  const matchPct = calculateMatchRating(place, user?.preferences);
  const isFavorited = user?.favorite_places?.includes(place.id) ?? false;
  const [heartHovered, setHeartHovered] = useState(false);
  const [friendDetails, setFriendDetails] = useState([]);
  const [noteAuthors, setNoteAuthors] = useState({});
  const [noteAuthorsLoaded, setNoteAuthorsLoaded] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [expandHeight, setExpandHeight] = useState(0);
  const expandRef = useRef(null);
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    function fit() {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.offsetWidth && size > 10) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [place.name]);

  const placeGatherings = gatherings.filter(g => g.place_id === place.id);
  const relevantGatherings = placeGatherings.filter(
    g => (g.status === 'active' || g.status === 'scheduled') && isCurrentOrUpcoming(g)
  );

  useLayoutEffect(() => {
    if (!expandRef.current) return;
    setExpandHeight(highlighted ? expandRef.current.scrollHeight : 0);
  }, [highlighted, friendDetails, relevantGatherings.length, noteAuthors]);

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

  useEffect(() => {
    if (!highlighted || !token) { setNoteAuthors({}); setNoteAuthorsLoaded(false); return; }
    const uniqueIds = [...new Set((place.community_notes ?? []).map(n => n.user_id))];
    if (uniqueIds.length === 0) { setNoteAuthorsLoaded(true); return; }
    let cancelled = false;
    Promise.all(
      uniqueIds.map(id =>
        fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
      )
    ).then(results => {
      if (cancelled) return;
      const map = {};
      results.filter(Boolean).forEach(u => { map[u.id] = u; });
      setNoteAuthors(map);
      setNoteAuthorsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [highlighted]); // eslint-disable-line react-hooks/exhaustive-deps

  const rating = place.community_summary?.overall_rating;
  const vibes = Array.isArray(place.community_summary?.overall_feel)
    ? place.community_summary.overall_feel
    : (place.community_summary?.overall_feel ? [place.community_summary.overall_feel] : []);
  const vibeColorMap = Object.fromEntries(options.vibes.map(v => [v.label.toLowerCase(), v.color]));
  const placeTypeColor = options.place_types.find(pt => pt.value === place.type_of_place)?.color ?? null;
  const cardBg = placeTypeColor
    ? `linear-gradient(to top, ${placeTypeColor}40 0%, transparent 60%)`
    : undefined;

  let walkMins = null;
  if (userLocation && place.coordinates) {
    const km = haversineKm(userLocation.lat, userLocation.lng, place.coordinates.lat, place.coordinates.lng);
    walkMins = Math.max(1, Math.round(km / 5 * 60)); // 5 km/h
  }

  return (
    <div className={`card${highlighted ? ' border-primary border-2 shadow-sm' : ''}`} style={{ background: cardBg }}>
      <div className="card-body pb-2">
        {/* Row 1: Heart + Name left, match % + rating right */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
            <button
              className="btn btn-link p-0 border-0 lh-1 flex-shrink-0"
              onClick={e => { e.stopPropagation(); toggleFavorite(place.id); }}
              onMouseEnter={() => setHeartHovered(true)}
              onMouseLeave={() => setHeartHovered(false)}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited
                ? (heartHovered
                  ? <HeartBrokenIcon width={20} height={20} style={{ color: '#dc3545' }} />
                  : <FavIcon width={20} height={20} style={{ color: '#dc3545' }} />)
                : <NotFavIcon width={20} height={20} style={{ color: '#adb5bd' }} />
              }
            </button>
            <h5
              ref={titleRef}
              className="card-title mb-0"
              style={{ whiteSpace: 'nowrap', minWidth: 0 }}
            >
              {place.name}
            </h5>
          </div>
          <div className="d-flex gap-2 align-items-center flex-shrink-0 ms-2">
            <MatchBadge pct={matchPct} />
            {rating != null && (
              <span
                className="small fw-semibold text-nowrap"
                title="Community rating based on visitor notes"
              >
                {rating.toFixed(1)} <StarIcon width={14} height={14} style={{ verticalAlign: '-1px' }} />
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Amenities left, friends count right */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <AmenitiesRow summary={place.community_summary} iconSize={20} />
          <div
            className="d-flex align-items-center gap-1 text-muted small flex-shrink-0"
            title={friendIdsHere.length === 1 ? '1 friend is here now' : `${friendIdsHere.length} friends are here now`}
          >
            <FriendIcon width={16} height={16} style={{ color: '#6c757d' }} />
            <span>{friendIdsHere.length}</span>
          </div>
        </div>

        {/* Row 3: Vibes left, walk time right */}
        {(vibes.length > 0 || walkMins !== null || (locationLoading && place.coordinates)) && (
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex flex-wrap gap-1">
              {vibes.map(v => (
                <span
                  key={v}
                  className="badge"
                  style={{ backgroundColor: vibeColorMap[v.toLowerCase()] ?? '#6c757d', color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}
                >
                  {v}
                </span>
              ))}
            </div>
            {walkMins !== null ? (
              <div className="d-flex align-items-center gap-1 text-muted small flex-shrink-0 ms-2">
                <WalkIcon width={16} height={16} />
                <span>{walkMins} min</span>
              </div>
            ) : (locationLoading && place.coordinates) ? (
              <LoadingIcon width={16} height={16} className="text-muted flex-shrink-0 ms-2" />
            ) : null}
          </div>
        )}
      </div>

      <div
        style={{
          height: expandHeight,
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

          {(() => {
            const notesWithContent = (place.community_notes ?? []).filter(n => (n.comment || n.rating != null) && noteAuthors[n.user_id]);
            return (
              <div className="mt-2">
                <p className="small fw-semibold mb-1">Community Notes</p>
                {!noteAuthorsLoaded ? (
                  <div className="d-flex justify-content-center py-2">
                    <LoadingIcon width={32} height={32} className="text-muted" />
                  </div>
                ) : notesWithContent.length === 0 ? (
                  <p className="small text-muted mb-0">This location has no community notes. Add one!</p>
                ) : (
                  <div style={{ maxHeight: 180, overflowY: 'auto' }} className="d-flex flex-column gap-2">
                    {notesWithContent.map(n => (
                      <div key={n.note_id} className="border rounded p-2 small">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-medium text-muted">@{noteAuthors[n.user_id].username}</span>
                          {n.rating != null && (
                            <span className="d-flex align-items-center gap-1 text-nowrap">
                              {n.rating} <StarIcon width={12} height={12} style={{ verticalAlign: '-1px' }} />
                            </span>
                          )}
                        </div>
                        {n.comment && <p className="mb-0">{n.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {user && (
            <button
              className="btn btn-sm btn-dark mt-3"
              onClick={e => { e.stopPropagation(); setShowNoteModal(true); }}
            >
              Add Community Note
            </button>
          )}
        </div>
      </div>

      {showNoteModal && (
        <AddNoteModal place={place} onClose={() => setShowNoteModal(false)} />
      )}
    </div>
  );
}
