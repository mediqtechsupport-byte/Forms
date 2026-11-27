import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, Type, Check } from 'lucide-react';

interface SignaturePadProps {
  signerName: string;
  initialSignature?: string | null;
  onChange: (value: string, mode: 'drawn' | 'typed') => void;
  compact?: boolean;
}

export function SignaturePad({
  signerName,
  initialSignature,
  onChange,
  compact = false,
}: SignaturePadProps) {
  const isImageData = Boolean(initialSignature?.startsWith('data:image'));
  const [mode, setMode] = useState<'draw' | 'type'>(isImageData ? 'draw' : 'type');
  const [typedText, setTypedText] = useState(
    !isImageData && initialSignature ? initialSignature : signerName
  );
  const [hasStroke, setHasStroke] = useState(isImageData);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (mode === 'type') {
      onChange(typedText.trim(), 'typed');
    }
  }, [mode, typedText, onChange]);

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current && initialSignature?.startsWith('data:image')) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      img.src = initialSignature;
    }
  }, [mode, initialSignature]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const pt = getPoint(e);
    ctx.strokeStyle = '#0d1c36';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    setHasStroke(true);
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'), 'drawn');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onChange('', 'drawn');
  };

  return (
    <div className="rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/70 p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[0.06em] text-[#0f2344] uppercase">
          Digital E-Signature
        </span>
        <div className="inline-flex rounded-full border border-[#dfd5c5] bg-[#fdfbf7] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition ${
              mode === 'type'
                ? 'bg-gradient-to-b from-[#163362] to-[#071329] text-[#f7f2e8] shadow-xs'
                : 'text-[#5c5951] hover:text-[#0d1c36]'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            Type
          </button>
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition ${
              mode === 'draw'
                ? 'bg-gradient-to-b from-[#163362] to-[#071329] text-[#f7f2e8] shadow-xs'
                : 'text-[#5c5951] hover:text-[#0d1c36]'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            Draw
          </button>
        </div>
      </div>

      {mode === 'type' ? (
        <div className="space-y-2.5">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Type your full name to sign"
            className="w-full rounded-[14px] border border-[#dfd5c5] bg-white px-3.5 py-2.5 text-sm text-[#0d1c36] placeholder:text-[#8a8478] transition focus:border-[#163362] focus:ring-2 focus:ring-[#163362]/15 focus:outline-none"
          />
          <div
            className={`flex items-center justify-center rounded-[14px] border border-dashed border-[#c9bda8] bg-white px-4 ${
              compact ? 'h-16' : 'h-20'
            }`}
          >
            {typedText.trim() ? (
              <span
                className="text-3xl text-[#0d1c36] select-none"
                style={{ fontFamily: 'var(--font-signature)' }}
              >
                {typedText}
              </span>
            ) : (
              <span className="text-xs text-[#8a8478]">Your digital signature preview</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="relative overflow-hidden rounded-[14px] border border-dashed border-[#c9bda8] bg-white">
            <canvas
              ref={canvasRef}
              width={540}
              height={compact ? 110 : 140}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`w-full touch-none cursor-crosshair ${compact ? 'h-24' : 'h-32'}`}
            />
            {!hasStroke && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#8a8478]">
                Sign here with mouse, trackpad, or finger
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-[#5c5951]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {hasStroke && <Check className="h-3.5 w-3.5 text-[#163362]" />}
              {hasStroke ? 'Signature captured' : 'Draw your signature above'}
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 rounded-full border border-[#dfd5c5] bg-[#fdfbf7] px-2.5 py-1 text-[11px] font-semibold text-[#5c5951] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignatureDisplay({
  signature,
  fallbackName,
}: {
  signature?: string | null;
  fallbackName?: string | null;
}) {
  if (signature?.startsWith('data:image')) {
    return (
      <img
        src={signature}
        alt="Digital signature"
        className="mx-auto max-h-12 object-contain"
      />
    );
  }
  const text = signature || fallbackName;
  if (!text) return <span className="text-xs text-slate-300 italic">Awaiting signature</span>;
  return (
    <span
      className="block text-center text-2xl leading-none text-slate-900"
      style={{ fontFamily: 'var(--font-signature)' }}
    >
      {text}
    </span>
  );
}
