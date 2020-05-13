const moment = require("moment");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const ReceivingSchema = new Schema({
  dateInitiated: { type: Date, required: true, default: Date.now() },
  dateSubmitted: { type: Date },
  receivedItems: [
    {
      item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
      quantity: { type: Number, required: true },
    },
  ],
  orderReceived: { type: Schema.Types.ObjectId, ref: "Order" },
});

ReceivingSchema.virtual("orderReceivedUrl").get(function () {
  return `/inventory/order/${this.orderReceived}`;
});

ReceivingSchema.virtual("totalQuantityInItems").get(function () {
  return this.receivedItems.reduce((total, item) => total + item.quantity, 0);
});

ReceivingSchema.virtual("dateInitiatedFormatted").get(function () {
  return moment(this.dateInitiated).format("MMMM Do, YYYY");
});

ReceivingSchema.virtual("dateSubmittedFormatted").get(function () {
  return moment(this.dateSubmitted).format("MMMM Do, YYYY");
});

ReceivingSchema.virtual("submitted").get(function () {
  return !!this.dateSubmitted;
});

ReceivingSchema.virtual("url").get(function () {
  return `/inventory/receiving/${this._id}`;
});

module.exports = mongoose.model("Receipt", ReceivingSchema);
