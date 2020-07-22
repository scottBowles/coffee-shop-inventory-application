const express = require("express");
const categoryController = require("../controllers/categoryController");
const itemController = require("../controllers/itemController");
const orderController = require("../controllers/orderController");
const receivingController = require("../controllers/receivingController");
const inventoryCountController = require("../controllers/inventoryCountController");

const router = express.Router();

// GET inventory home page
router.get("/", orderController.index);

// RECEIVING ROUTES //

// GET request for creating a receipt from an order
router.get(
  "/receiving/create-new/:order",
  receivingController.receipt_create_get
);

// POST request for creating a receipt from an order
router.post(
  "/receiving/create-new/:order",
  receivingController.receipt_create_post
);

// GET request for creating a receipt
router.get("/receiving/create-new", receivingController.receipt_create_get);

// POST request for creating a receipt
router.post("/receiving/create-new", receivingController.receipt_create_post);

// GET request for updating a receipt
router.get("/receiving/:id/update", receivingController.receipt_update_get);

// POST request for updating a receipt
router.post("/receiving/:id/update", receivingController.receipt_update_post);

// GET request for deleting a receipt
router.get("/receiving/:id/remove", receivingController.receipt_delete_get);

// POST request for deleting a receipt
router.post("/receiving/:id/remove", receivingController.receipt_delete_post);

// GET request for one receipt
router.get("/receiving/:id", receivingController.receipt_detail);

// GET receiving home page
router.get("/receiving", receivingController.receiving_home);

// COUNT ROUTES //

// GET request for creating a count
router.get("/count/create-new", inventoryCountController.count_create_get);

// POST request for creating a count
router.post("/count/create-new", inventoryCountController.count_create_post);

// GET request for updating a count
router.get("/count/:id/update", inventoryCountController.count_update_get);

// POST request for updating a count
router.post("/count/:id/update", inventoryCountController.count_update_post);

// GET request for deleting a count
router.get("/count/:id/remove", inventoryCountController.count_delete_get);

// POST request for deleting a count
router.post("/count/:id/remove", inventoryCountController.count_delete_post);

// GET request for one count
router.get("/count/:id", inventoryCountController.count_detail_get);

// POST request for one count
router.post("/count/:id", inventoryCountController.count_detail_post);

// GET inventory count home page
router.get("/counts", inventoryCountController.count_home);

// ITEM ROUTES //

// GET request for creating an item
router.get("/item/create-new", itemController.item_create_get);

// POST request for creating an item
router.post("/item/create-new", itemController.item_create_post);

// GET request for updating an item
router.get("/item/:id/update", itemController.item_update_get);

// POST request for updating an item
router.post("/item/:id/update", itemController.item_update_post);

// GET request for deleting an item
router.get("/item/:id/archive", itemController.item_archive_get);

// POST request for deleting an item
router.post("/item/:id/archive", itemController.item_archive_post);

// GET request for one item
router.get("/item/:id", itemController.item_detail);

// GET request for item home page
router.get("/items", itemController.item_home);

// ORDER ROUTES //

// GET request for creating an order
router.get("/order/create-new", orderController.order_create_get);

// POST request for creating an order
router.post("/order/create-new", orderController.order_create_post);

// GET request for updating an order
router.get("/order/:id/update", orderController.order_update_get);

// POST request for updating an order
router.post("/order/:id/update", orderController.order_update_post);

// GET request for deleting an order
router.get("/order/:id/remove", orderController.order_delete_get);

// POST request for deleting an order
router.post("/order/:id/remove", orderController.order_delete_post);

// GET request for one order
router.get("/order/:id", orderController.order_detail_get);

// POST request for one order
router.post("/order/:id", orderController.order_detail_post);

// GET request for order home page
router.get("/orders", orderController.order_home);

// CATEGORY ROUTES //

// GET request for creating an category
router.get("/category/create-new", categoryController.category_create_get);

// POST request for creating an category
router.post("/category/create-new", categoryController.category_create_post);

// GET request for updating an category
router.get("/category/:id/update", categoryController.category_update_get);

// POST request for updating an category
router.post("/category/:id/update", categoryController.category_update_post);

// GET request for deleting an category
router.get("/category/:id/remove", categoryController.category_delete_get);

// POST request for deleting an category
router.post("/category/:id/remove", categoryController.category_delete_post);

// GET request for one category
router.get("/category/:id", categoryController.category_detail);

// GET request for category home page
router.get("/categories", categoryController.category_home);

module.exports = router;
