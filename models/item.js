const moment = require('moment');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const ItemSchema = new Schema(
  {
    name: { type: String, required: true, max: 40 },
    description: { type: String, max: 256 },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    sku: { type: String, default: 'Not marked for sale' },
    price: { type: Number },
    quantityInStock: { type: Number, required: true },
    qtyLastUpdated: { type: Date, required: true, default: Date.now() },
    itemLastUpdated: { type: Date, required: true, default: Date.now() },
  },
);

ItemSchema
  .virtual('qtyLastUpdatedFormatted')
  .get(function lastQtyUpdateFormatted() {
    return moment(this.qtyLastUpdated).format('MMMM Do, YYYY');
  });

ItemSchema
  .virtual('itemLastUpdatedFormatted')
  .get(function lastItemUpdateFormatted() {
    return moment(this.itemLastUpdated).format('MMMM Do, YYYY');
  });

ItemSchema
  .virtual('url')
  .get(function itemUrl() {
    return `/inventory/item/${this._id}`;
  });

ItemSchema
  .virtual('forSale')
  .get(function itemSku() {
    return this.sku !== 'Not marked for sale';
  });

module.exports = mongoose.model('Item', ItemSchema);
