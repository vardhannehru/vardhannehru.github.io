---
workflow: hyperframes
message: "One click, and a CrewAI agent researches the week's top 5 AI stories and writes them up as a newsletter"
destination: portfolio-tv
aspect: 1920x1080
length: 16.4s
---

Project video for News Digital Agency, a muted loop on the portfolio's 3D TV. Same look as the internship films
(pastel lavender / summer green worlds, Inter 900 + JetBrains Mono, 7% grain, no sound).

Facts come from the code in github.com/vardhannehru/CrewAI-Research-Agent: one CrewAI agent ("AI News Research
Specialist") on Claude Haiku, an "AI News Search" tool over Google News RSS, 2–3 searches over the past 7 days, the
top 5 stories as Markdown (headline, date, source, summary, link), saved as a styled HTML newsletter, run from a
Streamlit dashboard ("Run Newsletter Crew"). No headlines or stories are invented: they're drawn as bars.

Scenes: run (dashboard, click) → research (agent, searches, top 5) → newsletter (Markdown → HTML) → endcard.
Render: npx hyperframes render -o ../../public/projects/news-agency-reel.mp4 --keyframe-interval 1 --max-bitrate 6M
