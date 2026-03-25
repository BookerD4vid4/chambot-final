async function run() {
    try {
        const res = await fetch('http://localhost:5000/api/chatbot/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "หมวดหมู่ขนมและของว่าง" })
        });
        const data = await res.json();
        console.dir(data, { depth: null });
    } catch(e) {
        console.error(e);
    }
}
run();
