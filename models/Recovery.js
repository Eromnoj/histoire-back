const mongoose = require('mongoose')

const RecoverySchema = mongoose.Schema({
  userId: {
    type:mongoose.Types.ObjectId,
    required:true
  },
  token:{
    type:String,
    required: true
  }
},{timestamps: true})

module.exports = mongoose.model('Recovery', RecoverySchema)