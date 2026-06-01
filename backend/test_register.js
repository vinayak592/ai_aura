// test_register.js - using native fetch (Node 22+)
import 'dotenv/config';

(async () => {
  try {
    const PORT = process.env.PORT || 5004;
    const baseUrl = `http://localhost:${PORT}`;
    const response = await fetch(`${baseUrl}/api/auth/register`, {
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
