import React from 'react';
import PropTypes from 'prop-types';

const ModalFooter = ({ isModified, onClose, onSave }) => {
  return (
    <div className="flex justify-end gap-3 mt-6">
      <button
        onClick={() => {
          if (isModified) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        Save
      </button>
    </div>
  );
};

ModalFooter.propTypes = {
  isModified: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default ModalFooter; 