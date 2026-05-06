import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import AmenitiesRow from './AmenitiesRow';
import PlaceCard from './PlaceCard';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import loadingSvg from '../assets/loading.svg';
import InfoIcon from '../assets/info.svg?react';

const API = 'http://127.0.0.1:8000';

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

export default function GatheringCard({ gathering, place, placeSummary, highlighted = false, onEdit, onCancel }) {
  const user = useUser();
  const { token } = useAuth();
  const resolvedSummary = place?.community_summary ?? placeSummary;
  const expandRef = useRef(null);

  const [organizer, setOrganizer] = useState(null);
  const [participantDetails, setParticipantDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [expandHeight, setExpandHeight] = useState(0);

  useLayoutEffect(() => {
    if (!expandRef.current) return;
    setExpandHeight(highlighted ? expandRef.current.scrollHeight : 0);
  }, [highlighted, organizer, participantDetails, isGoing]);

  useEffect(() => {
    setIsGoing(user?.id ? (gathering.participant_user_ids?.includes(user.id) ?? false) : false);
  }, [user?.id, gathering._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const friendIds = user?.friend_ids ?? [];
  const friendsGoingCount = (gathering.participant_user_ids ?? []).filter(id => friendIds.includes(id)).length;

  useEffect(() => {
    if (!highlighted || !token) {
      setOrganizer(null);
      setParticipantDetails([]);
      setLoadingDetails(false);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);

    Promise.all([
      fetch(`${API}/penguins/users/${gathering.host_user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : null),
      Promise.all(
        (gathering.participant_user_ids ?? []).map(id =>
          fetch(`${API}/penguins/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
        )
      ),
    ]).then(([organizerData, participantResults]) => {
      if (cancelled) return;
      if (organizerData) setOrganizer(organizerData);
      setParticipantDetails(participantResults.filter(Boolean));
      setLoadingDetails(false);
    });

    return () => { cancelled = true; };
  }, [highlighted]); // eslint-disable-line react-hooks/exhaustive-deps

  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);

  const isHost = user?.id === gathering.host_user_id;

  async function handleCancel() {
    if (!token || cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API}/penguins/gatherings/${gathering._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        const updated = await res.json();
        onCancel?.(updated);
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleJoin() {
    if (!token || joining || isGoing) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/penguins/gatherings/${gathering._id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsGoing(true);
        if (user && !participantDetails.some(p => p.id === user.id)) {
          setParticipantDetails(prev => [...prev, user]);
        }
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!token || leaving || !isGoing) return;
    setLeaving(true);
    try {
      const res = await fetch(`${API}/penguins/gatherings/${gathering._id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsGoing(false);
        setParticipantDetails(prev => prev.filter(p => p.id !== user.id));
      }
    } finally {
      setLeaving(false);
    }
  }

  const canJoin = user && !isHost && !isGoing &&
    gathering.status !== 'ended' && gathering.status !== 'cancelled';

  return (
    <div className={`card h-100${highlighted ? ' border-primary border-2 shadow-sm' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h5 className="card-title mb-0">{gathering.title}</h5>
          <div className="d-flex gap-1 align-items-center">
            <span className={`badge ${STATUS_BADGE[gathering.status]} text-capitalize`}>
              {gathering.status}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <p className={`card-subtitle small mb-0 mt-0${highlighted ? ' text-primary fw-semibold' : ' text-muted'}`}>
            {place?.name}
          </p>
          {place && (
            <button
              className="btn btn-link p-0 border-0 lh-1 flex-shrink-0"
              title="View place details"
              onClick={e => { e.stopPropagation(); setShowPlaceModal(true); }}
            >
              <InfoIcon width={16} height={16} style={{ color: '#6c757d' }} />
            </button>
          )}
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

      <div
        style={{
          height: expandHeight,
          overflow: 'hidden',
          transition: 'height 280ms ease',
        }}
      >
        <div ref={expandRef} className="card-body border-top pt-2">
          {loadingDetails ? (
            <div className="d-flex justify-content-center py-2">
              <img src={loadingSvg} alt="Loading…" style={{ width: 40, height: 40 }} />
            </div>
          ) : (
            <>
              {organizer && (
                <p className="small mb-2">
                  <span className="fw-semibold">Organizer:</span>{' '}
                  {organizer.first_name} {organizer.last_name}{' '}
                  <span className="text-muted">@{organizer.username}</span>
                </p>
              )}

              {participantDetails.length > 0 && (
                <div className="mb-2">
                  <p className="small fw-semibold mb-1">Going</p>
                  {participantDetails.map(u => {
                    const isFriend = friendIds.includes(u.id);
                    return (
                      <p key={u.id} className="small mb-0 d-flex align-items-center gap-1 flex-wrap">
                        {isFriend && (
                          <>
                            <span className="fw-medium">{u.first_name} {u.last_name?.[0]}.</span>
                          </>
                        )}
                        <span className="text-muted">@{u.username}</span>
                        {isFriend && (
                          <span className="badge bg-success" style={{ fontSize: '0.7em' }}>Friend</span>
                        )}
                      </p>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {canJoin && (
            <button
              className="btn btn-sm btn-primary mt-1"
              onClick={e => { e.stopPropagation(); handleJoin(); }}
              disabled={joining}
            >
              {joining ? 'Joining…' : "I'm going"}
            </button>
          )}
          {!isHost && isGoing && (
            <div className="d-flex align-items-center gap-2 mt-1">
              <span className="small text-success fw-semibold">✓ You're going</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={e => { e.stopPropagation(); handleLeave(); }}
                disabled={leaving}
              >
                {leaving ? 'Leaving…' : 'Nevermind'}
              </button>
            </div>
          )}
          {isHost && (
            <div className="d-flex gap-2 mt-2">
              {onEdit && gathering.status !== 'cancelled' && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={e => { e.stopPropagation(); onEdit(); }}
                >
                  Edit
                </button>
              )}
              {gathering.status !== 'cancelled' && (
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={e => { e.stopPropagation(); handleCancel(); }}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Gathering'}
                </button>
              )}
            </div>
          )}
          {!isHost && onEdit && (
            <button
              className="btn btn-sm btn-outline-primary mt-2"
              onClick={e => { e.stopPropagation(); onEdit(); }}
            >
              Edit Gathering
            </button>
          )}
        </div>
      </div>

      <div className="card-footer d-flex justify-content-between align-items-center">
        <span className="small text-muted">
          {gathering.participant_user_ids?.length ?? 0} going
          {friendsGoingCount > 0 && ` (${friendsGoingCount} friend${friendsGoingCount === 1 ? '' : 's'})`}
        </span>
        <span className={`badge ${VISIBILITY_BADGE[gathering.visibility]} text-capitalize`}>
          {gathering.visibility}
        </span>
      </div>

      {showPlaceModal && place && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setShowPlaceModal(false)} />
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            onClick={() => setShowPlaceModal(false)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header py-2">
                  <h6 className="modal-title mb-0">Place Details</h6>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPlaceModal(false)}
                  />
                </div>
                <div className="modal-body p-2" onClick={e => e.stopPropagation()}>
                  <PlaceCard place={place} gatherings={[]} highlighted={true} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
