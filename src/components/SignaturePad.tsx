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
    ctx.strokeStyle = '#0f172a';
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Digital E-Signature
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'type'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            Type
          </button>
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'draw'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            Draw
          </button>
        </div>
      </div>

      {mode === 'type' ? (
        <div className="space-y-2">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Type your full name to sign"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
          />
          <div
            className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 ${
              compact ? 'h-16' : 'h-20'
            }`}
          >
            {typedText.trim() ? (
              <span
                className="text-3xl text-slate-900 select-none"
                style={{ fontFamily: 'var(--font-signature)' }}
              >
                {typedText}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Your digital signature preview</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
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
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                Sign here with mouse, trackpad, or finger
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              {hasStroke && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              {hasStroke ? 'Signature captured' : 'Draw your signature above'}
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-rose-600"
            >
              <Eraser className="h-3.5 w-3.5" />
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
