
import React from 'react';

interface ToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  description?: string;
}

const Toggle: React.FC<ToggleProps> = ({ label, enabled, onChange, description }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex-grow flex flex-col mr-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
        )}
      </span>
      <button
        type="button"
        className={`${
          enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700/50'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
      >
        <span
          aria-hidden="true"
          className={`${
            enabled ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
};

export default Toggle;
