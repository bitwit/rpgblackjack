mongoose = require 'mongoose'
Schema = mongoose.Schema
mongoose.connect 'mongodb://localhost/rpgblackjack'

models = {}

models.Types = {
  ObjectId : mongoose.Types.ObjectId
}

###
 Game Model
###
attributes =
  createdAt: {"type": Date, "default": Date.now}
  data: Schema.Types.Mixed
  userCount: Number
  player1: {"type": Schema.Types.ObjectId, "ref": "User"}
  player2: {"type": Schema.Types.ObjectId, "ref": "User", "default": null}
  isMultiplayer: { "type": Boolean, "default" : no }
  isComplete: { "type": Boolean, "default" : no }
  isAborted: { "type": Boolean, "default" : no }
  moves: [{"type": Schema.Types.ObjectId, "ref": "Move"}]

schema = new Schema attributes, strict: yes

models.Game = mongoose.model 'Game', schema


###
  User Model
###
attributes =
  username: String
  avatar: String
  createdAt: {"type": Date, "default": Date.now}
  lastLoginAt: {"type": Date, "default": Date.now}

schema = new Schema attributes, strict: yes

models.User = mongoose.model 'User', schema

###
  Move Model
###

attributes =
  gameId: Schema.Types.ObjectId
  userId: Schema.Types.ObjectId
  playerId: Number
  moveType: Number
  createdAt: {"type": Date, "default": Date.now}

schema = new Schema attributes, strict: yes

models.Move = mongoose.model 'Move', schema

###

class Level(models.Model):
"""
Games have multiple levels. Associated the board used with the game
"""
board = models.ForeignKey(Board)
game = models.ForeignKey(Game)
data = models.TextField(blank=False) #stores the numbers in the EXACT arrangement used in JSON

###


module.exports = models