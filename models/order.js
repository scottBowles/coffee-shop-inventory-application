const moment = require("moment");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const OrderSchema = new Schema({
  orderDate: { type: Date },
  deliveryDate: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ["Saved", "Ordered", "Received"],
    default: "Saved",
  },
  orderedItems: [
    {
      item: { type: Schema.Types.ObjectId, ref: "Item" },
      quantity: { type: Number, max: 9999999 },
    },
  ],
  lastUpdated: { type: Date, required: true, default: Date.now() },
});

OrderSchema.virtual("receipt", {
  ref: "Receipt",
  localField: "_id",
  foreignField: "orderReceived",
  justOne: "true",
});

OrderSchema.virtual("orderDateFormatted").get(function () {
  return moment(this.orderDate).format("dddd, MMMM Do YYYY, h:mm:ss a");
});

OrderSchema.virtual("deliveryDateFormatted").get(function () {
  return moment(this.deliveryDate).format("dddd, MMMM Do YYYY, h:mm:ss a");
});

OrderSchema.virtual("lastUpdatedFormatted").get(function () {
  return moment(this.lastUpdated).format("dddd, MMMM Do YYYY, h:mm:ss a");
});

OrderSchema.virtual("url").get(function () {
  return `/inventory/order/${this._id}`;
});

OrderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", OrderSchema);
