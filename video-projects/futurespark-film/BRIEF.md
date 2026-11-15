---
workflow: hyperframes
message: "Future Spark's school site: the real pages, the My Class Board parent dashboard, and Google as the backend"
destination: portfolio-tv
aspect: 1920x1080
length: 16s
---

Motion-graphics project video for Future Spark (freelance), a muted loop on the portfolio's 3D TV, replacing the
earlier reel (kept here as previous-futurespark-reel.mp4). Brand colours from the live site: navy #240C67 and violet
#A079FF, on the portfolio's pastel grounds.

Sources: a capture of futurespark.in (../captures/futurespark): assets/site-hero.jpg (the hero) and
assets/site-mcb.jpg (the My Class Board section with its phone mock-up). The backend scene follows the project
write-up: enquiry form → Google Apps Script web app → a new row in a Google Sheet; events from a Sheet, gallery from
Google Drive, hosted on Netlify. Form fields are drawn as bars (no invented personal data).

Scenes: hero (site, pages) → mcb (parent dashboard) → backend (form to Sheet) → endcard.
Render: npx hyperframes render -o ../../public/projects/futurespark-reel.mp4 --keyframe-interval 1 --max-bitrate 6M
