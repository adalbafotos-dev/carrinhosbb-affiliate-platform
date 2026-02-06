import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkGemini() {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    console.log("Checando Chave API:", key ? `Encontrada (fim: ${key.slice(-4)})` : "NÃO ENCONTRADA");

    if (!key) return;

    console.log("Testando request...");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello AI" }] }]
        })
    });

    if (res.ok) {
        console.log("✅ API Funcionando! Resposta:", await res.text());
    } else {
        console.error("❌ Erro na API:", res.status, await res.text());
    }
}

checkGemini();
