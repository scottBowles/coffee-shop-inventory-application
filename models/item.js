const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ItemSchema = new Schema(
   {
      name: {type: String, required: true, max: 40},
      description: {type: String, max: 256},
      category: {type: Schema.Types.ObjectId, ref: 'Category'},
      sku: {type: String, default: 'Not marked for sale'},
      price: {type: Number},
      quantityInStock: {type: Number, required: true},
      quantityOnOrder: {type: Number, default: 0},
      lastUpdated: {type: Date, required: true, default: Date.now}
   }
);

ItemSchema
.virtual('url')
.get(function () {
   return '/inventory/item/' + this._id;
});

ItemSchema
.virtual('forSale')
.get(function () {
   return this.sku !== 'Not marked for sale';
});

module.exports = mongoose.model('Item', ItemSchema)