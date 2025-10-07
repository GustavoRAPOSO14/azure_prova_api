import express from "express";
import dotenv from "dotenv";
import vehicleRouter from "./controllers/vehicleController.js";
import clientRoutes from "./controllers/clientController.js";
import rentalRoutes from "./controllers/rentalController.js"

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use("/vehicles", vehicleRouter);
app.use("/clients", clientRoutes);
app.use("/rentals", rentalRoutes);

app.listen(PORT, () => console.log(`🚗 API rodando em http://localhost:${PORT}`));
