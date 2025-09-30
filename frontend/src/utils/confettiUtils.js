import confetti from 'canvas-confetti';

/**
 * Trigger a celebratory confetti effect
 * @param {Object} options - Configuration options for confetti
 */
export const triggerConfetti = (options = {}) => {
  const defaults = {
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  };

  const config = { ...defaults, ...options };
  confetti(config);
};

/**
 * Trigger a burst of confetti from both sides
 */
export const triggerDoubleBurst = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  // Left side burst
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    origin: { x: 0.1 }
  });

  // Right side burst
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    origin: { x: 0.9 }
  });

  // Center burst
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });

  // Final center burst
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
};

/**
 * Trigger a continuous confetti rain effect
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export const triggerConfettiRain = (duration = 3000) => {
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 0,
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    // Create confetti from random positions
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

/**
 * Trigger a celebration effect specifically for completion
 * Combines multiple effects for maximum celebration
 */
export const triggerCompletionCelebration = () => {
  // Initial burst
  triggerDoubleBurst();
  
  // Add some extra sparkle after a short delay
  setTimeout(() => {
    triggerConfetti({
      particleCount: 100,
      spread: 160,
      origin: { y: 0.5 },
      startVelocity: 45,
      scalar: 1.5
    });
  }, 500);

  // Final rain effect
  setTimeout(() => {
    triggerConfettiRain(2000);
  }, 1000);
};

/**
 * Trigger a simple success confetti
 */
export const triggerSuccessConfetti = () => {
  triggerConfetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.6 },
    startVelocity: 50,
    colors: ['#00C851', '#007E33', '#00FF41', '#32CD32', '#98FB98']
  });
};