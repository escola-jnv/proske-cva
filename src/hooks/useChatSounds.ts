import { useEffect, useRef } from 'react';

export const useChatSounds = () => {
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const mentionSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio elements for sounds
    // Using Web Audio API to generate simple beep sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Regular message sound - soft beep
    const createMessageSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    // Mention sound - double beep with higher pitch
    const createMentionSound = () => {
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.value = 1200;
      oscillator1.type = 'sine';
      oscillator2.frequency.value = 1400;
      oscillator2.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.1);
      
      oscillator2.start(audioContext.currentTime + 0.12);
      oscillator2.stop(audioContext.currentTime + 0.22);
    };

    messageSound.current = {
      play: createMessageSound,
    } as any;

    mentionSound.current = {
      play: createMentionSound,
    } as any;

    return () => {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  const playMessageSound = () => {
    if (messageSound.current) {
      messageSound.current.play();
    }
  };

  const playMentionSound = () => {
    if (mentionSound.current) {
      mentionSound.current.play();
    }
  };

  return { playMessageSound, playMentionSound };
};
