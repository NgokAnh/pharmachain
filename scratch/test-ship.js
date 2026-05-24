async function run() {
  try {
    // 1. Đăng nhập để lấy token
    console.log('Logging in as admin...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    
    const { token } = await loginRes.json();
    console.log('Login successful! Token acquired.');

    // 2. Gọi API ship cho TRF-SEED-0002
    console.log('Sending ship request for TRF-SEED-0002...');
    const shipRes = await fetch('http://localhost:3000/api/transfers/2c7fcc00-f9ff-4661-b004-87975f391e97/ship', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status Code:', shipRes.status);
    const body = await shipRes.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
