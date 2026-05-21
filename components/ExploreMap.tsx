
import React from 'react';
import { OutdoorSpot } from '../types';

interface ExploreMapProps {
  spots: OutdoorSpot[];
  onSelectSpot: (spot: OutdoorSpot) => void;
}

export const ExploreMap: React.FC<ExploreMapProps> = ({ spots, onSelectSpot }) => {
  return (
    <div className="relative w-full h-full bg-stone-100 overflow-hidden">
      {/* Abstract Map Background */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 600" fill="none">
        <path d="M0 100C50 120 100 80 150 110S250 180 300 150S400 120 400 120V600H0V100Z" fill="#a8a29e" />
        <path d="M0 250C100 230 150 280 200 250S300 180 400 210V600H0V250Z" fill="#8b8c89" />
        <circle cx="200" cy="300" r="150" stroke="#d6d3d1" strokeWidth="1" />
        <circle cx="200" cy="300" r="250" stroke="#d6d3d1" strokeWidth="1" />
      </svg>
      
      {/* Markers */}
      {spots.map((spot, idx) => (
        <button
          key={spot.id}
          onClick={() => onSelectSpot(spot)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
          style={{ 
            top: `${20 + (idx * 15) + (Math.random() * 10)}%`, 
            left: `${20 + (idx * 18) + (Math.random() * 10)}%` 
          }}
        >
          <div className="bg-white px-3 py-1 rounded-full shadow-lg border-2 border-emerald-600 font-bold text-xs whitespace-nowrap group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            ${spot.price}
          </div>
          <div className="w-1 h-3 bg-emerald-600 mx-auto rounded-full -mt-1 shadow-sm"></div>
        </button>
      ))}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-stone-200">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Referencia del Mapa</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
            <span className="text-xs font-medium">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-stone-300 rounded-full"></div>
            <span className="text-xs font-medium">Completo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
