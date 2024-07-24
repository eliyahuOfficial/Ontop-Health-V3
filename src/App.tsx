import React from 'react';
import './App.css';
import PatientList from './PatientList';

const App: React.FC = () => {
  return (
    <div>
      <div className="flex flex-col justify-center items-center text-center   leading-9 tracking-tight text-gray-900 py-2 gap-2">
        <h1 className='text-5xl'>Ontop-Health</h1>
        <h2 className='text-2xl'>Data, Driven, Workflows</h2>
      </div>
      <PatientList />
    </div>
  );
}

export default App;
