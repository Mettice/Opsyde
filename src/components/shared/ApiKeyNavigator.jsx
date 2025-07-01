import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Shared component for navigating to API Key Manager
 * Replaces window.open('/api-keys') calls with proper React Router navigation
 */
export const ApiKeyNavigator = ({ 
  children, 
  className = "",
  variant = "button", // "button" | "link"
  openInNewTab = false 
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (openInNewTab) {
      // Open in new tab by navigating to the current origin + /api-keys
      window.open(`${window.location.origin}/api-keys`, '_blank');
    } else {
      // Navigate within the same tab
      navigate('/api-keys');
    }
  };

  if (variant === "link") {
    return (
      <a 
        href="/api-keys"
        onClick={handleClick}
        className={className}
        target={openInNewTab ? "_blank" : "_self"}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
};

ApiKeyNavigator.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['button', 'link']),
  openInNewTab: PropTypes.bool
};

/**
 * Hook for programmatic navigation to API Key Manager
 */
export const useApiKeyNavigation = () => {
  const navigate = useNavigate();

  const navigateToApiKeys = (openInNewTab = false) => {
    if (openInNewTab) {
      window.open(`${window.location.origin}/api-keys`, '_blank');
    } else {
      navigate('/api-keys');
    }
  };

  return { navigateToApiKeys };
};

export default ApiKeyNavigator; 