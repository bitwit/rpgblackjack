appModule = angular.module 'appModule', ['ngResource']

#@codekit-prepend "../../node_modules/game/classes/Game.coffee"
#@codekit-prepend "../../node_modules/game/classes/Card.coffee"
#@codekit-prepend "../../node_modules/game/classes/CardPile.coffee"
#@codekit-prepend "../../node_modules/game/classes/Player.coffee"
#@codekit-prepend "../../node_modules/game/classes/BattleRound.coffee"
#@codekit-prepend "../../node_modules/game/classes/Move.coffee"
#@codekit-prepend "../../node_modules/game/classes/Table.coffee"

#@codekit-append "routing.coffee"

appModule.controller 'AppController', ['$scope', '$timeout', 'sharedApplication', ($scope, $timeout, sharedApp) ->
  console.log 'AppController setup'
]

appModule.controller 'HomeController', ['$scope', '$http', 'sharedApplication', ($scope, $http, sharedApp) ->
  $scope.username = null
  $scope.avatar = null
  $scope.currentStage = "username"
  $scope.avatars = [0...12] #12 options

  $scope.confirmUsername = ->
    console.log 'confirming Username', $scope.username
    $scope.currentStage = "avatar"

  $scope.confirmAvatar = (index) ->
    $scope.avatar = "avatar-#{index}.png"
    $scope.createNewUser()

  $scope.createNewUser = ->
    $scope.currentStage = "loading"
    $http(
      url: "/api/users/new"
      method: "POST"
      data:
        username: $scope.username
        avatar: $scope.avatar
    )
    .error (response) ->
      console.log 'error while trying to create new user', response
    .success (response) ->
      console.log 'success creating new user', response
      localStorage.userId = response.payload._id
      localStorage.username = response.payload.username
      $http.defaults.headers =
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")

      sharedApp.changePath '/lobby/'

]

