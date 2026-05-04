// Attempts to provide a match rating (0%-100%) for a given location and the user's preferences
// Returns null if the user has no preferences set (nothing to match against).
// Type preference is weighted 2x relative to each individual amenity requirement.

export function calculateMatchRating(place, userPreferences) {
  if (!userPreferences) return null;

  const summary = place?.community_summary;
  let totalWeight = 0;
  let earnedWeight = 0;

  if (userPreferences.preferred_types?.length > 0) {
    totalWeight += 2;
    if (userPreferences.preferred_types.includes(place?.type_of_place)) earnedWeight += 2;
  }

  if (userPreferences.wifi_required) {
    totalWeight += 1;
    if (summary?.wifi_available) earnedWeight += 1;
  }

  if (userPreferences.outlets_required) {
    totalWeight += 1;
    if (summary?.outlets_available) earnedWeight += 1;
  }

  if (userPreferences.parking_required) {
    totalWeight += 1;
    if (summary?.parking_available) earnedWeight += 1;
  }

  if (totalWeight === 0) return null;

  return Math.round((earnedWeight / totalWeight) * 100);
}