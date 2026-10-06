/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface SilkRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  distance?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export const SilkReveal: React.FC<SilkRevealProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 28,
  duration = 750,
  threshold = 0.12,
  once = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect user's motion preferences
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [threshold, once]);

  // Compute transform offset based on direction
  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0) scale(1)';

    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0) scale(1)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0) scale(1)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0) scale(1)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0) scale(1)`;
      case 'scale':
        return `translate3d(0, ${distance * 0.5}px, 0) scale(0.965)`;
      case 'fade':
      default:
        return 'translate3d(0, 0, 0) scale(1)';
    }
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
