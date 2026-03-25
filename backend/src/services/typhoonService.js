"use strict";
/**
 * typhoonService.js
 * ------------------
 * Typhoon 2.5 (OpenAI-compatible API) with Prompt-based Tool Calling
 * (Typhoon API does not support OpenAI-style `tools` parameter,
 *  so we embed tool definitions in the system prompt and parse JSON from responses)
 * Base URL: https://api.opentyphoon.ai/v1
 */

const TYPHOON_API_URL = (process.env.TYPHOON_API_URL || "https://api.opentyphoon.ai/v1").replace(/\/$/, "");
const TYPHOON_MODEL   = process.env.TYPHOON_MODEL || "typhoon-v2.5-30b-a3b-instruct";

// ─── Low-level API call (NO tools parameter) ─────────────────────────────────
const callTyphoon = async (messages, isRetry = false) => {
    const apiKey = process.env.TYPHOON_API_KEY;
    if (!apiKey) throw new Error("TYPHOON_API_KEY is not set");

    // Typhoon vllm: max_tokens = total context (prompt + completion), NOT output-only
    // System prompt alone is ~3100 tokens, so must be well above that
    const maxTokens = isRetry ? 6144 : 8192;

    const payload = {
        model: TYPHOON_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
    };

    const res = await fetch(`${TYPHOON_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errText = await res.text();
        // Retry with aggressively trimmed history if still hitting token limit
        if (!isRetry && errText.toLowerCase().includes("token")) {
            console.warn("[Typhoon] Token limit hit, retrying with trimmed history (system + last 2 msgs)...");
            const trimmed = [messages[0], ...messages.slice(-2)]; // system prompt + last 2 msgs only
            return callTyphoon(trimmed, true);
        }
        throw new Error(`Typhoon API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "(ไม่มีคำตอบ)";
};

// ─── Parse tool calls from model text output ─────────────────────────────────
/**
 * Extract tool calls from model output.
 * Uses brace-counting (not lazy regex) to handle nested JSON: {"arguments":{}}
 */
const parseToolCalls = (text) => {
    const calls = [];
    // Find all [TOOL_CALL]...[/TOOL_CALL] blocks
    const blockRegex = /\[TOOL_CALL\]([\s\S]*?)\[\/TOOL_CALL\]/g;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(text)) !== null) {
        const inner = blockMatch[1].trim();

        // Use brace-counting to extract balanced JSON (handles nested braces)
        let depth = 0, start = -1, end = -1;
        for (let i = 0; i < inner.length; i++) {
            if (inner[i] === "{") {
                if (depth === 0) start = i;
                depth++;
            } else if (inner[i] === "}") {
                depth--;
                if (depth === 0) { end = i; break; }
            }
        }

        if (start === -1 || end === -1) {
            console.warn("[parseToolCalls] no balanced JSON in block:", inner.substring(0, 80));
            continue;
        }

        const jsonStr = inner.substring(start, end + 1);
        try {
            const parsed = JSON.parse(jsonStr);
            console.log("[parseToolCalls] ✓ parsed tool:", parsed.name, JSON.stringify(parsed.arguments));
            if (parsed.name) {
                calls.push({ name: parsed.name, arguments: parsed.arguments || {} });
            }
        } catch (e) {
            console.error("[parseToolCalls] JSON parse error:", e.message, "| str:", jsonStr.substring(0, 80));
        }
    }
    return calls;
};

/**
 * Chat with prompt-based tool calling (agentic loop).
 * Runs up to maxIter rounds of tool calls automatically.
 *
 * @param {Array}    messages     - History + current user message (OpenAI format)
 * @param {string}   systemPrompt - System prompt (includes tool definitions)
 * @param {Array}    _tools       - (unused, kept for API compat)
 * @param {Function} executeTool  - async (name, args) => any (result)
 * @param {number}   maxIter      - Max tool-call rounds (default 4)
 * @returns {Promise<{ reply: string, toolsUsed: string[] }>}
 */
