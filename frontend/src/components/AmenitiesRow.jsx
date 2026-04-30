// Quick visual representation of amenities available at a location, based on the summary data
import WifiIcon from '../assets/amentities_icons/wifi_ok.svg?react';
import NoWifiIcon from '../assets/amentities_icons/wifi_not_ok.svg?react';
import OutletIcon from '../assets/amentities_icons/outlet.svg?react';
import ParkingIcon from '../assets/amentities_icons/parking.svg?react';
import FoodIcon from '../assets/amentities_icons/food.svg?react';

const COLOR = {
  true: '#198754',
  false: '#dc3545',
  null: '#adb5bd',
};

export default function AmenitiesRow({ summary, iconSize = 24 }) {
  const wifi = summary?.wifi_available ?? null;
  const outlets = summary?.outlets_available ?? null;
  const parking = summary?.parking_available ?? null;
  const food = summary?.food_available ?? null;

  // Need these props bc svg file itself has hardcoded width/height and color, so we have to override with inline styles
  const iconProps = (color) => ({ width: iconSize, height: iconSize, style: { color } });

  return (
    <div className="d-flex gap-2 align-items-center">
      <span title={wifi === null ? 'Wifi unknown' : wifi ? 'Wifi available' : 'No wifi'}>
        {wifi === false
          ? <NoWifiIcon {...iconProps(COLOR[false])} />
          : <WifiIcon {...iconProps(COLOR[wifi])} />
        }
      </span>
      <span title={outlets === null ? 'Outlets unknown' : outlets ? 'Outlets available' : 'No outlets'}>
        <OutletIcon {...iconProps(COLOR[outlets])} />
      </span>
      <span title={parking === null ? 'Parking unknown' : parking ? 'Parking available' : 'No parking'}>
        <ParkingIcon {...iconProps(COLOR[parking])} />
      </span>
      <span title={food === null ? 'Food unknown' : food ? 'Food available' : 'No food'}>
        <FoodIcon {...iconProps(COLOR[food])} />
      </span>
    </div>
  );
}
