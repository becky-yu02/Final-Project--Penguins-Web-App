import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
//import bootstrap from 'bootstrap';

// Testing
import TestSpaceCardCompact from './testing/test_space_card_compact';
import TestSpaceCardFull from './testing/test_space_card_full';
import space_test_data from './testing/space_test_data.json';


import './App.css'

function App() {


  return (
    <>
      <h1>Penguins Testing</h1>
      {Object.entries(space_test_data).map(([id, space]) => (
        <div key={id} style={{ marginBottom: '20px' }}>
          <TestSpaceCardFull space={space} id={id} />
        </div>
      ))}
    </>
  )
}

export default App
