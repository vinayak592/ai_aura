// test_register.js - using native fetch (Node 22+)
(async () => {
  try {
    const response = await fetch('http://localhost:5004/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test2@example.com', password: 'password123' })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
})();
