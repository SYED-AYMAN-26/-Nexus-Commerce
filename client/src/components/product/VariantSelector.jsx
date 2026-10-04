import { useMemo } from 'react';
import { Icon } from '../ui/Icon';
import { formatMoney } from '../../utils/format';

/**
 * Variant picker.
 *
 * Variants can carry a colour and/or a size. When both exist the component
 * groups them so the buyer picks a colour and a size, and it resolves the
 * matching variant. When only one axis exists it renders a simple chip list.
 */
export function VariantSelector({ variants = [], value, onChange, className = '' }) {
  const { hasColor, hasSize, colors, sizes, options } = useMemo(() => {
    const active = variants.filter((v) => v.isActive !== false);
    const colorList = [...new Set(active.map((v) => v.color).filter(Boolean))];
    const sizeList = [...new Set(active.map((v) => v.size).filter(Boolean))];
    return {
      hasColor: colorList.length > 0,
      hasSize: sizeList.length > 0,
      colors: colorList,
      sizes: sizeList,
      options: active,
    };
  }, [variants]);

  if (!options.length) return null;

  const selected = options.find((v) => String(v._id) === String(value?._id || value));
  const selectedColor = selected?.color || '';
  const selectedSize = selected?.size || '';

  const findVariant = (color, size) =>
    options.find((v) => (!hasColor || (v.color || '') === color) && (!hasSize || (v.size || '') === size));

  const handleColor = (color) => {
    const match = findVariant(color, selectedSize) || options.find((v) => v.color === color && (!hasSize || !v.size));
    if (match) onChange(match);
  };

  const handleSize = (size) => {
    const match = findVariant(selectedColor, size) || options.find((v) => v.size === size);
    if (match) onChange(match);
  };

  const isAvailable = (variant) => variant && variant.stock > 0;

  return (
    <div className={`space-y-5 ${className}`}>
      {hasColor && (
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-900">
              Colour: <span className="font-normal text-ink-600">{selectedColor || 'Select'}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const variant = findVariant(color, selectedSize) || options.find((v) => v.color === color);
              const active = color === selectedColor;
              const available = isAvailable(variant);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColor(color)}
                  disabled={!variant}
                  aria-pressed={active}
                  className={`group relative flex items-center gap-2.5 rounded-xl border-2 bg-white py-2 pl-2 pr-3.5 text-sm font-medium
                              transition ${active ? 'border-brand-600 ring-2 ring-brand-500/15' : 'border-ink-200 hover:border-ink-300'}
                              ${!available ? 'opacity-60' : ''}`}
                  title={available ? color : `${color} — out of stock`}
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded-lg border border-ink-200"
                    style={{ backgroundColor: colorHex(color) }}
                    aria-hidden="true"
                  >
                    {!available && <Icon name="x" className="h-3 w-3 text-white drop-shadow" />}
                  </span>
                  <span className="text-ink-800">{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasSize && (
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-900">
              {hasColor ? 'Size' : 'Option'}: <span className="font-normal text-ink-600">{selectedSize || 'Select'}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.length > 0
              ? sizes.map((size) => {
                const variant = findVariant(selectedColor, size) || options.find((v) => v.size === size);
                const active = size === selectedSize;
                const available = isAvailable(variant);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSize(size)}
                    disabled={!variant || !available}
                    aria-pressed={active}
                    className={`min-w-[3.25rem] rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition
                                ${active ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-ink-200 text-ink-700 hover:border-ink-300'}
                                ${!available ? 'cursor-not-allowed line-through opacity-50' : ''}`}
                  >
                    {size}
                  </button>
                );
              })
              : options.map((variant) => {
                const active = String(variant._id) === String(selected?._id);
                const available = variant.stock > 0;
                return (
                  <button
                    key={variant._id}
                    type="button"
                    onClick={() => onChange(variant)}
                    disabled={!available}
                    aria-pressed={active}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition
                                ${active ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-ink-200 text-ink-700 hover:border-ink-300'}
                                ${!available ? 'cursor-not-allowed line-through opacity-50' : ''}`}
                  >
                    {variant.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {!hasColor && !hasSize && (
        <div className="flex flex-wrap gap-2">
          {options.map((variant) => {
            const active = String(variant._id) === String(selected?._id);
            const available = variant.stock > 0;
            return (
              <button
                key={variant._id}
                type="button"
                onClick={() => onChange(variant)}
                disabled={!available}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition
                            ${active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-ink-300'}
                            ${!available ? 'cursor-not-allowed line-through opacity-50' : ''}`}
              >
                {variant.name}
                {variant.priceDelta ? <span className="ml-2 text-xs font-normal text-ink-500">+{formatMoney(variant.priceDelta)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Best-effort mapping from a colour name to a swatch. */
function colorHex(name = '') {
  const map = {
    'midnight black': '#111827', black: '#111827',
    'arctic white': '#f8fafc', white: '#ffffff',
    'cobalt blue': '#2563eb', blue: '#2563eb',
    'forest green': '#15803d', green: '#15803d',
    'graphite grey': '#4b5563', grey: '#6b7280', gray: '#6b7280',
    'desert sand': '#d8c3a5', sand: '#d8c3a5',
    'crimson red': '#be123c', red: '#be123c',
    navy: '#1e3a8a',
    lilac: '#c084fc',
  };
  return map[String(name).toLowerCase()] || '#e2e8f0';
}

export default VariantSelector;
