import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (data) return data;
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
      
    if (error) throw error;
    
    toast.success('Profile updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error('Failed to update profile');
    return false;
  }
}

// Add a function to check if the profiles table exists and create it if not
export async function ensureProfilesTable() {
  try {
    // First check if the table exists by trying to select from it
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If there's an error, the table might not exist
    if (error && error.code === '42P01') { // PostgreSQL code for undefined_table
      console.log('Profiles table does not exist, creating it...');
      
      // Create the profiles table
      const { error: createError } = await supabase.rpc('create_profiles_table');
      
      if (createError) {
        console.error('Error creating profiles table:', createError);
      } else {
        console.log('Profiles table created successfully');
      }
    }
  } catch (error) {
    console.error('Error ensuring profiles table exists:', error);
  }
}

// Call this function when the app starts
export async function initializeUserProfile(userId) {
  if (!userId) return null;
  
  try {
    // First try to get the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // If profile exists, return it
    if (data) return data;
    
    // If profile doesn't exist, create it
    console.log('Creating new profile for user:', userId);
    
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email || '';
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: userId, 
          username: email,
          full_name: '',
          bio: '',
          avatar_url: '',
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (insertError) {
      console.error('Error creating profile:', insertError);
      return null;
    }
    
    return insertData?.[0] || null;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return null;
  }
} 