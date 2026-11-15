---
workflow: hyperframes
message: "Real EV specs in, three models trained and compared, a Django app that predicts a car's price"
destination: portfolio-tv
aspect: 1920x1080
length: 16s
---

Project video for EV Cost Prediction, a muted loop on the portfolio's 3D TV, in the portfolio's pastel look.

Facts come from github.com/vardhannehru/-EV-Cost-Prediction: Dataset/ElectricCarData_Clean3.csv (Brand, Model,
AccelSec, TopSpeed_KmH, Range_Km, Efficiency_WhKm, FastCharge_KmH, PowerTrain, BodyStyle, Seats, Price…; the rows
shown are real), one-hot encoding (pd.get_dummies), an 80/20 split, Linear Regression, Random Forest and an ANN
(Keras) scored with MSE / RMSE / R² and "within 10%" accuracy in adminapp/views.py, and a Django app. No scores or
predicted prices are shown, because none are recorded in the repo; the Tesla's €55,480 is its list price in the data.

Scenes: specs (one dataset row, "Price ?") → data (table, encode, split) → models (three models, predict) → endcard.
Render: npx hyperframes render -o ../../public/projects/ev-cost-reel.mp4 --keyframe-interval 1 --max-bitrate 6M
