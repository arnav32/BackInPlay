import { useEffect, useRef, useState } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenRef = useRef<string>('');
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      utteranceRef.current.rate = 1.0;
      utteranceRef.current.pitch = 1.0;
      utteranceRef.current.volume = 1.0;

      utteranceRef.current.onstart = () => setIsSpeaking(true);
      utteranceRef.current.onend = () => setIsSpeaking(false);
    }

    return () => {
      window.speechSynthesis.cancel();
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
    };
  }, []);

  const speak = (text: string, debounceMs = 2000) => {
    if (!utteranceRef.current) return;

    // Don't repeat the same message too quickly
    if (lastSpokenRef.current === text) return;

    // Clear any pending speech
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
    }

    // Debounce to avoid overwhelming the user
    speakTimeoutRef.current = setTimeout(() => {
      window.speechSynthesis.cancel();
      utteranceRef.current!.text = text;
      window.speechSynthesis.speak(utteranceRef.current!);
      lastSpokenRef.current = text;
    }, debounceMs);
  };

  const cancel = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { speak, cancel, isSpeaking };
};