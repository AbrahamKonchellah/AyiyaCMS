import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface TourStep {
  target: string;       
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  route?: string;       // navigate here before showing this step
  action?: () => void;  // optional side effect when step shows
}

export interface TourState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  rect: DOMRect | null;
  step: TourStep | null;
}

const STORAGE_KEY = (userId: string) => `ayiyacms_tour_done_${userId}`;

export function useTour(steps: TourStep[], userId: string) {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const hasCompleted = () =>
    localStorage.getItem(STORAGE_KEY(userId)) === 'true';

  const markCompleted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY(userId), 'true');
  }, [userId]);

  const findAndMeasure = useCallback((step: TourStep) => {
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to settle then measure
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      }, 350);
    } else {
      setRect(null);
    }
  }, []);

  const showStep = useCallback(async (index: number) => {
    if (index >= steps.length) { end(); return; }
    const step = steps[index];
    if (step.route) navigate(step.route);
    // Give route time to render before querying DOM
    setTimeout(() => {
      findAndMeasure(step);
      step.action?.();
    }, step.route ? 400 : 50);
  }, [steps, navigate, findAndMeasure]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    showStep(0);
  }, [showStep]);

  const next = useCallback(() => {
    const nextIdx = currentStep + 1;
    setCurrentStep(nextIdx);
    showStep(nextIdx);
  }, [currentStep, showStep]);

  const back = useCallback(() => {
    const prevIdx = Math.max(0, currentStep - 1);
    setCurrentStep(prevIdx);
    showStep(prevIdx);
  }, [currentStep, showStep]);

  const end = useCallback(() => {
    setIsActive(false);
    setRect(null);
    markCompleted();
  }, [markCompleted]);

  // Re-measure on resize
  useEffect(() => {
    if (!isActive) return;
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = document.querySelector(steps[currentStep]?.target);
        if (el) setRect(el.getBoundingClientRect());
      });
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(rafRef.current!); };
  }, [isActive, currentStep, steps]);

  return {
    isActive,
    hasCompleted,
    start,
    next,
    back,
    end,
    state: {
      currentStep,
      totalSteps: steps.length,
      step: steps[currentStep] ?? null,
      rect,
    } as TourState,
  };
}