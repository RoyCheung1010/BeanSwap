
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-coffee-secondary text-coffee-extralight py-8 mt-12">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} BeanSwap. All rights reserved.</p>
        <p className="text-sm mt-1">Connecting coffee lovers, one bean at a time.</p>
      </div>
    </footer>
  );
};

export default Footer;
