import { useEffect, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

//rework later to show "match score" or whatever we wanna call it later

export default function TestSpaceCardCompact({ space, id }) {
    return (
        <>
            <div className='card' style={{ width: '18rem' }}>
                <div className='card-body'>
                    <h5 className='card-title'>{space.name}</h5>
                    <h6 className='card-subtitle mb-2 text-muted'>{space.address}</h6>
                    <table className='table'>
                        <tbody>
                            <tr>
                                <td><strong>Type:</strong></td>
                                <td>{space.type.join(', ')}</td>
                            </tr>
                            <tr>
                                <td><strong>Vibe:</strong></td>
                                <td>{space.vibe.join(', ')}</td>
                            </tr>
                            <tr>
                                <td><strong>WiFi:</strong></td>
                                <td>{space.wifi ? `Yes (Password: ${space.wifi_pw})` : 'No'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )

}