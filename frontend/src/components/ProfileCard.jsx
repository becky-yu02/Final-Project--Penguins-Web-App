export default function ProfileCard({ user, showAddFriend = false, gatherings = [] }) {
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const isOnline = user.online_status?.is_online;
  const isBroadcasting = user.online_status?.broadcasting;

  const activeGathering = isBroadcasting
    ? gatherings.find(g =>
        g.status === 'active' &&
        (g.host_user_id === user.id || (g.participant_user_ids ?? []).includes(user.id))
      )
    : null;

  return (
    <div className="card h-100">
      <div className="card-body d-flex align-items-center justify-content-between gap-3">
        <div className="position-relative flex-shrink-0">
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center overflow-hidden"
            style={{ width: 52, height: 52 }}
          >
            {user.profile_image_url
              ? <img src={user.profile_image_url} alt="avatar" style={{ width: 52, height: 52, objectFit: 'cover' }} />
              : <span className="text-white">{initials}</span>
            }
          </div>
          <span
            className="position-absolute rounded-circle border border-white"
            style={{
              width: 13,
              height: 13,
              bottom: 1,
              right: 1,
              backgroundColor: isOnline ? '#23a55a' : '#80848e',
            }}
          />
        </div>
        <div className="flex-grow-1 min-width-0">
          <h6 className="mb-0 text-truncate">{user.first_name} {user.last_name}</h6>
          <p className="text-muted small mb-0 text-truncate">@{user.username}</p>
          {isBroadcasting && (
            <div className="mt-1">
              <span className="badge bg-success">Broadcasting</span>
              {activeGathering && (
                <p className="small text-muted mb-0 mt-1 text-truncate">
                  at {activeGathering.title}
                </p>
              )}
            </div>
          )}
          {showAddFriend && (
            <button className="btn btn-outline-primary btn-sm mt-2">Add Friend</button>
          )}
        </div>
      </div>
    </div>
  );
}
