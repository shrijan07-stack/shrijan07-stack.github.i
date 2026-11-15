
module.exports = async (req, res) => {
  const allowedOrigin = "https://shrijan07-stack.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "AI service is not configured yet." });
    }

    const authorization = req.headers.authorization || "";
    const idToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!idToken) {
      return res.status(401).json({ error: "Please sign in first." });
    }

    // Verify the Firebase user token
    const verifyResponse = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyB-gcPHGNQ8clv0ddJ5jgO97Ylove559H0",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );

    const verifiedUser = await verifyResponse.json();

    if (!verifyResponse.ok || !verifiedUser.users?.length) {
      return res.status(401).json({ error: "Your login session is invalid. Please sign in again." });
    }

    const {
      topic,
      platform = "YouTube",
      language = "English",
      duration = "5 minutes",
      style = "Engaging",
      audience = "General audience"
    } = req.body || {};

    if (typeof topic !== "string" || !topic.trim() || topic.length > 500) {
      return res.status(400).json({ error: "Enter a topic of up to 500 characters." });
    }

    const allowedPlatforms = ["YouTube", "YouTube Shorts", "Instagram Reels"];
    const allowedLanguages = ["English", "Hindi", "Hinglish"];
    const allowedDurations = ["1 minute", "3 minutes", "5 minutes", "8 minutes", "10 minutes"];
    const allowedStyles = ["Engaging", "Documentary", "Mysterious", "Educational", "Motivational"];

    if (
      !allowedPlatforms.includes(platform) ||
      !allowedLanguages.includes(language) ||
      !allowedDurations.includes(duration) ||
      !allowedStyles.includes(style)
    ) {
      return res.status(400).json({ error: "Invalid script settings." });
    }

    const prompt = `
You are a professional YouTube scriptwriter.

Write an original, engaging video script using these settings:

Topic: ${topic.trim()}
Platform: ${platform}
Language: ${language}
Duration: ${duration}
Style: ${style}
Target audience: ${String(audience).slice(0, 150)}

Requirements:
- Start with a strong hook.
- Keep the script natural and engaging.
- Use clear, spoken language.
- Organize the script into a logical flow.
- End with a suitable call to action.
- Output the spoken script only.
- Do not invent facts or statistics.
`;

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }] }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 5000
          }
        })
      }
    );

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("AI provider error:", result);
      return res.status(502).json({ error: "AI generation failed. Please try again later." });
    }

    const script = result.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!script) {
      return res.status(502).json({ error: "The AI returned an empty script." });
    }

    return res.status(200).json({ script });

  } catch (error) {
    console.error("Script generation error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

