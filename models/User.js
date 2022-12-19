const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt =require('bcryptjs')

const UserSchema = new mongoose.Schema({
  username : {
    type: String,
    required : [true,`Choisissez un nom d'utilisateur`],
    minlength: 3,
    maxlength: 50,
    unique : [true, 'Ce speudonyme est déjà pris']
  },
  email : {
    type: String,
    required : [true, 'Choissez une adresse email'],
    unique: true,
    validate : {
      validator: validator.isEmail,
      message:'Veuillez entrer une adresse email valide',

    }
  },
  password : {
    type: String,
    minlength: [6, 'Le mot de passe doit faire 6 caractères minimum'],
    required : [true, 'Mot de passe obligatoire']
  },
  twitter : {
    type: String,
    validate : {
      validator: validator.isURL,
      message: 'Entrez une URL Twitter valide'
    }
  },
  facebook : {
    type: String,
    validate : {
      validator: validator.isURL,
      message: 'Entrez une URL Facebook valide'
    }
  },
  imgPath : {
    type: String,
    default: '/uploads/headshot.png'

  },
  role: {
    type: String,
    enum: ['admin','user'],
    default: 'user'
  },
  description: {
    type:String
  },
  
  favorites: {
    type: [],
    default : []
  },
  bookmarks : {
    type: [],
    default : []
  }
})

UserSchema.pre('save', async function () {
//  console.log(this.modifiedPaths());
//  console.log(this.isModified('name'));
 if(!this.isModified('password')) return
 
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (passwordCandidate){
  const isValid = await bcrypt.compare(passwordCandidate, this.password)
  return isValid
}

module.exports = mongoose.model('User', UserSchema)