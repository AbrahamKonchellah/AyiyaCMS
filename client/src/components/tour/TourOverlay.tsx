import { useEffect, useState } from 'react';
import { TourState } from '../../hooks/useTour';
import './TourOverlay.css';

const PAD = 8; // padding around highlighted element

interface Props {
  state: TourState;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function TourOverlay({ state, onNext, onBack, onSkip }: Props) {
  const { rect, step, currentStep, totalSteps } = state;
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!rect || !step) return;
    const placement = step.placement ?? 'bottom';
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 160;
    let top = 0, left = 0;

    switch (placement) {
      case 'bottom':
        top  = rect.bottom + PAD + 12;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        break;
      case 'top':
        top  = rect.top - TOOLTIP_HEIGHT - PAD - 12;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        break;
      case 'right':
        top  = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
        left = rect.right + PAD + 12;
        break;
      case 'left':
        top  = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
        left = rect.left - TOOLTIP_WIDTH - PAD - 12;
        break;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 16));
    top  = Math.max(16, Math.min(top, window.innerHeight - TOOLTIP_HEIGHT - 16));

    setTooltipStyle({ top, left, width: TOOLTIP_WIDTH });
  }, [rect, step]);

  if (!step) return null;

  const highlight = rect
    ? {
        top:    rect.top    - PAD,
        left:   rect.left   - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  return (
    <div className="tour-overlay">
      {/* Dark backdrop with cutout */}
      <svg className="tour-backdrop" width="100%" height="100%">
        <defs>
          <mask id="tour-cutout">
            <rect width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left}
                y={highlight.top}
                width={highlight.width}
                height={highlight.height}
                rx="6"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(11,43,38,0.7)"
          mask="url(#tour-cutout)"
        />
        {highlight && (
          <rect
            x={highlight.left}
            y={highlight.top}
            width={highlight.width}
            height={highlight.height}
            rx="6"
            fill="none"
            stroke="#D4A853"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip */}
      <div className="tour-tooltip" style={tooltipStyle}>
        <div className="tour-tooltip-header">
          <span className="tour-step-count">{currentStep + 1} / {totalSteps}</span>
          <button className="tour-skip" onClick={onSkip}>Skip tour</button>
        </div>
        <div className="tour-tooltip-title">{step.title}</div>
        <div className="tour-tooltip-content">{step.content}</div>
        <div className="tour-tooltip-actions">
          {currentStep > 0 && (
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onBack}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-primary" style={{ padding: '6px 18px', fontSize: 13 }} onClick={onNext}>
            {currentStep === totalSteps - 1 ? 'Finish ✓' : 'Next →'}
          </button>
        </div>
        <div className="tour-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`tour-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}