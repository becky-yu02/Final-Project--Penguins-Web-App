import { useEffect, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import TestAmenitiesRow from "./test_amenities_row.jsx";

export default function TestSpaceCardFull({ space, id }) {
    return (
        <>
            <div className='card' style={{ width: '25rem' }}>
                <div className='card-body'>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h5 style={{ marginBottom: '0' }}>{space.name}</h5>
                        <TestAmenitiesRow space={space} />
                    </div>
                    <h6 className='card-subtitle mb-2 text-muted'>{space.address}</h6>

                </div>
            </div>
        </>
    )

}