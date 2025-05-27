import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ContextMenu = ({ 
  isVisible, 
  position, 
  onClose, 
  onDuplicate, 
  onCopy, 
  onPaste, 
  onSaveAsTemplate, 
  onDelete,
  selectedNodes = [],
  canPaste = false,
  nodeType = null
}) => {
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(position);

  useEffect(() => {
    if (isVisible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust position if menu would go off-screen
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      setMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [isVisible, position]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const hasSelectedNodes = selectedNodes.length > 0;
  const multipleNodes = selectedNodes.length > 1;

  const menuItems = [
    // Node-specific actions
    ...(hasSelectedNodes ? [
      {
        id: 'duplicate',
        label: multipleNodes ? `Duplicate ${selectedNodes.length} Nodes` : 'Duplicate Node',
        icon: '📋',
        action: onDuplicate,
        shortcut: 'Ctrl+D'
      },
      {
        id: 'copy',
        label: multipleNodes ? `Copy ${selectedNodes.length} Nodes` : 'Copy Node',
        icon: '📄',
        action: onCopy,
        shortcut: 'Ctrl+C'
      },
      { id: 'divider1', type: 'divider' },
      {
        id: 'save-template',
        label: multipleNodes ? 'Save as Template' : 'Save as Template',
        icon: '💾',
        action: onSaveAsTemplate,
        disabled: false
      },
      { id: 'divider2', type: 'divider' },
      {
        id: 'delete',
        label: multipleNodes ? `Delete ${selectedNodes.length} Nodes` : 'Delete Node',
        icon: '🗑️',
        action: onDelete,
        shortcut: 'Delete',
        danger: true
      }
    ] : []),
    
    // Canvas actions (when no nodes selected)
    ...(!hasSelectedNodes ? [
      {
        id: 'paste',
        label: 'Paste',
        icon: '📋',
        action: onPaste,
        shortcut: 'Ctrl+V',
        disabled: !canPaste
      }
    ] : [])
  ];

  const handleItemClick = (item) => {
    if (item.disabled) return;
    
    item.action?.();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-[200px]"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) => {
        if (item.type === 'divider') {
          return (
            <div
              key={item.id}
              className="border-t border-gray-100 my-1"
            />
          );
        }

        return (
          <div
            key={item.id}
            className={`
              px-4 py-2 text-sm cursor-pointer flex items-center justify-between
              transition-colors duration-150
              ${item.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }
            `}
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-base">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-gray-400 ml-4">
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}

      {/* Node type indicator */}
      {hasSelectedNodes && nodeType && (
        <div className="border-t border-gray-100 mt-1 pt-2 px-4 pb-2">
          <div className="text-xs text-gray-500">
            {multipleNodes ? 'Multiple Types' : `${nodeType} Node`}
          </div>
        </div>
      )}
    </div>
  );
};

ContextMenu.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func,
  onCopy: PropTypes.func,
  onPaste: PropTypes.func,
  onSaveAsTemplate: PropTypes.func,
  onDelete: PropTypes.func,
  selectedNodes: PropTypes.array,
  canPaste: PropTypes.bool,
  nodeType: PropTypes.string
};

export default ContextMenu; 