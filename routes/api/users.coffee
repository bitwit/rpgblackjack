models = require './../../models'

exports.new = (req, res) ->

  console.log 'query', req.query, 'params',req.params

  username = req.body["username"]
  avatar = req.body["avatar"]
  if !username?
    return res.json 400,
      success: no
      message: "Invalid Form. No username provided"

  user = new models.User()
  user.username = username
  user.avatar = avatar
  user.save()

  res.json
    success: yes
    payload: user

exports.login = (req, res) ->

exports.logout = (req, res) ->
