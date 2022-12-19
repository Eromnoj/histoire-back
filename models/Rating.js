const mongoose = require('mongoose')

const RatingSchema = mongoose.Schema({
  bookId : {
    type: mongoose.Types.ObjectId,
    required: true
  },
  userId : {
    type: mongoose.Types.ObjectId,
    required: true
  },
  rate: {
    type: Number,
    default: 3,
    min : [0, 'Vous ne pouvez pas donner une note inférieur à 0'],
    max : [5, 'Vous ne pouvez pas donner une note supérieur à 5']
  }

})

module.exports = mongoose.model('Rating', RatingSchema)