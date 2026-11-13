import React from 'react';

const DribbbleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94" />
    <path d="M21.75 12.84c-2.61 1.33-5.55 1.48-8.27 0" />
    <path d="M16.96 18.36C14.23 16.62 12 13.9 12 10.44" />
    <path d="M4.87 19.13C8.78 15.08 14 13.78 21.75 13.26" />
  </svg>
);

export default DribbbleIcon;
