import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.5 9.16671L14.0833 12.5834M17.5 9.16671L19.25 7.41671M17.5 9.16671L18.3333 10"
      stroke="currentColor"
      className="text-blue-500 dark:text-blue-400"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.16669 4.25L4.25002 9.16667V14.875C4.25002 15.7955 4.61862 16.6788 5.27122 17.3314C5.92382 17.984 6.8071 18.3526 7.72752 18.3526H13.4359C14.3563 18.3526 15.2396 17.984 15.8922 17.3314C16.5448 16.6788 16.9134 15.7955 16.9134 14.875V10"
      stroke="currentColor"
      className="text-gray-700 dark:text-gray-300"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.16669 4.25L12.5834 7.66667"
      stroke="currentColor"
      className="text-gray-700 dark:text-gray-300"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Logo;
