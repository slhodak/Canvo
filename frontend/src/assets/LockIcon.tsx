import './LockIcon.css';

export const LockIcon = ({ locked }: { locked: boolean }) => {
  return locked ?
    <svg className="lock-icon locked" width="100%" height="100%" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path className="lock-icon-path" fillRule="evenodd" clipRule="evenodd" d="M4 6V4C4 1.79086 5.79086 0 8 0C10.2091 0 12 1.79086 12 4V6H14V16H2V6H4ZM6 4C6 2.89543 6.89543 2 8 2C9.10457 2 10 2.89543 10 4V6H6V4ZM7 13V9H9V13H7Z" />
    </svg>
    :
    <svg className="lock-icon unlocked" width="100%" height="100%" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path className="lock-icon-path" fillRule="evenodd" clipRule="evenodd" d="M11.5 2C10.6716 2 10 2.67157 10 3.5V6H13V16H1V6H8V3.5C8 1.567 9.567 0 11.5 0C13.433 0 15 1.567 15 3.5V4H13V3.5C13 2.67157 12.3284 2 11.5 2ZM9 10H5V12H9V10Z" />
    </svg>
};
