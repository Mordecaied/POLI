import React from 'react';

interface PoliLogoProps {
  className?: string;
  size?: number;
}

export function PoliLogo({ className = '', size = 48 }: PoliLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
    >
      {/* POLI QA Parrot Logo */}

      {/* Head Feathers (Green - Pass) */}
      <g id="feathers">
        {/* Main head shape */}
        <path
          d="M280 80 Q380 60 420 140 Q460 220 440 300 Q420 360 360 380 L320 340 Q360 300 350 240 Q340 180 300 140 Z"
          fill="#2ecc71"
        />
        {/* Top crest feathers */}
        <path d="M260 90 Q300 40 340 60 Q320 100 280 110 Z" fill="#27ae60" />
        <path d="M300 70 Q350 20 390 50 Q360 90 320 95 Z" fill="#2ecc71" />
        <path d="M340 60 Q400 10 440 60 Q400 90 360 85 Z" fill="#27ae60" />
        {/* Back feathers */}
        <path
          d="M420 300 Q480 320 500 400 Q520 480 460 500 Q400 480 380 420 Q360 380 380 340 Z"
          fill="#2ecc71"
        />
        <path
          d="M400 340 Q450 380 460 440 Q440 480 400 460 Q380 420 390 380 Z"
          fill="#27ae60"
        />
        {/* Cheek/face area */}
        <path
          d="M200 200 Q260 160 320 180 Q360 200 360 260 Q340 300 280 300 Q220 280 200 240 Z"
          fill="#2ecc71"
        />
      </g>

      {/* Beak (Orange/Yellow - Warning/Skip) */}
      <g id="beak">
        {/* Upper beak */}
        <path
          d="M180 220 Q200 180 260 180 Q280 200 260 220 Q200 240 140 260 Q120 240 140 220 Z"
          fill="#f1c40f"
        />
        <path d="M140 230 Q100 240 60 280 Q80 260 120 240 Z" fill="#e67e22" />
        {/* Lower beak (open mouth) */}
        <path
          d="M180 260 Q200 250 240 260 Q260 280 240 300 Q180 320 140 300 Q120 280 140 270 Z"
          fill="#e67e22"
        />
        {/* Beak curve/hook */}
        <path d="M60 280 Q40 300 50 320 Q70 310 80 290 Z" fill="#d35400" />
      </g>

      {/* Inside Mouth (Red - Fail/Alert) */}
      <g id="mouth">
        <path
          d="M180 260 Q200 270 220 265 Q240 280 220 295 Q180 300 160 285 Q150 270 165 260 Z"
          fill="#e74c3c"
        />
        {/* Tongue */}
        <path
          d="M170 275 Q190 285 200 280 Q195 290 175 288 Q165 282 170 275 Z"
          fill="#c0392b"
        />
      </g>

      {/* Eye */}
      <g id="eye">
        {/* Eye white */}
        <ellipse cx="300" cy="200" rx="35" ry="40" fill="#fff" />
        {/* Iris */}
        <circle cx="295" cy="205" r="22" fill="#2c3e50" />
        {/* Pupil */}
        <circle cx="290" cy="200" r="12" fill="#000" />
        {/* Eye highlight */}
        <circle cx="285" cy="195" r="6" fill="#fff" />
        {/* Eye ring */}
        <ellipse
          cx="300"
          cy="200"
          rx="35"
          ry="40"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="3"
        />
      </g>

      {/* Face details */}
      <g id="details">
        {/* Nostril on beak */}
        <ellipse cx="200" cy="200" rx="8" ry="5" fill="#d35400" />
        {/* Feather texture lines */}
        <path
          d="M320 140 Q340 160 335 190"
          fill="none"
          stroke="#27ae60"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M350 160 Q365 185 360 220"
          fill="none"
          stroke="#27ae60"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M380 200 Q390 230 385 270"
          fill="none"
          stroke="#27ae60"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
