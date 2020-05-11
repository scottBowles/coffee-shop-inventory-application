const moment = require('moment');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const InventoryCountSchema = new Schema(
  {
    dateInitiated: { type: Date, required: true, default: Date.now() },
    dateSubmitted: { type: Date },
    countedQuantities: [{
      item: { type: Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number },
    }],
    type: {
      type: String,
      required: true,
      enum: ['Full', 'By Category', 'Ad Hoc'],
      default: 'Ad Hoc',
    },
  },
);

InventoryCountSchema
  .virtual('submitted')
  .get(function () {
    return !!this.dateSubmitted;
  });

InventoryCountSchema
  .virtual('dateInitiatedFormatted')
  .get(function () {
    return moment(this.dateInitiated).format('MMMM Do, YYYY');
  });

InventoryCountSchema
  .virtual('dateSubmittedFormatted')
  .get(function () {
    return moment(this.dateSubmitted).format('MMMM Do, YYYY');
  });

InventoryCountSchema
  .virtual('url')
  .get(function () {
    return `/inventory/count/${this._id}`;
  });

module.exports = mongoose.model('InventoryCount', InventoryCountSchema);
