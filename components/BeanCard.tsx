import React from 'react';
import { Link } from 'react-router-dom';
import { BeanListing, User } from '../types';
import { DEFAULT_BEAN_IMAGE } from '../constants';
import { TagIcon, LocationMarkerIcon, UserCircleIcon, SparklesIcon, CoffeeIcon as CoffeeCupIcon } from './Icons'; // Assuming Icons.tsx, renamed CoffeeIcon to avoid conflict if needed

interface BeanCardProps {
  listing: BeanListing;
  lister?: User; // User who listed the beans
  onRemoveClick?: (listingId: string) => void; // Add optional click handler for remove button
}

const BeanCard: React.FC<BeanCardProps> = ({ listing, lister, onRemoveClick }) => {
  const imageSrc = listing.imageUrl || DEFAULT_BEAN_IMAGE;
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col h-full">
      <img src={imageSrc} alt={listing.name} className="w-full h-48 object-cover" />
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-coffee-dark mb-1 truncate">{listing.name}</h3>
        <p className="text-sm text-gray-700 mb-2 truncate">{listing.origin}</p>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.flavorNotes}</p>

        <div className="flex items-center text-xs text-gray-500 mb-4">
          {listing.tradeOrGiveaway === 'trade' ? (
            <TagIcon className="w-4 h-4 mr-1 text-coffee-secondary" />
          ) : (
            <SparklesIcon className="w-4 h-4 mr-1 text-yellow-500" />
          )}
          <span className="capitalize mr-2">{listing.tradeOrGiveaway}</span>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full mr-2">{listing.roast}</span>
          {listing.status === 'traded' && <span className="px-2 py-0.5 bg-red-200 text-red-700 text-xs rounded-full">Traded</span>}
          </div>

        <Link
          to={`/listings/${listing.id}`}
          className="mt-auto block w-full text-center bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
        >
          View Details
        </Link>
        {/* Remove button - visible only if onRemoveClick prop is provided */}
        {onRemoveClick && (
            <button
                onClick={() => onRemoveClick(listing.id)}
                className="mt-2 block w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
            >
                Remove Listing
            </button>
        )}
      </div>
    </div>
  );
};

export default BeanCard;
