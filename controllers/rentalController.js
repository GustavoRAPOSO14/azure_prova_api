import express from "express";
import { tableClient, ensureRentalTable } from "../models/rentalModel.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Inicializa tabela
ensureRentalTable();

// ======= CREATE RENTAL =======
router.post("/", async (req, res) => {
  try {
    const { vehicleId, clientId, startDate, endDate, price } = req.body;
    const id = uuidv4();

    const entity = {
      PartitionKey: "RENTAL",
      RowKey: id,
      RentalId: id,
      VehicleId: vehicleId,
      ClientId: clientId,
      StartDate: startDate,
      EndDate: endDate,
      Price: Number(price),
      Status: "active", // active, canceled, finished
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await tableClient.createEntity(entity);
    res.status(201).json({ message: "Locação criada", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= LIST RENTALS =======
router.get("/", async (req, res) => {
  try {
    const rentals = [];
    for await (const e of tableClient.listEntities()) {
      rentals.push({
        id: e.RowKey,
        rentalId: e.RentalId,
        vehicleId: e.VehicleId,
        clientId: e.ClientId,
        startDate: e.StartDate,
        endDate: e.EndDate,
        price: e.Price,
        status: e.Status,
      });
    }
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= UPDATE RENTAL =======
router.put("/:id", async (req, res) => {
  try {
    const rentalId = req.params.id;
    const { startDate, endDate, price, status } = req.body;

    const entity = await tableClient.getEntity("RENTAL", rentalId);

    if (startDate !== undefined) entity.StartDate = startDate;
    if (endDate !== undefined) entity.EndDate = endDate;
    if (price !== undefined) entity.Price = Number(price);
    if (status !== undefined) entity.Status = status;

    entity.UpdatedAt = new Date().toISOString();

    await tableClient.updateEntity(entity, "Replace");
    res.json({ message: "Locação atualizada", id: rentalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= DELETE / CANCEL RENTAL =======
router.delete("/:id", async (req, res) => {
  try {
    const rentalId = req.params.id;
    await tableClient.deleteEntity("RENTAL", rentalId);
    res.json({ message: "Locação cancelada", id: rentalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
