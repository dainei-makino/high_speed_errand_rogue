'use client';

import { useEffect, useRef } from 'react';
import { bootGame } from '@/game';

export default function GameWrapper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) bootGame(ref.current);
  }, []);

  return <div ref={ref} id="phaser-root" className="w-full h-full" />;
}
