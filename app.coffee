
###
# Module dependencies.
###

express = require 'express'
routes = require './routes'

api =
  games: require './routes/api/games'
  users: require './routes/api/users'

http = require 'http'
path = require 'path'

models = require './models'

app = express()

#all environments
app.set 'port', process.env.PORT || 3000
app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade'
app.use express.favicon()
app.use express.logger('dev')
app.use express.bodyParser()
app.use express.methodOverride()
app.use app.router
app.use express.static(path.join(__dirname, 'public'))

# development only
if app.get('env') is 'development'
  app.use express.errorHandler()

###
   Basic Auth
###
auth = express.basicAuth (user, pass, callback) ->
  models.User.findOne {'_id': user}, (err, result) ->
    if err?
      callback err, null
    else
      callback null, result

###
  Routing Rules
###

# View routes
app.get '/', routes.index
app.get '/template/:template', routes.template

# Users routes
app.post '/api/users/new', api.users.new

# Games routes
app.get '/api/games/rooms', auth, api.games.rooms
app.get '/api/games/get/:gameId', auth, api.games.get
app.get '/api/games/state/:gameId', auth, api.games.state

app.post '/api/games/new', auth, api.games.new
app.post '/api/games/move/:gameId', auth, api.games.move
app.post '/api/games/join/:gameId', auth, api.games.join


http.createServer(app).listen app.get('port'), () ->
  console.log('Express server listening on port ' + app.get('port'))
