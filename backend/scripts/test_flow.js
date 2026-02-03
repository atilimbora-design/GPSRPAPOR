// Simple Integration Test Script
// Run with: node scripts/test_flow.js

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('🚀 Starting Backend Test Flow...\n');

    try {
        // 1. LOGIN (Personel)
        console.log('1️⃣  Logging in as Personel (User: 1)...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: '1',
                password: '1234',
                platform: 'mobile' // Important constraint
            })
        });
        const loginData = await loginRes.json();

        if (!loginData.success) throw new Error(`Login Failed: ${loginData.error}`);
        console.log('✅ Login Successful!');
        console.log(`   Token: ${loginData.token.substring(0, 20)}...`);
        console.log(`   User: ${loginData.user.full_name}\n`);

        const token = loginData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. GET PROFILE
        console.log('2️⃣  Fetching Profile...');
        const profileRes = await fetch(`${BASE_URL}/users/me`, { headers });
        const profileData = await profileRes.json();
        if (!profileData.success) throw new Error('Profile Fetch Failed');
        console.log(`✅ Profile: ${profileData.user.full_name} (${profileData.user.role})\n`);

        // 3. SEND GPS UPDATE
        console.log('3️⃣  Sending GPS Location...');
        const gpsRes = await fetch(`${BASE_URL}/gps/update`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                latitude: 38.4237,
                longitude: 27.1428,
                speed: 40,
                battery_level: 85,
                timestamp: new Date().toISOString()
            })
        });
        const gpsData = await gpsRes.json();
        console.log(`✅ GPS Update: ${gpsData.message}\n`);

        // 4. GET PRODUCTS
        console.log('4️⃣  Fetching Products...');
        const prodRes = await fetch(`${BASE_URL}/products?active_only=true`, { headers });
        const prodData = await prodRes.json();
        console.log(`✅ Products Fetched: ${prodData.products.length} items found.`);
        console.log(`   First Item: ${prodData.products[0].name}\n`);

        // 5. CREATE ORDER
        console.log('5️⃣  Creating Order for Today...');
        // Use first product ID
        const firstProductId = prodData.products[0].id;

        const orderRes = await fetch(`${BASE_URL}/orders/today`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                items: [
                    { product_id: firstProductId, quantity: 5 }
                ],
                notes: "Test siparişidir"
            })
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
            console.log(`⚠️  Order Note: ${orderData.error}`); // Might fail if locked (15:00)
        } else {
            console.log(`✅ Order Created! ID: ${orderData.order.id}, Total Items: ${orderData.order.total_items}\n`);
        }

        // 6. CHECK LEADERBOARD
        console.log('6️⃣  Checking Leaderboard...');
        const leadRes = await fetch(`${BASE_URL}/leaderboard`, { headers });
        const leadData = await leadRes.json();
        console.log(`✅ Leaderboard Fetched.`);
        if (leadData.my_rank) {
            console.log(`   My Rank: #${leadData.my_rank.rank} (Total: ${leadData.my_rank.total_collection} TL)`);
        } else {
            console.log(`   Not ranked yet (No approved reports).`);
        }

        console.log('\n✨ TEST COMPLETED SUCCESSFULLY! ✨');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    }
}

runTest();
