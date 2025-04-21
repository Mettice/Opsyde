import { supabase } from './utils/supabaseClient';

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