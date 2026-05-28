async function testWebhook() {
  const url = "https://jatiiiiin.app.n8n.cloud/webhook/generate-docs";
  const payload = {
    projectName: "AI Autonomous Financial Intelligence Platform",
    description: "Enterprise-grade AI financial intelligence infrastructure using distributed agent orchestration, fraud analytics, risk prediction, autonomous portfolio intelligence, and real-time transaction monitoring.",
    briefing: "A production-scale fintech AI platform designed for autonomous fraud detection, financial behavior intelligence, transaction risk scoring, portfolio optimization, and distributed AI workflow orchestration.",
    code: "from langgraph.graph import StateGraph\nfrom sklearn.ensemble import IsolationForest\nfrom sklearn.preprocessing import MinMaxScaler\nfrom sklearn.cluster import DBSCAN\nfrom dataclasses import dataclass\nimport numpy as np\nimport asyncio\nimport time\nimport json\n"
  };

  try {
    console.log("Sending POST request to n8n webhook...");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status, res.statusText);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const bodyText = await res.text();
    console.log("Response Body (size:", bodyText.length, "):", bodyText);
  } catch (err: any) {
    console.error("Request failed:", err.message);
  }
}

testWebhook();
