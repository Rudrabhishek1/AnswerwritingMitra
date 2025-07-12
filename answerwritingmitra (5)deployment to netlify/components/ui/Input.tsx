import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  datalistId?: string;
  datalistOptions?: string[];
}

const Input: React.FC<InputProps> = ({ label, id, datalistId, datalistOptions, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <input
        id={id}
        className="w-full px-4 py-2 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        list={datalistId}
        {...props}
      />
      {datalistId && datalistOptions && (
        <datalist id={datalistId}>
          {datalistOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
};

export default Input;