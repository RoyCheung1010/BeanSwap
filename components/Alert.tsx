
import React, { useEffect } from 'react';
import { AppAlert } from '../types';
import { useAppContext } from '../context/AppContext';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XIcon } from './Icons';

interface AlertProps extends AppAlert {}

const Alert: React.FC<AlertProps> = ({ message, type }) => {
  const { hideAlert } = useAppContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      hideAlert();
    }, 5000); // Auto-dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [hideAlert, message, type]); // Re-run effect if alert changes

  const baseClasses = "fixed top-20 right-4 p-4 rounded-md shadow-lg text-sm z-[100] flex items-center space-x-3";
  let typeClasses = "";
  let IconComponent;

  switch (type) {
    case 'success':
      typeClasses = "bg-green-100 border border-green-400 text-green-700";
      IconComponent = CheckCircleIcon;
      break;
    case 'error':
      typeClasses = "bg-red-100 border border-red-400 text-red-700";
      IconComponent = ExclamationCircleIcon;
      break;
    case 'info':
    default:
      typeClasses = "bg-blue-100 border border-blue-400 text-blue-700";
      IconComponent = InformationCircleIcon;
      break;
  }

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      {IconComponent && <IconComponent className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={hideAlert} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 focus:ring-current inline-flex h-8 w-8" aria-label="Dismiss">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Alert;
