import { supabase } from './utils/supabaseClient';
import axios from 'axios';

const API_URL = window.REACT_APP_API_URL || 'http://localhost:8000';

// Save a flow to Supabase
export async function saveFlow(userId, name, nodes, edges) {
  try {
    const { data, error } = await supabase
      .from('flows')
      .insert([
        { 
          user_id: userId, 
          name, 
          nodes, 
          edges 
        }
      ]);
      
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Error saving flow:', error);
    throw error;
  }
}

// Update an existing flow
export async function updateFlow(flowId, name, nodes, edges) {
  try {
    const { data, error } = await supabase
      .from('flows')
      .update({ 
        name, 
        nodes, 
        edges 
      })
      .eq('id', flowId);
      
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Error updating flow:', error);
    throw error;
  }
}

// Fetch all flows for a user
export async function fetchFlows(userId) {
  try {
    const { data, error } = await supabase
      .from('flows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Error fetching flows:', error);
    throw error;
  }
}

// Fetch a specific flow by ID
export async function fetchFlowById(flowId) {
  try {
    const { data, error } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();
      
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Error fetching flow:', error);
    throw error;
  }
}

// Delete a flow
export async function deleteFlow(flowId) {
  try {
    const { error } = await supabase
      .from('flows')
      .delete()
      .eq('id', flowId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting flow:', error);
    throw error;
  }
}

export const executeWorkflow = async (workflowData, file = null) => {
  try {
    // If there's a file, read it as base64 first
    let fileData = null;
    if (file) {
      fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]; // Remove data URL prefix
          resolve({
            filename: file.name,
            content: base64,
            type: file.type
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Add file data to workflow inputs
    if (fileData) {
      workflowData.inputs = workflowData.inputs || {};
      workflowData.inputs.file_upload = fileData;
    }

    // Send the workflow data
    const response = await axios.post(`${API_URL}/api/workflow/execute`, workflowData, {
      headers: {
        'Content-Type': 'application/json'
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
};

export const parseCV = async (file) => {
  try {
    // Create FormData
    const formData = new FormData();
    
    // Read file as base64
    const base64File = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create the file data structure
    const fileData = {
      inputs: {  // Add inputs wrapper to match backend
        file_data: {
          filename: file.name,
          content: base64File,
          type: file.type
        }
      }
    };

    // Send to CV parser endpoint directly
    const response = await fetch(`${API_URL}/api/parse-cv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fileData)
    });

    if (!response.ok) {
      throw new Error('Failed to parse CV');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error parsing CV:', error);
    throw error;
  }
}; 