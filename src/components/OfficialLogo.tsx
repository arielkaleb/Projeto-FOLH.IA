import React from "react";

interface OfficialLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
}

export default function OfficialLogo({ className = "", size = "md" }: OfficialLogoProps) {
  // Determine dimensions based on size prop
  let dimensions = "w-10 h-10";
  if (typeof size === "number") {
    dimensions = `w-[${size}px] h-[${size}px]`;
  } else {
    switch (size) {
      case "sm":
        dimensions = "w-6 h-6";
        break;
      case "md":
        dimensions = "w-10 h-10";
        break;
      case "lg":
        dimensions = "w-16 h-16";
        break;
      case "xl":
        dimensions = "w-24 h-24 sm:w-28 sm:h-28";
        break;
    }
  }

  return (
    <svg
      viewBox="0 0 500 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimensions} ${className}`}
      id="official-folhia-logo"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="leafGrad" x1="120" y1="200" x2="250" y2="350" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
        
        <linearGradient id="gearGrad" x1="100" y1="50" x2="250" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        
        <linearGradient id="circuitGrad" x1="250" y1="50" x2="450" y2="350" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#00B0FF" />
          <stop offset="100%" stopColor="#2979FF" />
        </linearGradient>

        <linearGradient id="pinGrad" x1="220" y1="160" x2="280" y2="240" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#43A047" />
          <stop offset="100%" stopColor="#0E3A11" />
        </linearGradient>
      </defs>

      {/* Main Container representing stylized Brazil outline with eco-tech hybrid */}
      <g id="brazil-map-hybrid">
        
        {/* LEFT SIDE: AGRO & NATURE (Gears & Leaf in shades of green) */}
        
        {/* Partial Gear (Top Left) */}
        <path
          d="M 230 74 
             L 225 60 L 205 63 L 200 78 
             A 120 120 0 0 0 171 90 
             L 159 78 L 142 90 L 151 105 
             A 120 120 0 0 0 131 129 
             L 115 125 L 105 145 L 120 152 
             A 120 120 0 0 0 112 178 
             L 96 182 L 96 204 L 112 208 
             A 120 120 0 0 0 115 220
             L 242 220 L 242 74 Z"
          fill="url(#gearGrad)"
          opacity="0.9"
          stroke="#1B5E20"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Big Leaf (Bottom Left / Central) */}
        <path
          d="M 120 180 
             C 120 250, 160 320, 245 365 
             C 245 310, 230 260, 215 230
             C 195 190, 150 175, 120 180 Z"
          fill="url(#leafGrad)"
          stroke="#0E3A11"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Leaf Vein & Outer Border Accent */}
        <path
          d="M 245 365 
             C 210 310, 175 250, 150 205"
          stroke="#C8E6C9"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Leaf bottom hook curving to represent Southern Brazil tail */}
        <path
          d="M 245 365 
             C 245 385, 230 395, 222 410
             C 235 405, 248 395, 248 365 Z"
          fill="#1B5E20"
        />

        {/* RIGHT SIDE: INTELLIGENCE & CIRCUIT (Digital Brain in Blue/Teal) */}
        {/* Recreating the digital nodes & connections map of East Brazil */}
        <g id="circuit-side">
          {/* Main vertical trunk lines & connections */}
          <path
            d="M 258 74 L 258 350
               M 258 110 L 330 110 L 370 150 L 370 200 L 410 240
               M 258 160 L 300 160 L 340 200 L 340 280
               M 258 260 L 290 290 L 350 290
               M 330 110 L 350 70 L 400 70
               M 370 150 L 430 150 L 450 180 L 420 220"
            stroke="url(#circuitGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Detailed Brain/Circuit Nodes (Glow Circles) */}
          {/* Node 1: Northeast top */}
          <circle cx="400" cy="70" r="10" fill="#00E5FF" stroke="#2979FF" strokeWidth="3" />
          {/* Node 2: North top */}
          <circle cx="350" cy="70" r="8" fill="#00E5FF" stroke="#2979FF" strokeWidth="2.5" />
          {/* Node 3: Center-east */}
          <circle cx="430" cy="150" r="11" fill="#00B0FF" stroke="#1565C0" strokeWidth="3" />
          {/* Node 4: Far East bulge */}
          <circle cx="450" cy="180" r="9" fill="#2979FF" stroke="#1565C0" strokeWidth="2.5" />
          {/* Node 5: Southeast middle */}
          <circle cx="420" cy="220" r="10" fill="#00E5FF" stroke="#2979FF" strokeWidth="3" />
          {/* Node 6: Southeast bottom */}
          <circle cx="410" cy="240" r="8" fill="#00B0FF" stroke="#2979FF" strokeWidth="2.5" />
          {/* Node 7: Southern interior node */}
          <circle cx="340" cy="280" r="11" fill="#2979FF" stroke="#1565C0" strokeWidth="3" />
          {/* Node 8: South point of circuit */}
          <circle cx="350" cy="290" r="9" fill="#00E5FF" stroke="#1565C0" strokeWidth="2.5" />
          {/* Node 9: In-between trunk nodes */}
          <circle cx="300" cy="160" r="7" fill="#00B0FF" stroke="#2979FF" strokeWidth="2" />
          <circle cx="330" cy="110" r="7" fill="#00E5FF" stroke="#2979FF" strokeWidth="2" />
        </g>

        {/* CENTERPIECE: GEOLOCATION PIN (Unifying Green pin over the divider) */}
        <g id="geolocation-pin" className="drop-shadow-lg">
          {/* Map pin background shadow aura */}
          <ellipse cx="250" cy="240" rx="18" ry="6" fill="#1B5E20" opacity="0.3" />
          
          {/* Map Pin Path */}
          <path
            d="M 250 165
               C 228 165, 212 181, 212 203
               C 212 222, 238 249, 245 256
               C 248 259, 252 259, 255 256
               C 262 249, 288 222, 288 203
               C 288 181, 272 165, 250 165 Z"
            fill="url(#pinGrad)"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Central hole in the map pin (representing a leaf or white node dot) */}
          <circle cx="250" cy="198" r="11" fill="#ffffff" />
          <circle cx="250" cy="198" r="6" fill="#1B5E20" />
        </g>

      </g>
    </svg>
  );
}
