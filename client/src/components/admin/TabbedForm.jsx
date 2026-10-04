import { useState } from 'react';

/**
 * Lightweight tabbed form body used by long admin editors.
 * Keeps large forms readable instead of one enormous scrolling column.
 */
export function TabbedForm({ tabs = [], initialTab, className = '' }) {
  const [active, setActive] = useState(initialTab || tabs[0]?.id);

  const current = tabs.find((tab) => tab.id === active) || tabs[0];

  return (
    <div className={`rounded-2xl border border-ink-200 bg-white ${className}`}>
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-ink-200 px-2">
        {tabs.map((tab) => {
          const isActive = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-selected={isActive}
              role="tab"
              className={`relative shrink-0 px-4 py-3.5 text-sm font-medium transition
                          ${isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'}`}
            >
              {tab.label}
              {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6">{current?.content}</div>
    </div>
  );
}

export default TabbedForm;
