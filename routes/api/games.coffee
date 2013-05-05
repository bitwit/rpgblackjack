logic = require 'game'
models = require './../../models'


exports.new = (req, res) ->
  ###
  Add game and setup the initial state
  ###

  console.log 'request user', req.user, 'req', req

  if req.method is "POST"

    isMultiplayer = req.body["isMultiplayer"]

    if !isMultiplayer?
      return res.json 400,
        success: no
        message: "Form is invalid"

    #make a new game
    game = new models.Game()
    game.isMultiplayer = isMultiplayer
    game.userCount = 1
    game.player1 = req.user._id
    game.save()

    gameLogic = new logic.Game()
    game.data = gameLogic.getSaveData()

    return res.json
      success: yes
      payload: game
  else
    return res.json 400,
      success: no
      message: "Invalid request method"


exports.me = (req, res) ->
  ###
  Returns any games that the user is currently active in, if any
  ###
  models.Game.find {isComplete: no, $or:[{player1: req.user._id},{player2: req.user._id}]}, (err, result) ->
    if err
      return res.json 400,
        success: no
        message: "Error while searching for user's games"
    else
      return res.json
        success: yes
        payload: result

exports.rooms = (req, res) ->
  ###
  Returns a list of available rooms to the user
  ###
  models.Game
    .find({isMultiplayer: yes, userCount: 1})
    .populate('player1')
    .exec (err, result) ->
      return res.json
        success: yes
        payload: result


exports.join = (req, res) ->
  ###
  A command for the second player of a game to join
  ###
  gameId = req.params["gameId"]

  models.Game.findOne {_id:gameId}, (err, result) ->
    if err
      return res.json 400,
        success: no
        message: "No game by that ID"
    else
      game = result

      if game.userCount is 2 or not game.isMultiplayer
        return res.json 400,
          success: no
          message: "Invalid Game"

      game.player2 = req.user._id
      game.userCount = 2
      game.save()

      return res.json
        success: yes
        payload: game

exports.get = (req, res) ->
  ###
  The first call made the request access to a game after creation or upon return
  ###

  gameId = req.params["gameId"]

  models.Game
    .findOne({_id:gameId, $or:[{player1: req.user._id},{player2: req.user._id}]})
    .populate('player1')
    .populate('player2')
    .populate('moves')
    .exec (err, result) ->
      if err
        return res.json 400,
          success: no
          message: "No game for user by that ID"
      else
        return res.json
          success: yes
          payload: result

exports.move = (req, res) ->
  ###
  Manages moves made by players and adjusts the game state
  ###
  if req.method is "POST"

    gameId = req.params["gameId"]
    moveType = req.body["move"]

    if !moveType?
      return res.json 400,
        success: no
        message: "Form is invalid"

    ###
    # User confirmation
    ###
    models.Game.findOne {"_id": gameId}, (err, result) ->
      if err
        return res.json 400,
          success: no
          message: "No game by that ID"
      else
        game = result

        #need to convert to string, so not comparing mongo objectIDs
        if req.user._id.toString() is game.player1.toString()
            playerIndex = 0
        else if req.user._id.toString() is game.player2.toString()
            playerIndex = 1
        else
          return res.json 400,
            success: no
            message: "No game for user by that ID"

        ###
        # Get the game and load it
        ###

        gameLogic = new logic.Game()
        gameLogic.loadData game.data

        console.log 'gameData', game.data, 'playerIndex', playerIndex

        #validate player's turn
        #then set thisPlayer in the game's context
        if gameLogic.currentRound.playerTurn isnt playerIndex
          return res.json 400,
            success: no
            message: "It isn't your turn"
        else
          gameLogic.thisPlayer = playerIndex

        console.log 'Player making their move'

        doesEndRound = gameLogic.makeMove moveType
        if doesEndRound
          gameLogic.evaluateResult()
          gameLogic.dealNextHand()

        move = new models.Move()
        move.gameId = game._id
        move.userId = req.user._id
        move.playerId = playerIndex
        move.moveType = moveType
        move.save()

        game.moves.push move

        if not game.isMultiplayer
          console.log 'Activating AI Logic, not a multiplayer game'
          ai = new logic.AI()
          aiThinking = yes
          while aiThinking is yes
            if gameLogic.currentRound.playerTurn isnt playerIndex
              console.log 'AI about to decide and execute a move'
              aiMove = ai.decide gameLogic.table.playerHands[1], gameLogic.table.playerHands[0]

              console.log 'AI decision', aiMove

              doesEndRound = gameLogic.makeMove aiMove
              if doesEndRound
                console.log 'AI decision ended the round'
                gameLogic.evaluateResult()
                gameLogic.dealNextHand()

              move = new models.Move()
              move.gameId = game._id
              move.userId = null
              move.playerId = 1
              move.moveType = moveType
              move.save()

              game.moves.push move
            else
              console.log 'AI not deciding -- playerTurn:', gameLogic.currentRound.playerTurn
              aiThinking = no

        game.data = gameLogic.getSaveData()
        game.save()

        return res.json
          success: yes
          payload: null

  else
    return res.json 400,
      success: no
      payload: "Invalid request method"


exports.state = (req, res) ->
  ###
  This function returns the list of moves that have occurred in game
  and also returns any outstanding hints of the user the acknowledged/dismiss
  ###
  gameId = req.params["gameId"]
  sinceId = req.query["since"]

  models.Game.findOne {_id:gameId, $or:[{player1: req.user._id},{player2: req.user._id}]}, (err, result) ->
    if err
      return res.json 400,
        success: no
        message: "No game for user by that ID"
    else
      query = {gameId: models.Types.ObjectId.fromString(gameId)}

      if sinceId != "0"
        console.log 'sinceId', sinceId , typeof(sinceId)
        query._id = { $gt : models.Types.ObjectId.fromString(sinceId) }

      console.log 'moves query', query
      models.Move.find query, (err, result) ->
        if err
          return res.json 400,
            success: no
            message: "Error retrieving moves"
        else
          logged_moves = result

          data =
            moves: logged_moves

          return res.json
            success: yes
            payload: data


exports.quitEarly = (req, res) ->
  ###
    For handling when a user leaves their newly created game before finding a partner
  ###
  users_games = []
  #models.UserGame.objects.filter(game_id=game_id)
  playerIndex = 0
  found = no

  for user_game in users_games
    if user_game.user.id is req.user.id
      found = yes
      break
    else
      playerIndex += 1

  if not found
    return res.json 400,
      success: no
      message: "No game for user by that ID"

  game = users_games[0]
  if game.is_complete
    return res.json 400,
      success: no
      message: "This game is already completed/quit"

  #in this case we don't delete the game, we just set it to complete
  game.is_complete = yes
  game.is_aborted = yes
  game.save()

  now = Date()
  loggedMove = {}
  # new models.LoggedMove(game_id=game_id)
  loggedMove.move_type_id = MOVE_TYPE.QUIT
  loggedMove.user = request.user
  loggedMove.player_id = playerIndex
  #loggedMove.from_x = 0
  #loggedMove.from_y = 0
  #loggedMove.to_x = 0
  #loggedMove.to_y = 0
  #loggedMove.created_at = now
  loggedMove.save()

  return res.json
    success: yes
    payload: null
    message: "Successfull quit game"
