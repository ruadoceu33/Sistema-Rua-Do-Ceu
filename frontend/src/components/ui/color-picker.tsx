import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  id?: string;
  className?: string;
}

// Pré-definidas cores para quick selection
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
  '#1f2937', // dark gray
  '#d97706', // amber
  '#059669', // emerald
  '#0891b2', // sky
  '#7c3aed', // violet
  '#db2777', // rose
  '#78716c', // stone
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function ColorPicker({ value, onChange, label, id, className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(50);

  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gradientCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueSliderRef = useRef<HTMLInputElement>(null);

  // Inicializar HSL quando o value mudar
  useEffect(() => {
    setHexInput(value);
    const rgb = hexToRgb(value);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  }, [value]);

  // Desenhar gradiente SL quando hue mudar
  useEffect(() => {
    if (gradientCanvasRef.current) {
      const canvas = gradientCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Desenhar gradiente horizontal (saturação)
      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;

        // Desenhar gradiente vertical (luminosidade)
        const gradient = ctx.createLinearGradient(0, 0, 0, height);

        const rgb1 = hslToRgb(hue, s, 100);
        const rgb2 = hslToRgb(hue, s, 50);
        const rgb3 = hslToRgb(hue, s, 0);

        gradient.addColorStop(0, `rgb(${rgb1.r},${rgb1.g},${rgb1.b})`);
        gradient.addColorStop(0.5, `rgb(${rgb2.r},${rgb2.g},${rgb2.b})`);
        gradient.addColorStop(1, `rgb(${rgb3.r},${rgb3.g},${rgb3.b})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, 1, height);
      }
    }
  }, [hue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const updateColor = (s: number, l: number) => {
    setSaturation(s);
    setLightness(l);
    const rgb = hslToRgb(hue, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gradientCanvasRef.current) return;

    const rect = gradientCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const s = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));

    updateColor(s, l);
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!gradientCanvasRef.current) return;

    const touch = e.touches[0];
    const rect = gradientCanvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const s = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));

    updateColor(s, l);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const rgb = hslToRgb(newHue, saturation, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('#')) {
      val = '#' + val;
    }
    setHexInput(val);

    // Validar e atualizar se for um hex válido
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      const rgb = hexToRgb(val);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
        onChange(val);
      }
    }
  };

  const handlePresetColor = (color: string) => {
    onChange(color);
    setHexInput(color);
    const rgb = hexToRgb(color);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 block mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <Button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="w-full h-10 flex items-center justify-between px-3"
          type="button"
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-6 h-6 rounded border border-gray-300 shadow-sm"
              style={{ backgroundColor: value }}
              title={value}
            />
            <span className="text-sm font-mono">{value.toUpperCase()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>

        {/* Dropdown Picker */}
        {isOpen && (
          <div
            ref={pickerRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 space-y-4"
            style={{ width: '100%', maxWidth: '320px' }}
          >
            {/* Gradient Canvas para SL */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Cor (toque/clique para selecionar)
              </label>
              <canvas
                ref={gradientCanvasRef}
                width={280}
                height={180}
                onClick={handleCanvasClick}
                onTouchMove={handleCanvasTouch}
                className="w-full rounded border border-gray-300 cursor-crosshair touch-none"
              />
              {/* Indicador de posição no canvas */}
              <div className="relative h-2 bg-gray-200 rounded">
                <div
                  className="absolute h-full w-1 bg-gray-800 rounded transition-all pointer-events-none"
                  style={{ left: `${saturation}%` }}
                />
              </div>
            </div>

            {/* Hue Slider */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Tom (Hue)</label>
              <div className="space-y-2">
                <input
                  ref={hueSliderRef}
                  type="range"
                  min="0"
                  max="360"
                  value={hue}
                  onChange={handleHueChange}
                  className="w-full h-3 rounded appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      hsl(0, 100%, 50%),
                      hsl(60, 100%, 50%),
                      hsl(120, 100%, 50%),
                      hsl(180, 100%, 50%),
                      hsl(240, 100%, 50%),
                      hsl(300, 100%, 50%),
                      hsl(360, 100%, 50%))`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0°</span>
                  <span>{hue}°</span>
                  <span>360°</span>
                </div>
              </div>
            </div>

            {/* Hex Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Código HEX</label>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#000000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={7}
              />
            </div>

            {/* Preset Colors */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Cores Rápidas</label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handlePresetColor(color)}
                    className={`w-full aspect-square rounded border-2 transition-transform hover:scale-110 active:scale-95 ${
                      value === color ? 'border-gray-800 shadow-md' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                    type="button"
                  />
                ))}
              </div>
            </div>

            {/* Info Display */}
            <div className="bg-gray-50 rounded p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Saturação:</span>
                <span className="font-semibold">{Math.round(saturation)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Luminosidade:</span>
                <span className="font-semibold">{Math.round(lightness)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
