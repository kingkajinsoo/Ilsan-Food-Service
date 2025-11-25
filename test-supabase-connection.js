import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jpqmfdgnjmfrxidzxjrz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcW1mZGduam1mcnhpZHp4anJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzM2MzksImV4cCI6MjA3OTYwOTYzOX0.zzKYGj-MF783XtbMjpGV-Oxj_bq4p9O-x7xj2yrMsLE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if we can query users table
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Users table accessible');
    
    // Test 2: Check auth
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 Auth status:', session ? 'Logged in' : 'Not logged in');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testConnection();

