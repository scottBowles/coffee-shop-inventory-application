const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const OrderSchema = new Schema(
   {
      orderDate: { type: Date },
      deliveryDate: { type: Date },
      status: { type: String, required: true, enum: ['Saved', 'Ordered', 'Received'], default: 'Saved' },
      orderedItems: [{
         item: { type: Schema.Types.ObjectId, ref: 'Item' },
         quantity: { type: Number },
      }],
      lastUpdated: { type: Date, required: true, default: Date.now },
   }
);

OrderSchema
.virtual('url')
.get(function () {
   return '/inventory/order/' + this._id;
});

module.exports = mongoose.model('Order', OrderSchema);