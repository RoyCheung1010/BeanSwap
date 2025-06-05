import React from 'react';
import { StarIcon, StarIconSolid } from './Icons'; // Import both StarIcon (outline) and StarIconSolid (filled)

// Re-using StarIcon from Icons.tsx, if it's outline by default, that's fine.
// We'll use fill for solid stars.


interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  maxRating?: number;
  readOnly?: boolean;
  size?: string; // Tailwind size class e.g., "w-6 h-6"
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  maxRating = 5,
  readOnly = false,
  size = "w-6 h-6"
}) => {
  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={starValue}
            type="button" // Important for forms
            disabled={readOnly}
            onClick={() => !readOnly && onRatingChange && onRatingChange(starValue)}
            className={`cursor-${readOnly ? 'default' : 'pointer'} text-yellow-400 disabled:text-gray-300 transition-colors ${size}`}
            aria-label={`Rate ${starValue} out of ${maxRating} stars`}
          >
            {starValue <= rating ? 
              <StarIconSolid className={`text-yellow-400 ${size}`} /> : // Filled star using StarIconSolid
              <StarIcon className={`text-gray-300 ${size}`} /> // Outline star using StarIcon
            }
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
