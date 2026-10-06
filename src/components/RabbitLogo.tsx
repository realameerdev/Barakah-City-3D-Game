/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoImg from '../assets/images/rabbit_gamepad_logo_1791287368018.jpg';

interface RabbitLogoProps {
  className?: string;
  size?: number;
  inverted?: boolean;
}

export default function RabbitLogo({ className = '', size = 36, inverted = true }: RabbitLogoProps) {
  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoImg}
        alt="Baraka City Rabbit Gamepad Logo"
        className={`w-full h-full object-contain ${inverted ? 'invert brightness-200 contrast-200' : ''}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
