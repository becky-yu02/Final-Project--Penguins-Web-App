import WifiIcon from '../assets/amentities_icons/wifi_ok.svg?react';
import NoWifiIcon from '../assets/amentities_icons/wifi_not_ok.svg?react';
import OutletIcon from '../assets/amentities_icons/outlet.svg?react';
import ParkingIcon from '../assets/amentities_icons/parking.svg?react';

const COLOR = {
  true: '#198754',
  false: '#dc3545',
  null: '#adb5bd',
};

export default function AmenitiesRow({ summary }) {
  const wifi = summary?.wifi_available ?? null;
  const outlets = summary?.outlets_available ?? null;
  const parking = summary?.parking_available ?? null;

  return (
    <div className="d-flex gap-2 align-items-center mt-1" style={{ height: 24 }}>
      <span title={wifi === null ? 'Wifi unknown' : wifi ? 'Wifi available' : 'No wifi'}>
        {wifi === false
          ? <NoWifiIcon style={{ color: COLOR[false], height: '100%' }} />
          : <WifiIcon style={{ color: COLOR[wifi], height: '100%' }} />
        }
      </span>
      <span title={outlets === null ? 'Outlets unknown' : outlets ? 'Outlets available' : 'No outlets'}>
        <OutletIcon style={{ color: COLOR[outlets], height: '100%' }} />
      </span>
      <span title={parking === null ? 'Parking unknown' : parking ? 'Parking available' : 'No parking'}>
        <ParkingIcon style={{ color: COLOR[parking], height: '100%' }} />
      </span>
    </div>
  );
}
