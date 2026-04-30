//Creates row of amentities icons that represent the amentities a space has or does not have

// Imports using vite svgr plugin for easy css styling
import FoodIcon from '../assets/amentities_icons/food.svg?react';
import OutletIcon from '../assets/amentities_icons/outlet.svg?react';
import ParkingIcon from '../assets/amentities_icons/parking.svg?react';
import RestroomIcon from '../assets/amentities_icons/restroom.svg?react';
import WifiIcon from '../assets/amentities_icons/wifi_ok.svg?react';
import NoWifiIcon from '../assets/amentities_icons/wifi_not_ok.svg?react';
import ProtectedWifiIcon from '../assets/amentities_icons/wifi_locked.svg?react';
import './test_amenities_row.css';

export default function TestAmenitiesRow({ space }) {
    const extracted_amenities = {
        'wifi': space.wifi,
        'wifi_pw': space.wifi_pw,
        'outlets': space.outlets,
        'food': space.food,
        'restrooms': space.restrooms,
        'parking': space.parking
    }

    return (
        <div style={{
            maxHeight: '32px', minHeight: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: '4px', paddingLeft: '7px'
        }}>
            {
                Object.entries(extracted_amenities).map(([amenity, value]) => {
                    {/* WIFI */ }
                    if (amenity === 'wifi' && value === true) {
                        if (extracted_amenities.wifi_pw != null) {
                            if (extracted_amenities.wifi_pw === 'eduroam') {
                                return (
                                    <div key={amenity} title='Wifi Available - Eduroam' style={{ height: '100%' }}> {/* wrapped in title div for mouseover tooltip */}
                                        <ProtectedWifiIcon key={amenity} className='yellow' />
                                    </div>
                                )
                            }
                            else {
                                return (
                                    <div key={amenity} title={`Wifi Available - Password: ${extracted_amenities.wifi_pw}`} style={{ height: '100%' }}>
                                        <ProtectedWifiIcon key={amenity} className='green' />
                                    </div>
                                )
                            }
                        }
                        else {
                            return (
                                <div key={amenity} title='Wifi Available' style={{ height: '100%' }}>
                                    <WifiIcon key={amenity} className='green' title='Wifi Available' />
                                </div>
                            )
                        }
                    }
                    else if (amenity === 'wifi' && value === false) {
                        return (
                            <div key={amenity} title='No Wifi at this space :(' style={{ height: '100%' }}>
                                <NoWifiIcon key={amenity} className='red' title='No Wifi at this space :(' />
                            </div>
                        )
                    }
                    {/* OUTLETS */ }
                    if (amenity === 'outlets' && value === true) {
                        return (
                            <div key={amenity} title='Outlets Available' style={{ height: '100%' }}>
                                <OutletIcon key={amenity} className='green' />
                            </div>
                        )
                    }
                    else if (amenity === 'outlets' && value === false) {
                        return (
                            <div key={amenity} title='No Outlets at this space :(' style={{ height: '100%' }}>
                                <OutletIcon key={amenity} className='red' />
                            </div>
                        )
                    }
                    {/* FOOD/DRINK */ }
                    if (amenity === 'food' && value === true) {
                        return (
                            <div key={amenity} title='Food/Drink Available' style={{ height: '100%' }}>
                                <FoodIcon key={amenity} className='green' />
                            </div>
                        )
                    }
                    else if (amenity === 'food' && value === false) {
                        return (
                            <div key={amenity} title='No Food/Drink at this space :(' style={{ height: '100%' }}>
                                <FoodIcon key={amenity} className='red' />
                            </div>
                        )
                    }
                    {/* RESTROOMS */ }
                    if (amenity === 'restrooms' && value === true) {
                        return (
                            <div key={amenity} title='Restrooms Available' style={{ height: '100%' }}>
                                <RestroomIcon key={amenity} className='green' />
                            </div>
                        )
                    }
                    else if (amenity === 'restrooms' && value === false) {
                        return (
                            <div key={amenity} title='No Restrooms at this space :(' style={{ height: '100%' }}>
                                <RestroomIcon key={amenity} className='red' />
                            </div>
                        )
                    }
                    {/* PARKING */ }
                    if (amenity === 'parking' && value === true) {
                        return (
                            <div key={amenity} title='Parking Available' style={{ height: '100%' }}>
                                <ParkingIcon key={amenity} className='green' />
                            </div>
                        )
                    }
                    else if (amenity === 'parking' && value === false) {
                        return (
                            <div key={amenity} title='No Parking at this space :(' style={{ height: '100%' }}>
                                <ParkingIcon key={amenity} className='red' />
                            </div>
                        )
                    }

                })
            }
        </div >
    )
}