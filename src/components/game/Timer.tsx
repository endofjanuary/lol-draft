import { useState, useEffect, useRef } from "react";

interface TimerProps {
  duration: number; // in seconds
  isActive: boolean;
  onTimeout: () => void;
  onTick?: (remainingSeconds: number) => void;
  resetKey?: string | number; // Renamed from key to resetKey
}

export default function Timer({
  duration,
  isActive,
  onTimeout,
  onTick,
  resetKey = "default",
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [millisLeft, setMillisLeft] = useState(duration * 1000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);

  // Reset timer when resetKey changes
  useEffect(() => {
    setTimeLeft(duration);
    setMillisLeft(duration * 1000);
    hasStartedRef.current = false;
    lastUpdateTimeRef.current = Date.now();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [duration, resetKey]);

  // Timer countdown logic with smoother updates
  useEffect(() => {
    // If timer should be active but there's no interval running
    if (isActive && !intervalRef.current) {
      // Don't start a timer if we're already at 0
      if (millisLeft <= 0) return;

      hasStartedRef.current = true;
      lastUpdateTimeRef.current = Date.now();

      // Use a shorter interval for smoother visual updates (100ms)
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        setMillisLeft((prevMillis) => {
          // Calculate new milliseconds remaining
          const newMillis = Math.max(0, prevMillis - deltaTime);

          // Update seconds display only when it changes
          const newSeconds = Math.ceil(newMillis / 1000);

          if (Math.ceil(prevMillis / 1000) !== newSeconds) {
            setTimeLeft(newSeconds);

            // Notify parent component on each second change
            if (onTick) onTick(newSeconds);
          }

          // Handle timeout
          if (newMillis <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // 중요: 비동기적으로 타임아웃 콜백 호출
            setTimeout(() => {
              onTimeout();
            }, 0);

            return 0;
          }

          return newMillis;
        });
      }, 100); // Update every 100ms for smoother animation
    }
    // If timer should not be active but there is an interval running
    else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onTimeout, onTick, millisLeft]);

  // Calculate color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 5) return "text-red-500";
    if (timeLeft <= 10) return "text-yellow-500";
    return "text-white";
  };

  // Calculate exact percentage for smooth animation
  const getPercentage = () => {
    return (millisLeft / (duration * 1000)) * 100;
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`text-2xl font-bold ${getTimerColor()}`}>{timeLeft}s</div>
      <div className="w-full h-1 bg-gray-700 rounded-full mt-1">
        <div
          className={`h-1 rounded-full transition-all duration-100 ease-linear ${
            timeLeft <= 5
              ? "bg-red-500"
              : timeLeft <= 10
              ? "bg-yellow-500"
              : "bg-blue-500"
          }`}
          style={{ width: `${getPercentage()}%` }}
        />
      </div>
    </div>
  );
}
