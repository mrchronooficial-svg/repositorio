"use client";

import { useState, useEffect, useRef } from "react";

// Variation ±20% around a base number
export function getFluctuatingNumber(base: number): number {
  const variance = base * 0.2;
  const min = Math.round(base - variance);
  const max = Math.round(base + variance);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hook for countdown timer
export function useCountdown(targetDate: Date | string | null) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: true });

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    function calculate() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return true; // expired
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isExpired: false });
      return false;
    }

    calculate();
    const timer = setInterval(() => {
      if (calculate()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// Hook for fluctuating engagement numbers
export function useFluctuatingNumber(base: number, intervalMs = 4000) {
  const [value, setValue] = useState(() => getFluctuatingNumber(base));

  useEffect(() => {
    const timer = setInterval(() => {
      setValue(getFluctuatingNumber(base));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [base, intervalMs]);

  return value;
}
