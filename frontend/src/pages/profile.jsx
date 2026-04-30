import { useState } from 'react';
import Navbar from '../components/Navbar';
import ProfileCard from '../components/ProfileCard';
import PlaceCard from '../components/PlaceCard';
import GatheringCard from '../components/GatheringCard';
import mockUsers from '../mock/users.json';
import mockPlaces from '../mock/places.json';
import mockGatherings from '../mock/gatherings.json';

export default function Profile() {
  const [tab, setTab] = useState('friends');

  const currentUser = mockUsers[0];
  const friends = mockUsers.slice(1);
  const favorites = mockPlaces.slice(0, 2);
  const userGatherings = mockGatherings.filter(g => g.host_user_id === currentUser.id);

  const initials = `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase();

  return (
    <>
      <Navbar />
      <div className="container py-4">

        {/* Profile header */}
        <div className="card mb-4">
          <div className="card-body d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden"
              style={{ width: 80, height: 80 }}
            >
              {currentUser.profile_image_url
                ? <img src={currentUser.profile_image_url} alt="avatar" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                : <span className="text-white fs-3">{initials}</span>
              }
            </div>
            <div className="flex-grow-1">
              <h3 className="mb-0">{currentUser.first_name} {currentUser.last_name}</h3>
              <p className="text-muted mb-1">@{currentUser.username}</p>
              <span className={`badge ${currentUser.online_status?.is_online ? 'bg-success' : 'bg-secondary'}`}>
                {currentUser.online_status?.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
            <button className="btn btn-outline-secondary btn-sm">Edit Profile</button>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'friends' ? 'active' : ''}`}
              onClick={() => setTab('friends')}
            >
              Friends ({friends.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'favorites' ? 'active' : ''}`}
              onClick={() => setTab('favorites')}
            >
              Favorites ({favorites.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'gatherings' ? 'active' : ''}`}
              onClick={() => setTab('gatherings')}
            >
              My Gatherings ({userGatherings.length})
            </button>
          </li>
        </ul>

        {tab === 'friends' && (
          <div className="row row-cols-2 row-cols-md-4 g-3">
            {friends.map(user => (
              <div className="col" key={user.id}>
                <ProfileCard user={user} showAddFriend />
              </div>
            ))}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="row row-cols-1 row-cols-md-3 g-3">
            {favorites.map(place => (
              <div className="col" key={place.id}>
                <PlaceCard place={place} />
              </div>
            ))}
          </div>
        )}

        {tab === 'gatherings' && (
          userGatherings.length === 0
            ? <p className="text-muted">No gatherings yet.</p>
            : (
              <div className="row row-cols-1 row-cols-md-3 g-3">
                {userGatherings.map(g => (
                  <div className="col" key={g.id}>
                    <GatheringCard
                    gathering={g}
                    placeSummary={mockPlaces.find(p => p.id === g.place_id)?.community_summary}
                  />
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </>
  );
}
