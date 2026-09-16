// 1. Supabase Initialize Karein
const SUPABASE_URL = 'https://cqquvlkxoqduxtvmcjzc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JoPIcMNiUVfI3ME_BCCvlg_mFxhD5BS';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Form Submit Event Handler
document.querySelector('form').addEventListener('submit', async function(e) {
  e.preventDefault();

  // Inputs se Data Collect Karein
  const studentData = {
    full_name: document.getElementById('fullName').value,
    father_name: document.getElementById('fatherName')?.value || '',
    email: document.getElementById('email').value,
    phone_number: document.getElementById('phone').value,
    cnic_number: document.getElementById('cnic').value,
    course_selected: document.getElementById('course').value
  };

  // 3. Supabase Table Mein Data Insert Karein
  const { data, error } = await supabaseClient
    .from('students')
    .insert([studentData]);

  if (error) {
    console.error('Error inserting data:', error);
    alert('Registration Failed: ' + error.message);
  } else {
    alert('Registration Successful! Student data PostgreSQL database mein save ho gaya hai.');
    this.reset(); // Form clear karein
  }
});