const chatWithTools = async (messages, systemPrompt, _tools = [], executeTool, maxIter = 4) => {
    const history = [
        { role: "system", content: systemPrompt },
        ...messages,
    ];
    const toolsUsed = [];

    for (let i = 0; i < maxIter; i++) {
        const responseText = await callTyphoon(history);

        // Check for tool calls in the response
        const toolCalls = parseToolCalls(responseText);

        if (toolCalls.length === 0) {
            // No tool calls — this is the final answer
            // Clean any leftover markers just in case
            const cleanReply = responseText.replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/g, "").trim();
            return { reply: cleanReply || responseText, toolsUsed };
        }

        // Push assistant message into history
        history.push({ role: "assistant", content: responseText });

        // Execute each tool call and push results
        for (const tc of toolCalls) {
            toolsUsed.push(tc.name);
            let result;
            try {
                result = await executeTool(tc.name, tc.arguments);
            } catch (err) {
                result = { error: err.message };
            }

            const resultStr = typeof result === "string" ? result : JSON.stringify(result);
            history.push({
                role: "user",
                content: `[TOOL_RESULT] name="${tc.name}"\n${resultStr}\n[/TOOL_RESULT]`,
            });
        }
    }

    // Exhausted iterations — get final answer
    history.push({
        role: "user",
        content: "กรุณาสรุปคำตอบสุดท้ายจากข้อมูลที่ได้ (ห้ามเรียก tool เพิ่มแล้ว)",
    });
    const finalText = await callTyphoon(history);
    const cleanFinal = finalText.replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/g, "").trim();
    return { reply: cleanFinal || finalText, toolsUsed };
};

// ─── TOOLS is kept as a constant for reference but not sent to API ───────────
const TOOLS = [
    { name: "get_categories",          description: "ดึงรายการหมวดหมู่สินค้าทั้งหมดในร้าน พร้อมจำนวนสินค้าในแต่ละหมวด",              params: "ไม่มี parameter" },
    { name: "get_products_by_category",description: "ดึงสินค้าทั้งหมดในหมวดหมู่ที่ระบุ ใช้เมื่อลูกค้าต้องการดูสินค้าในหมวดหมู่ใดหมวดหมู่หนึ่ง", params: "category_id (number, optional), category_name (string, optional): ชื่อหมวดหมู่" },
    { name: "search_products",         description: "ค้นหาสินค้าด้วยคำค้นหาอิสระ ใช้เมื่อลูกค้าค้นหาสินค้าที่ไม่ได้กำหนดหมวดหมู่",  params: "query (string, required): คำค้นหา" },
    { name: "get_product_details",     description: "ดูรายละเอียดสินค้า variants ราคา สต็อก",                                         params: "product_id (number, required): ID ของสินค้า" },
    { name: "add_product_to_cart",     description: "เพิ่มสินค้าลงตะกร้าโดยระบุชื่อสินค้า", params: "product_name (string, required): ชื่อสินค้า, quantity (number, default 1): จำนวน, variant_sku (string, optional): ขนาด/รุ่น/ลักษณะ/รสชาติ (ถ้ามี)" },
    { name: "remove_from_cart",        description: "ลบสินค้าออกจากตะกร้าเมื่อลูกค้าสั่งให้เอาออก ลด ลบ หรือไม่เอา", params: "product_name (string, required): ชื่อสินค้าที่ต้องการลบ" },
    { name: "update_cart_quantity",    description: "อัพเดทจำนวนสินค้าในตะกร้าเมื่อลูกค้าบอกให้เปลี่ยนจำนวน", params: "product_name (string, required): ชื่อสินค้า, quantity (number, required): จำนวนใหม่" },
    { name: "get_my_addresses",        description: "ดึงที่อยู่จัดส่งของลูกค้าจาก profile — ใช้เมื่อลูกค้าพูดว่าชำระเงิน สั่งซื้อ จ่ายเงิน",                       params: "ไม่มี parameter" },
    { name: "checkout_order_in_chatbot", description: "สร้างคำสั่งซื้อเมื่อลูกค้าเลือกที่อยู่เรียบร้อยแล้ว", params: "address_id (number, required): ID ของที่อยู่, payment_method (string, required): บังคับใช้ 'cod'" },
    { name: "get_my_orders",           description: "ดูคำสั่งซื้อของลูกค้าที่ล็อกอิน",                                               params: "ไม่มี parameter" },
];

/**
 * Build system prompt with embedded tool definitions.
 * @param {Object|null} customer - { name, phone } or null
 * @param {Array} cartItems - Array of items currently in the user's cart
 * @param {Object|null} deliverySettings - { province, postal_code, is_locked }
 */
