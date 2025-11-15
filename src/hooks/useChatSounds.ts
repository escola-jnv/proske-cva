import { useEffect, useRef } from 'react';

export const useChatSounds = () => {
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const mentionSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio context for generating WhatsApp-like sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // WhatsApp-style send message sound - short click/pop
    const createMessageSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Quick frequency sweep for click sound
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.03);
      oscillator.type = 'sine';
      
      // Sharp attack and quick decay
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    };

    // Received message sound - softer, two-tone
    const createMentionSound = () => {
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Two gentle tones
      oscillator1.frequency.value = 520;
      oscillator1.type = 'sine';
      oscillator2.frequency.value = 440;
      oscillator2.type = 'sine';
      
      // Soft volume
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.08);
      
      oscillator2.start(audioContext.currentTime + 0.06);
      oscillator2.stop(audioContext.currentTime + 0.18);
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
