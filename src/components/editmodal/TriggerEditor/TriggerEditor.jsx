import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Sub-components
import BasicInfoSection from './components/BasicInfoSection';
import TriggerTypeSelector from './components/TriggerTypeSelector';
import ScheduleConfiguration from './components/schedule/ScheduleConfiguration';
import WebhookConfiguration from './components/webhook/WebhookConfiguration';
import UniversalPollingConfiguration from './components/polling/UniversalPollingConfiguration';

const TriggerEditor = ({ formData, handleInputChange }) => {
  return (
    <>
      <BasicInfoSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />

      <TriggerTypeSelector 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />

      {formData.triggerType === 'schedule' && (
        <ScheduleConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}

      {formData.triggerType === 'webhook' && (
        <WebhookConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}

      {formData.triggerType === 'universal_polling' && (
        <UniversalPollingConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}
    </>
  );
};

TriggerEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TriggerEditor; 