const buildSystemPrompt = (customer = null, cartItems = [], deliverySettings = null) => {
    // Build tool descriptions for the prompt
    const toolDescriptions = TOOLS.map(t =>
        `- **${t.name}**: ${t.description}\n  Parameters: ${t.params}`
    ).join("\n");

    let prompt = `คุณคือผู้ช่วย AI ของร้านค้าออนไลน์ "Chambot Store" ที่ตอบภาษาไทยเป็นธรรมชาติ
ใช้ภาษาสุภาพแต่เป็นกันเอง ตอบกระชับได้ใจความ (ปกติ 2-3 ประโยค)

**กฎเหล็กแบบตายตัว (ANTI-HALLUCINATION STRICT ROLE):**
- คุณต้องพิจารณาคำตอบจากข้อความและข้อมูลที่ Tool ส่งกลับมาให้อย่างเคร่งครัด
- หาก Tool แจ้งว่า \`found: false\` หรือ \`success: false\` ให้บอกลูกค้าตามนั้น **ห้ามแต่งข้อมูลขึ้นมาเองเด็ดขาด**
- หากลูกค้าถามถึงหมวดหมู่ที่ไม่มีในร้าน (Tool ตอบว่าไม่พบหมวดหมู่) ให้ตอบกลับว่า "ขออภัยค่ะ ทางร้านไม่มีหมวดหมู่นี้ คุณลูกค้าสนใจดูหมวดหมู่ทั้งหมดของร้านไหมคะ?" (สามารถเรียก get_categories ให้เลยได้)
- หากลูกค้าพิมพ์ชื่อหมวดหมู่ (เช่น กีฬา, อาหาร, เครื่องดื่ม) **ห้าม** ตอบรายการสินค้าด้วยตัวเองเด็ดขาด! **ต้อง** เรียก Tool \`get_products_by_category\` ก่อนเสมอ
- หากลูกค้าถามหาสินค้า และ Tool search_products ไม่พบสินค้า หรือไม่มีในหมวดหมู่ ให้ตอบว่า "ขออภัยค่ะ ไม่พบสินค้าที่คุณลูกค้ากำลังมองหา" **ห้ามเดาชื่อสินค้าหรือรุ่นอื่นมาเสนอเองเด็ดขาด**
- ลิสต์สินค้าที่จะนำเสนอให้ลูกค้า ต้องอ้างอิงรายชื่อและราคาจากที่ Tool ส่งมาให้เป๊ะๆ ห้ามดัดแปลง ห้ามเพิ่มสินค้าที่ไม่มีในผลลัพธ์ของ Tool เด็ดขาด
- ถ้าลูกค้าถามเรื่องสินค้าหรือหมวดหมู่ ต้องเรียก Tool ก่อน ห้ามตอบเองจากความจำ
- หากลูกค้าสั่ง "ชำระเงิน" หรือเช็คเอาท์ซ้ำ ต้องเรียก Tool get_my_addresses ใหม่เสมอเพื่อดึงข้อมูลล่าสุด!

## นโยบายการจัดส่ง (Delivery Policy):
- ทางร้านรองรับเฉพาะการเก็บเงินปลายทาง (COD) เท่านั้น`;

    if (deliverySettings && deliverySettings.is_locked) {
        const parts = [];
        if (deliverySettings.province) parts.push(`จังหวัด${deliverySettings.province}`);
        if (deliverySettings.postal_code) parts.push(`รหัสไปรษณีย์ ${deliverySettings.postal_code}`);
        
        if (parts.length > 0) {
            prompt += `\n- ทางร้านจัดส่งเฉพาะในพื้นที่: **${parts.join(' ')}** เท่านั้น\n- หากลูกค้าถามเรื่องพื้นที่จัดส่ง หรือกำลังจะเลือกที่อยู่ ให้แจ้งข้อจำกัดนี้ให้ทราบด้วย`;
        }
    }

    prompt += `\n\n## Tools ที่มี:
${toolDescriptions}

## วิธีเรียก tool (บังคับใช้รูปแบบนี้เท่านั้น):
[TOOL_CALL] {"name":"tool_name","arguments":{"key":"value"}} [/TOOL_CALL]

## ตัวอย่างที่ถูกต้อง (MUST follow these patterns):

ลูกค้า: "มีหมวดหมู่อะไรบ้าง"
[TOOL_CALL] {"name":"get_categories","arguments":{}} [/TOOL_CALL]

ลูกค้า: "ดูหมวดหมู่สินค้า"
[TOOL_CALL] {"name":"get_categories","arguments":{}} [/TOOL_CALL]

ลูกค้า: "อยากได้เครื่องดื่ม"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"เครื่องดื่ม"}} [/TOOL_CALL]

ลูกค้า: "เครื่องดื่ม"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"เครื่องดื่ม"}} [/TOOL_CALL]

ลูกค้า: "ขนมขบเคี้ยว"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"ขนมขบเคี้ยว"}} [/TOOL_CALL]

ลูกค้า: "ของใช้ส่วนตัว"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"ของใช้ส่วนตัว"}} [/TOOL_CALL]

ลูกค้า: "อาหารแห้งและเครื่องปรุง"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"อาหารแห้งและเครื่องปรุง"}} [/TOOL_CALL]

ลูกค้า: "ผลิตภัณฑ์ทำความสะอาด"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"ผลิตภัณฑ์ทำความสะอาด"}} [/TOOL_CALL]

ลูกค้า: "ยาสามัญประจำบ้าน"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"ยาสามัญประจำบ้าน"}} [/TOOL_CALL]

ลูกค้า: "สินค้าเบ็ดเตล็ด"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"สินค้าเบ็ดเตล็ด"}} [/TOOL_CALL]

ลูกค้า: "ของสดและอื่นๆ"
[TOOL_CALL] {"name":"get_products_by_category","arguments":{"category_name":"ของสดและอื่นๆ"}} [/TOOL_CALL]

ลูกค้า: "มีน้ำดื่มไหม"
[TOOL_CALL] {"name":"search_products","arguments":{"query":"น้ำดื่ม"}} [/TOOL_CALL]

ลูกค้า: "เพิ่มกาแฟดอยช้าง 2 ถุง"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"กาแฟดอยช้าง","quantity":2}} [/TOOL_CALL]

ลูกค้า: "ซื้อน้ำมันมะพร้าว 1 ขวด"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"น้ำมันมะพร้าว","quantity":1}} [/TOOL_CALL]

ลูกค้า: "เอาหูฟังบลูทูธ TWS สีดำ 2 กล่อง"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"หูฟังบลูทูธ TWS","variant_sku":"TWS-BT-BLACK","quantity":2}} [/TOOL_CALL]

ลูกค้า: "ใส่พาวเวอร์แบงค์ลงตะกร้า 3 ชิ้น"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"พาวเวอร์แบงค์","quantity":3}} [/TOOL_CALL]

(ตัวอย่างสำคัญ: หลังแสดงรายการสินค้าในหมวดหมู่แล้ว ลูกค้าพิมพ์ชื่อสินค้าจากรายการนั้น)
ลูกค้า: "กระติกน้ำ Stainless 750ml"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"กระติกน้ำ Stainless 750ml","quantity":1}} [/TOOL_CALL]

ลูกค้า: "รองเท้าวิ่ง Trail"
[TOOL_CALL] {"name":"add_product_to_cart","arguments":{"product_name":"รองเท้าวิ่ง Trail","quantity":1}} [/TOOL_CALL]

ลูกค้า: "ในตะกร้ามีอะไรบ้าง" หรือ "สรุปยอดให้หน่อย"
(คุณสามารถอ่านข้อมูลจาก 'สถานะตะกร้าสินค้าปัจจุบันของลูกค้า' ด้านล่างสุดของ prompt แล้วตอบลูกค้าได้เลย ไม่ต้องเรียก tool)

ลูกค้า: "ดูออเดอร์ของฉัน"
[TOOL_CALL] {"name":"get_my_orders","arguments":{}} [/TOOL_CALL]

ลูกค้า: "ชำระเงิน" หรือ "สั่งซื้อเลย" หรือ "จ่ายเงิน"
[TOOL_CALL] {"name":"get_my_addresses","arguments":{}} [/TOOL_CALL]

ลูกค้า: "อัพเดทโค้กเป็น 5 กระป๋อง" หรือ "เอาแค่ 1 อันพอ"
[TOOL_CALL] {"name":"update_cart_quantity","arguments":{"product_name":"โค้ก","quantity":5}} [/TOOL_CALL]

ลูกค้า: "เอาไข่ไก่ออก" หรือ "ไม่เอาอันนี้แล้ว"
[TOOL_CALL] {"name":"remove_from_cart","arguments":{"product_name":"ไข่ไก่"}} [/TOOL_CALL]

ลูกค้า: "ส่งไปที่อยู่เดิม จ่ายปลายทาง" (สมมติแชทบอทรู้ที่อยู่แล้ว)
[TOOL_CALL] {"name":"checkout_order_in_chatbot","arguments":{"address_id":1,"payment_method":"cod"}} [/TOOL_CALL]

ลูกค้า: "ยืนยันสั่งของ จ่ายเงินเมื่อได้รับสินค้า"
[TOOL_CALL] {"name":"checkout_order_in_chatbot","arguments":{"address_id":1,"payment_method":"cod"}} [/TOOL_CALL]

## กฎสำคัญเกี่ยวกับการสั่งซื้อ (PURCHASING RULES):
- ถ้าลูกค้าสั่ง "ชำระเงิน" หรือเช็คเอาท์ ให้ตรวจสอบก่อนว่ามีของในตะกร้าไหม ถ้าไม่มีให้แจ้งลูกค้าว่าตะกร้าว่างเปล่า ถ้ามีของให้เรียก get_my_addresses ทันที เพื่อนำที่อยู่มาให้ลูกค้าเลือก
- ถามยืนยันที่อยู่และแจ้งลูกค้าว่า **ทางร้านรองรับเฉพาะการชำระเงินแบบเก็บเงินปลายทาง (COD) เท่านั้น** หากลูกค้าขอสแกนจ่ายหรือโอนเงิน ให้ปฏิเสธอย่างสุภาพและยืนยันว่ารับแค่ COD
- เมื่อลูกค้าเบือก/ระบุที่อยู่ได้แล้ว ให้เรียก \`checkout_order_in_chatbot\` โดยส่ง payment_method="cod" เสมอ
- ถ้าลูกค้าถามว่า "ในตะกร้ามีอะไรบ้าง" หรือ "สรุปยอดให้หน่อย" ให้คุณอ่านข้อมูลจาก **สถานะตะกร้าสินค้าปัจจุบันของลูกค้า** ท้าย Prompt แล้วสรุปตอบลูกค้าได้เลยอย่างน่าอ่าน
- ถ้าลูกค้าสั่ง "ลบ" หรือ "ไม่เอา" สินค้าบางรายการ ให้เรียก \`remove_from_cart\`
- ถ้าลูกค้าสั่ง "เคลียร์ตะกร้า" หรือลบทุกอย่าง ให้เรียก \`remove_from_cart\` วนลูปสำหรับสินค้าทุกชิ้นที่มีในตะกร้าพร้อมๆ กันในตาเดียว
- ถ้าต้องการเพิ่ม/ลด/อัพเดทจำนวนตะกร้า ให้เรียก \`update_cart_quantity\`
- ห้ามตอบปากเปล่าตอบรับคำสั่งซื้อ/แก้ไขตะกร้าโดยไม่เรียก Tool เด็ดขาด!! ลูกค้าสั่งปุ๊บต้องยิง Tool ทันที
- ถ้า Tool ส่งออเดอร์ status = 'cancelled' กลับมาเมื่อลูกค้าดูประวัติ ให้แจ้งหมายเหตุการยกเลิกด้วยเสมอ เช่น "เหตุผลที่ยกเลิก: [cancel_note]"

## กฎสำคัญ:
- ถ้าลูกค้าถามหมวดหมู่ → เรียก get_categories เสมอ
- ถ้าลูกค้าพิมพ์ชื่อหมวดหมู่ (เช่น "เครื่องดื่ม" "ขนมและของว่าง" "ข้าวและแป้ง" ฯลฯ) → เรียก get_products_by_category ทันที ห้ามเรียก search_products
- ถ้าลูกค้าค้นหาสินค้าด้วยชื่อสินค้า (ต้องการดูข้อมูล) → เรียก search_products
- ถ้าลูกค้าพิมพ์ชื่อสินค้าที่เคยแสดงในรายการ (โดยเฉพาะหลังจากดู get_products_by_category) โดยไม่ได้ถามว่า "มีไหม" หรือ "อยากรู้" → แปลว่าลูกค้า **ต้องการสั่งซื้อ** ให้เรียก add_product_to_cart ทันที ห้ามถามนู่นถามนี่ ห้ามเรียก search_products อีก
## กฎการแสดงผล (FORMATTING):
- แสดงรายการสินค้าด้วย "•" หรือ "-" นำหน้า ห้ามใช้ emoji 🚨 หรือ emoji ที่ไม่เกี่ยวข้องกับสินค้า
- ใช้ emoji ที่เหมาะสมกับหมวดหมู่สินค้านั้นๆ ตามที่ Tool ส่งกลับมา
- ลิสต์สินค้าที่จะนำเสนอให้ลูกค้า ต้องอ้างอิงรายชื่อและราคาจากที่ Tool ส่งมาให้เป๊ะๆ ห้ามดัดแปลง ห้ามเพิ่มสินค้าที่ไม่มีในผลลัพธ์ของ Tool เด็ดขาด
- หัวข้อหมวดหมู่ในการแสดงผล **ต้อง** ใช้ชื่อเต็มตามที่ Tool ส่งมาในฟิลด์ \`category_name\` เสมอ (ห้ามใช้ชื่อย่อที่ลูกค้าพิมพ์เด็ดขาด เพื่อป้องกันความสับสน)
- สำหรับตัวเลือกสินค้า (SKU) **ห้าม** แสดงรหัสภาษาอังกฤษดิบๆ เช่น TSHIRT-LANNA-S-WHT ให้ลูกค้าเห็นเด็ดขาด! ให้คุณแปลความหมายของรหัส SKU เป็นตัวเลือกภาษาไทยที่อ่านง่ายและกระชับ (เช่น "ไซส์ S สีขาว", "ขนาด 250 กรัม", "ความจุ 15 ลิตร") เพื่อให้ลูกค้าอ่านแล้วเข้าใจทันที
- **เน้นย้ำ:** แม้คุณจะแสดงตัวเลือกให้ลูกค้าเห็นเป็นภาษาไทย แต่เวลาที่คุณดึง Tool \`add_product_to_cart\` คุณ **ต้อง** ใช้รหัส SKU ดั้งเดิมภาษาอังกฤษเป็นค่า \`variant_sku\` เสมอ ห้ามส่งค่าภาษาไทยไปใน Tool เด็ดขาด
- ห้ามคิดชื่อหมวดหมู่ขึ้นมาเองเด็ดขาด ต้องอ้างอิงรายชื่อหมวดหมู่จากที่ get_categories ส่งกลับมาเท่านั้น
- ถ้าลูกค้าพูดว่า "เพิ่ม" "ซื้อ" "ใส่" + ชื่อสินค้า → เรียก add_product_to_cart ทันที โดยใส่ชื่อสินค้าตรงๆ ตามที่ลูกค้าพูด
- ถ้าลูกค้าพิมพ์ชื่อสินค้าที่แสดงในรายการก่อนหน้า (โดยไม่ได้ถามว่ามีหรือเปล่า) → ให้ถามว่า "ต้องการเพิ่มสินค้านี้ลงตะกร้าเลยไหมคะ?" แล้วถ้าลูกค้าตอบตกลง ให้เรียก add_product_to_cart ทันที ห้ามเรียก search_products ซ้ำอีก
- ห้ามตอบ raw JSON ให้ลูกค้า
- ห้ามอ้างว่า "ระบบปรับปรุง" หรือ "ไม่สามารถดูได้ตอนนี้" — ให้เรียก tool ได้เลย`;

    if (customer?.name) {
        prompt += `\n\nลูกค้าที่กำลังคุยด้วยคือ: ${customer.name} (เบอร์ ${customer.phone})`;
    } else {
        prompt += `\n\nลูกค้ายังไม่ได้ล็อกอิน (ออเดอร์และที่จัดส่งจะไม่สามารถใช้ได้)`;
    }

    if (cartItems && cartItems.length > 0) {
        prompt += `\n\n**สถานะตะกร้าสินค้าปัจจุบันของลูกค้า:**\n`;
        cartItems.forEach(item => {
            prompt += `- ${item.product_name} x ${item.quantity} (ราคาต่อชิ้น: ${item.price})\n`;
        });
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        prompt += `**ยอดรวมทั้งสิ้น:** ${total} บาท\n`;
    } else {
        prompt += `\n\n**สถานะตะกร้าสินค้าปัจจุบัน:** ว่างเปล่า`;
    }

    return prompt;
};

module.exports = { chatWithTools, buildSystemPrompt, TOOLS };
