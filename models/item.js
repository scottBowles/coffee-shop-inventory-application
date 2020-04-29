const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ItemSchema = new Schema(
   {
      name: {type: String, required: true, max: 40},
      sku: {type: String, default: 'not marked for sale'},
      forsale: {type: Boolean, required: true},
      price: {type: Number},
      description: {type: String, max: 256},
      category: {type: Schema.Types.ObjectId, ref: 'Category', required: true},
      maxShelfLifeInDays: {type: Number}
   }
);

ItemSchema
.virtual('url')
.get(function () {
   return '/inventory/item/' + this._id;
});

module.exports = mongoose.model('Item', ItemSchema);