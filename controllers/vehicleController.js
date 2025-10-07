import express from "express";
import multer from "multer";
import { tableClient, containerClient, uploadBufferToBlob, ensureAzureResources } from "../models/vehicleModel.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ======= INIT AZURE =======
ensureAzureResources();

// CREATE VEHICLE
router.post("/", upload.array("photos", 6), async (req, res) => {
  try {
    const { brand, model, year, plate, price, available } = req.body;
    const files = req.files || [];
    const id = uuidv4();

    const uploaded = [];
    for (const f of files) {
      const up = await uploadBufferToBlob(f.buffer, f.mimetype, id);
      uploaded.push(up);
    }

    const entity = {
      PartitionKey: "VEHICLE",
      RowKey: id,
      Id: id,
      Brand: brand || "",
      Model: model || "",
      Year: year ? Number(year) : undefined,
      Plate: plate || "",
      Price: price ? Number(price) : undefined,
      Available: available === undefined ? true : available === "true" || available === true,
      Images: JSON.stringify(uploaded.map(u => u.blobName)),
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    Object.keys(entity).forEach(k => entity[k] === undefined && delete entity[k]);
    await tableClient.createEntity(entity);

    res.status(201).json({ id, message: "Veículo criado", images: uploaded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIST VEHICLES
router.get("/", async (req, res) => {
  try {
    const vehicles = [];
    for await (const e of tableClient.listEntities()) {
      const images = JSON.parse(e.Images || "[]").map(blobName => `${containerClient.url}/${blobName}`);
      vehicles.push({
        id: e.RowKey,
        Id: e.Id,
        brand: e.Brand,
        model: e.Model,
        year: e.Year,
        plate: e.Plate,
        price: e.Price,
        available: e.Available,
        images,
      });
    }
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE VEHICLE
router.put("/:id", upload.array("photos", 6), async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { brand, model, year, plate, price, available } = req.body;
    const files = req.files || [];

    const entity = await tableClient.getEntity("VEHICLE", vehicleId);

    if (brand !== undefined) entity.Brand = brand;
    if (model !== undefined) entity.Model = model;
    if (year !== undefined) entity.Year = Number(year);
    if (plate !== undefined) entity.Plate = plate;
    if (price !== undefined) entity.Price = Number(price);
    if (available !== undefined) entity.Available = available === "true" || available === true;

    let images = JSON.parse(entity.Images || "[]");
    for (const f of files) {
      const up = await uploadBufferToBlob(f.buffer, f.mimetype, vehicleId);
      images.push(up.blobName);
    }
    entity.Images = JSON.stringify(images);
    entity.UpdatedAt = new Date().toISOString();

    await tableClient.updateEntity(entity, "Replace");

    const imagesUrls = images.map(blobName => `${containerClient.url}/${blobName}`);
    res.json({ message: "Veículo atualizado", id: vehicleId, images: imagesUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE VEHICLE
router.delete("/:id", async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const entity = await tableClient.getEntity("VEHICLE", vehicleId);
    const images = JSON.parse(entity.Images || "[]");

    for (const blobName of images) {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    }

    await tableClient.deleteEntity("VEHICLE", vehicleId);

    res.json({ message: "Veículo apagado", id: vehicleId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIST VEHICLES COM FILTRO
router.get("/search", async (req, res) => {
  try {
    const { brand, model, minPrice, maxPrice, available } = req.query;

    let filter = "PartitionKey eq 'VEHICLE'";

    // Adiciona filtros opcionais
    if (brand) filter += ` and Brand eq '${brand}'`;
    if (model) filter += ` and Model eq '${model}'`;
    if (available !== undefined) filter += ` and Available eq ${available === "true" || available === true}`;
    if (minPrice) filter += ` and Price ge ${Number(minPrice)}`;
    if (maxPrice) filter += ` and Price le ${Number(maxPrice)}`;

    const vehicles = [];
    for await (const e of tableClient.listEntities({ queryOptions: { filter } })) {
      const images = JSON.parse(e.Images || "[]").map(blobName => `${containerClient.url}/${blobName}`);
      vehicles.push({
        id: e.RowKey,
        Id: e.Id,
        brand: e.Brand,
        model: e.Model,
        year: e.Year,
        plate: e.Plate,
        price: e.Price,
        available: e.Available,
        images,
      });
    }

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
