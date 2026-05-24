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

    // 2. Gọi API receive cho TRF-SEED-0002
    console.log('Sending receive request for TRF-SEED-0002...');
    const receiveRes = await fetch('http://localhost:3000/api/transfers/2c7fcc00-f9ff-4661-b004-87975f391e97/receive', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receivedItems: [
          {
            itemId: 'b3772b0e-738e-4879-9d87-c0a51ff194ae',
            receivedQuantity: 40
          }
        ]
      })
    });

    console.log('Status Code:', receiveRes.status);
    const body = await receiveRes.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
