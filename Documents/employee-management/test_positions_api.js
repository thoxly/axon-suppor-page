const fetch = require('node-fetch');

async function testPositionsAPI() {
    try {
        const url = 'http://localhost:3003/api/employees/3/positions?startDate=2025-08-09T21:00:00.000Z&endDate=2025-08-12T20:59:59.999Z';
        
        console.log('Testing API:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3NTQ5OTkzNzUsImV4cCI6MTc1NTAwMDI3NX0.TPZyNZFFVMRLCWJb7uFZYgvm3XKA5kh8ZuubhXJQeAE',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Response data:', JSON.stringify(data, null, 2));
            
            if (data.route) {
                console.log('Route length:', data.route.length);
                console.log('First 5 route points:', data.route.slice(0, 5));
                
                // Check if all coordinates are the same
                const uniqueCoords = new Set(data.route.map(coord => `${coord[0]},${coord[1]}`));
                console.log('Unique coordinates count:', uniqueCoords.size);
                console.log('Unique coordinates:', Array.from(uniqueCoords));
                
                if (uniqueCoords.size === 1) {
                    console.log('⚠️  WARNING: All coordinates are the same! This is why no line is displayed.');
                }
            }
        } else {
            console.error('API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testPositionsAPI(); 