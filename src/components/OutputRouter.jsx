// OutputRouter.jsx — centralized logic for tool outputs

import React from 'react';
import { sendToSheet, sendToDiscord } from '../utils/outputUtils';

export default function OutputRouter({ toolData }) {
  const { framework } = toolData;

  const handleOutput = async () => {
    switch (framework) {
      case 'sheets':
        await sendToSheet(toolData);
        break;
      case 'discord':
        await sendToDiscord(toolData);
        break;
      default:
        console.warn('No output handler for:', framework);
    }
  };

  return (
    <button
      onClick={handleOutput}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Send Output
    </button>
  );
}
