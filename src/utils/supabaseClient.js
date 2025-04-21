import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmntsfxhcmdkpefxjxkm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbnRzZnhoY21ka3BlZnhqeGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI5NDksImV4cCI6MjA2MDgwODk0OX0.U5kgAnPph48XEnSLDrQMtiznHUxOaOWXeKYg_kI3RxM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 