###
This directive is for the game lobby
###
appModule.controller 'LobbyController', [ "$scope", "$http", "sharedApplication", ($scope, $http, sharedApp) ->

  $scope.username = localStorage.username

  $scope.games = []
  $scope.isInRoom = false

  $scope.waitingGameId = null
  $scope.waitingInterval = null
  $scope.waitingIncrement = 5000 #5 seconds
  $scope.isChecking = false

  $scope.refreshRooms = ->
    $http(
      method: "GET"
      url: "/api/games/rooms/"
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
    .success (response) ->
      $scope.games = response.payload
      ###
      #TODO: dont let people join their own games
      for game in $scope.games
        if game.playerName is sharedApp.user.username
          $scope.startWaiting game.id
      ###

  $scope.refreshRooms() #call immediately

  $scope.singlePlayer = ->
    $scope.createNewGame false

  $scope.newRoom = ->
    $scope.createNewGame true

  $scope.cancelRoom = ->
    if not $scope.isInRoom then return

    clearInterval $scope.waitingInterval
    $http(
      method: "GET"
      url: "/api/games/cancel/#{$scope.waitingGameId}"
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
      .success (response) ->
        $scope.isInRoom = false
        $scope.waitingGameId = null
        $scope.refreshRooms()
      .error (response) ->
        alert("Error while cancelling game ->" + response.message)
        $scope.isInRoom = false
        $scope.waitingGameId = null
        $scope.refreshRooms()


  $scope.joinGame = (game) ->
    $http(
      method: "POST"
      url: "/api/games/join/#{game._id}"
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
    .success (response) ->
      sharedApp.changePath "/game/#{response.payload._id}"

  $scope.startWaiting = (game_id) ->
    $scope.isInRoom = true
    $scope.waitingGameId = game_id
    $scope.waitingInterval = setInterval $scope.checkGameState, $scope.waitingIncrement

  $scope.checkGameState = ->
    console.log 'check game state'
    if $scope.isChecking then return
    $scope.isChecking = true

    $http(
      method: "GET"
      url: "/api/games/get/#{$scope.waitingGameId}"
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
    .success (response) ->
      console.log 'lobby checking game state', response

      if response.payload.userCount is 2
        clearInterval $scope.waitingInterval
        sharedApp.changePath "/game/#{response.payload._id}"
      $scope.isChecking = false
    .error (response) ->
      clearInterval $scope.waitingInterval
      $scope.isChecking = false
      alert(response.message)

    $scope.$apply()


  $scope.createNewGame = (isMultiplayer) ->
    $http(
      method: "POST"
      url: "/api/games/new/"
      data:
        isMultiplayer: isMultiplayer
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
        "Content-Type" : "application/json;charset=UTF-8"
    )
    .success (response) ->
      if not isMultiplayer
        sharedApp.changePath "/game/#{response.payload._id}"
      else
        $scope.startWaiting(response.payload._id)
    .error (response) ->
      alert(response.message)
]

appModule.controller 'GameController', ['$scope', '$timeout', '$http' , 'gameModel', ($scope, $timeout, $http, gameModel) ->

  #Game Logic
  $scope.game = null

  #Server checking timer
  $scope.checkInterval = null
  $scope.checkIncrement = 2000 #2 seconds
  $scope.isChecking = false

  #Move Queueing
  $scope.lastMoveId = 0 #no moves listed yet
  $scope.moves = [] #array of moves as they were made in DESC order
  $scope.queuedMoves = [] #moves to be animated

  (->  #init
    if $scope.game?
      return

    $scope.game = new Game()
    $scope.game.loadData gameModel.data
    $scope.moves = gameModel.moves
    try
      $scope.lastMoveId = gameModel.moves[(gameModel.moves.length - 1)]._id
    catch e
      $scope.lastMoveId = 0

    if localStorage.userId is gameModel.player1
      playerIndex = 0
    else if localStorage.userId is gameModel.player2
      playerIndex = 1

    $scope.game.thisPlayer = playerIndex
    console.log 'initialized game', $scope.game
  )()

  $scope.startChecker = ->
    $scope.checkInterval = $timeout ->
      $scope.checkGameState()
    , $scope.checkIncrement

  $scope.startChecker()

  ###
   Server sync related
  ###

  $scope.checkGameState = ->
    if $scope.queuedMoves.length > 0
      $scope.applyNextQueuedMove()
      $scope.startChecker()
      return

    if $scope.isChecking
      $scope.startChecker()
      return

    $scope.isChecking = true
    $scope.getLatestState()

  $scope.getLatestState = ->
    $http(
      method: "GET"
      url: "/api/games/state/#{gameModel._id}?since=#{$scope.lastMoveId}"
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
      .error (response) ->
        console.error 'error while checking game state'
        $scope.isChecking = false
        $scope.startChecker()
      .success (response) ->

        if response.payload.moves.length is 0
          $scope.isChecking = false
          $scope.startChecker()
          return

        for move in response.payload.moves
          $scope.queuedMoves.push move
          $scope.lastMoveId = move._id

        $scope.isAnimating = true
        $scope.applyNextQueuedMove()

  $scope.applyNextQueuedMove = ->

    console.log 'queuedMoves', $scope.queuedMoves

    move = $scope.queuedMoves.shift()

    console.log 'performing move', move

    $scope.game.makeMove move.moveType

    $scope.moves.push move
    $scope.isChecking = false
    $scope.startChecker()


  ###
   View related responses
  ###

  $scope.cardStyles = (card) ->
    if !card.currentPile?
      return null
    else
      card.currentPile.cardPosition card

  $scope.hpBarStyles = (isMe) ->
    if isMe
      player = $scope.game.players[0]
    else
      player = $scope.game.players[1]
    return {
      width: Math.round(100 * (player.hp/player.maxHp) ) + "%"
    }

  $scope.playerHp = (isMe) ->
    if isMe
      player = $scope.game.players[0]
    else
      player = $scope.game.players[1]

    return player.getHp()

  $scope.handValue = (isMe) ->
    if isMe
      hand = $scope.game.table.playerHands[0]
    else
      hand = $scope.game.table.playerHands[1]

    handValue = hand.value()

    if handValue > 21
      handValue = "BUST"

    return handValue

  $scope.playerHit = ->
    #$scope.game.makeMove MOVE_TYPE.HIT
    $scope.sendMoveToServer MOVE_TYPE.HIT

  $scope.playerStay = ->
    #$scope.game.makeMove MOVE_TYPE.STAY
    $scope.sendMoveToServer MOVE_TYPE.STAY

  $scope.playerSplit = ->
    #$scope.game.makeMove MOVE_TYPE.SPLIT
    $scope.sendMoveToServer MOVE_TYPE.SPLIT

  $scope.sendMoveToServer = (move) ->
    $http(
      url: '/api/games/move/' + gameModel._id
      method: 'POST'
      data:
        move: move
      headers:
        "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
    )
    .error (response) ->
        console.log 'error while moving', response
    .success (response) ->
        console.log 'move success', response


]

appModule.factory "sharedApplication", ["$rootScope", "$http","$location", "$route", "$routeParams", ($rootScope, $http , $location, $route, $routeParams) ->
  ##
  #  Shared App Setup
  ##
  sharedApp = {}

  sharedApp.changePath = (path) ->
    $location.path path

  sharedApp.rootScope = $rootScope

  ###
  # rootscope setup
  ###
  $rootScope.currentView = "menus"

  $rootScope.isSoundEnabled = true
  $rootScope.isMusicEnabled = true

  $rootScope.toggleSound = ->
    $rootScope.isSoundEnabled = !$rootScope.isSoundEnabled

  $rootScope.soundStatus = ->
    if $rootScope.isSoundEnabled then "On" else "Off"

  $rootScope.toggleMusic = ->
    $rootScope.isMusicEnabled = !$rootScope.isMusicEnabled

  $rootScope.musicStatus = ->
    if $rootScope.isMusicEnabled then "On" else "Off"

  $rootScope.mainMenu = ->
    sharedApp.changePath "/dashboard/"


  $rootScope.$on "$routeChangeSuccess", ($currentRoute, $previousRoute) ->
    console.log 'route change success'
    try
      renderAction = $route.current.action
    catch e
      return #no use for this function

  return sharedApp
]