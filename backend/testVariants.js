async function run() {
    try {
        console.log("=== TEST 1: User asks to buy coca cola ===");
        const res1 = await fetch('http://localhost:5000/api/chatbot/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "ใส่ coca cola ลงตะกร้า" })
        });
        const data1 = await res1.json();
        console.dir(data1.reply, { depth: null });

        console.log("\n=== TEST 2: User asks to buy 500ml coca cola ===");
        const res2 = await fetch('http://localhost:5000/api/chatbot/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "ใส่ coca cola 500ml ลงตะกร้า" })
        });
        const data2 = await res2.json();
        console.dir(data2.reply, { depth: null });

        console.log("\n=== TEST 3: Static Interceptor Fetch ===");
        const res3 = await fetch('http://localhost:5000/api/chatbot/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "หมวดหมู่เครื่องดื่ม" })
        });
        const data3 = await res3.json();
        console.dir(data3.reply, { depth: null });

    } catch(e) {
        console.error(e);
    }
}
run();
