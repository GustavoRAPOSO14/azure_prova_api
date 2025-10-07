import express from "express";
import { v4 as uuidv4 } from "uuid";
import { tableClient, ensureAzureResources } from "../models/clientModel.js";

const router = express.Router();

// Inicializa a tabela
ensureAzureResources();

// ======= CREATE CLIENT =======
router.post("/", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      birthDate
    } = req.body;

    const id = uuidv4();
    const entity = {
      PartitionKey: "CLIENT",
      RowKey: id,
      Id: id,
      FirstName: firstName || "",
      LastName: lastName || "",
      Email: email || "",
      Phone: phone || "",
      Address: address || "",
      BirthDate: birthDate || "",
      RentalHistory: JSON.stringify([]), // histórico de locações vazio
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await tableClient.createEntity(entity);

    res.status(201).json({ message: "Cliente criado", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= LIST CLIENTS =======
router.get("/", async (req, res) => {
  try {
    const clients = [];
    for await (const e of tableClient.listEntities()) {
      clients.push({
        id: e.Id,
        firstName: e.FirstName,
        lastName: e.LastName,
        email: e.Email,
        phone: e.Phone,
        address: e.Address,
        birthDate: e.BirthDate,
        rentalHistory: JSON.parse(e.RentalHistory || "[]"),
      });
    }
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= UPDATE CLIENT =======
router.put("/:id", async (req, res) => {
  try {
    const clientId = req.params.id;
    const { firstName, lastName, email, phone, address, birthDate } = req.body;

    const entity = await tableClient.getEntity("CLIENT", clientId);

    if (firstName !== undefined) entity.FirstName = firstName;
    if (lastName !== undefined) entity.LastName = lastName;
    if (email !== undefined) entity.Email = email;
    if (phone !== undefined) entity.Phone = phone;
    if (address !== undefined) entity.Address = address;
    if (birthDate !== undefined) entity.BirthDate = birthDate;

    entity.UpdatedAt = new Date().toISOString();

    await tableClient.updateEntity(entity, "Replace");

    res.json({ message: "Cliente atualizado", id: clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= DELETE CLIENT =======
router.delete("/:id", async (req, res) => {
  try {
    const clientId = req.params.id;
    await tableClient.deleteEntity("CLIENT", clientId, "CLIENT");
    res.json({ message: "Cliente apagado", id: clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
