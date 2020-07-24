const moment = require("moment");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const ItemSchema = new Schema({
  name: { type: String, required: true, maxlength: 40 },
  description: { type: String, maxlength: 256 },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  sku: { type: String, default: "Not marked for sale", maxlength: 24 },
  price: { type: Number, max: 9999999 },
  quantityInStock: { type: Number, required: true, max: 9999999 },
  qtyLastUpdated: { type: Date, required: true, default: Date.now() },
  itemLastUpdated: { type: Date, required: true, default: Date.now() },
  active: { type: Boolean, default: true },
});

ItemSchema.virtual("qtyLastUpdatedFormatted").get(
  function lastQtyUpdateFormatted() {
    return moment(this.qtyLastUpdated).format("dddd, MMMM Do YYYY, h:mm:ss a");
  }
);

ItemSchema.virtual("itemLastUpdatedFormatted").get(
  function lastItemUpdateFormatted() {
    return moment(this.itemLastUpdated).format("dddd, MMMM Do YYYY, h:mm:ss a");
  }
);

ItemSchema.virtual("url").get(function itemUrl() {
  return `/inventory/item/${this._id}`;
});

ItemSchema.virtual("forSale").get(function itemSku() {
  return this.sku !== "Not marked for sale";
});

module.exports = mongoose.model("Item", ItemSchema);
