const moment = require('moment');
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
      lastUpdated: { type: Date, required: true, default: Date.now() },
   }
);

OrderSchema
.virtual('orderDateFormatted')
.get(function () {
   return moment(this.orderDate).format('MMMM Do, YYYY');
});

OrderSchema
.virtual('deliveryDateFormatted')
.get(function () {
   return moment(this.deliveryDate).format('MMMM Do, YYYY');
});

OrderSchema
.virtual('lastUpdatedFormatted')
.get(function () {
   return moment(this.lastUpdated).format('MMMM Do, YYYY');
});

OrderSchema
.virtual('url')
.get(function () {
   return '/inventory/order/' + this._id;
});

module.exports = mongoose.model('Order', OrderSchema);