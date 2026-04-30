export default function ProfileCard({ user, showAddFriend = false }) {
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  return (
    <div className="card h-100">
      <div className="card-body text-center">
        <div
          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-2 overflow-hidden"
          style={{ width: 64, height: 64 }}
        >
          {user.profile_image_url
            ? <img src={user.profile_image_url} alt="avatar" style={{ width: 64, height: 64, objectFit: 'cover' }} />
            : <span className="text-white fs-5">{initials}</span>
          }
        </div>
        <h6 className="card-title mb-0">{user.first_name} {user.last_name}</h6>
        <p className="text-muted small mb-2">@{user.username}</p>
        <span className={`badge ${user.online_status?.is_online ? 'bg-success' : 'bg-secondary'}`}>
          {user.online_status?.is_online ? 'Online' : 'Offline'}
        </span>
        {showAddFriend && (
          <div className="mt-2">
            <button className="btn btn-outline-primary btn-sm">Add Friend</button>
          </div>
        )}
      </div>
    </div>
  );
}
