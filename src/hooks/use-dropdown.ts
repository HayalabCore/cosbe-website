'use client';

import { useState, useRef, useCallback } from 'react';

interface UseDropdownReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

export function useDropdown(closeDelay = 150): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    clearTimeoutRef();
    setIsOpen(true);
  }, [clearTimeoutRef]);

  const close = useCallback(() => {
    clearTimeoutRef();
    setIsOpen(false);
  }, [clearTimeoutRef]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeoutRef();
    setIsOpen(true);
  }, [clearTimeoutRef]);

  const handleMouseLeave = useCallback(() => {
    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  }, [closeDelay, clearTimeoutRef]);

  return {
    isOpen,
    open,
    close,
    toggle,
    handleMouseEnter,
    handleMouseLeave,
  };
}
