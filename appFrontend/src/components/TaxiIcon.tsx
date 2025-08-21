import React from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, Filter, FeDropShadow } from 'react-native-svg';

interface TaxiIconProps {
  size?: number;
  color?: string;
  style?: any;
}

const TaxiIcon: React.FC<TaxiIconProps> = ({ 
  size = 24, 
  color = '#FFD700',
  style 
}) => {
  // Create darker and lighter variants for 3D effect
  const darkerColor = '#E6C200'; // Darker yellow for shadows
  const lighterColor = '#FFF200'; // Lighter yellow for highlights
  const shadowColor = '#00000040'; // Semi-transparent black for shadows

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Defs>
        {/* 3D Shadow Filter */}
        <Filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <FeDropShadow dx="1" dy="2" stdDeviation="1" floodColor={shadowColor} />
        </Filter>
        
        {/* Taxi Body Gradient */}
        <LinearGradient id="taxiBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={lighterColor} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darkerColor} />
        </LinearGradient>
        
        {/* Taxi Sign Gradient */}
        <LinearGradient id="taxiSign" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={lighterColor} />
          <Stop offset="100%" stopColor={darkerColor} />
        </LinearGradient>
        
        {/* Window Gradient */}
        <LinearGradient id="window" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#B0E0E6" />
          <Stop offset="100%" stopColor="#87CEEB" />
        </LinearGradient>
        
        {/* Wheel Gradient */}
        <LinearGradient id="wheel" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#696969" />
          <Stop offset="50%" stopColor="#2F2F2F" />
          <Stop offset="100%" stopColor="#000000" />
        </LinearGradient>
      </Defs>

      {/* Shadow Layer */}
      <Path
        d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        fill={shadowColor}
        transform="translate(0.5, 0.5)"
        filter="url(#shadow)"
      />

      {/* Taxi Body - Main Layer */}
      <Path
        d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        fill="url(#taxiBody)"
        stroke={darkerColor}
        strokeWidth="0.5"
      />

      {/* Taxi Sign - 3D Effect */}
      <Rect x="9" y="3" width="6" height="2" fill="url(#taxiSign)" rx="0.5" stroke={darkerColor} strokeWidth="0.3" />
      
      {/* Taxi Sign Highlight */}
      <Rect x="9.2" y="3.1" width="5.6" height="0.8" fill={lighterColor} rx="0.3" />

      {/* Windows with 3D effect */}
      <Path
        d="M7 8h2v2H7z"
        fill="url(#window)"
        stroke="#4682B4"
        strokeWidth="0.3"
      />
      <Path
        d="M15 8h2v2h-2z"
        fill="url(#window)"
        stroke="#4682B4"
        strokeWidth="0.3"
      />
      
      {/* Window Highlights */}
      <Path
        d="M7.2 8.2h1.6v0.6H7.2z"
        fill="#FFFFFF"
        opacity="0.6"
      />
      <Path
        d="M15.2 8.2h1.6v0.6h-1.6z"
        fill="#FFFFFF"
        opacity="0.6"
      />

      {/* Wheels with 3D effect */}
      <Circle cx="6.5" cy="16" r="1.5" fill="url(#wheel)" stroke="#000000" strokeWidth="0.3" />
      <Circle cx="17.5" cy="16" r="1.5" fill="url(#wheel)" stroke="#000000" strokeWidth="0.3" />
      
      {/* Wheel Highlights */}
      <Circle cx="6.3" cy="15.8" r="0.8" fill="#FFFFFF" opacity="0.3" />
      <Circle cx="17.3" cy="15.8" r="0.8" fill="#FFFFFF" opacity="0.3" />

      {/* Headlights */}
      <Circle cx="5.5" cy="9" r="0.4" fill="#FFFFFF" stroke="#FFD700" strokeWidth="0.2" />
      <Circle cx="18.5" cy="9" r="0.4" fill="#FFFFFF" stroke="#FFD700" strokeWidth="0.2" />
      
      {/* Headlight Highlights */}
      <Circle cx="5.3" cy="8.8" r="0.2" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="18.3" cy="8.8" r="0.2" fill="#FFFFFF" opacity="0.8" />

      {/* Grill */}
      <Rect x="8" y="10" width="8" height="0.5" fill="#2F2F2F" rx="0.2" />
      <Rect x="8.5" y="10.5" width="7" height="0.3" fill="#2F2F2F" rx="0.1" />

      {/* Side Mirrors */}
      <Path
        d="M4.5 7.5 L3.5 7 L3.5 8 L4.5 8.5 Z"
        fill="url(#taxiBody)"
        stroke={darkerColor}
        strokeWidth="0.2"
      />
      <Path
        d="M19.5 7.5 L20.5 7 L20.5 8 L19.5 8.5 Z"
        fill="url(#taxiBody)"
        stroke={darkerColor}
        strokeWidth="0.2"
      />
    </Svg>
  );
};

export default TaxiIcon;
