appModule.config ['$routeProvider', ($routeProvider) ->
  $routeProvider
    .when '/home/',
      action: 'checkStatus'
      templateUrl: '/template/home'
      controller: 'HomeController'
      resolve:
        loginStatus: ["$q", "sharedApplication", ($q, sharedApp) ->
          deferred = $q.defer()
          if localStorage.userId?
            deferred.reject 'already signed up'
            sharedApp.changePath '/lobby/'
          else
            deferred.resolve yes
        ]
    .when '/lobby/',
      action: 'confirmLogin'
      templateUrl: '/template/lobby'
      controller: 'LobbyController'
      resolve:
        loginStatus: ["$q", "sharedApplication", ($q, sharedApp) ->
          deferred = $q.defer()
          if localStorage.userId?
            deferred.resolve yes
          else
            deferred.reject 'not signed up yet'
            sharedApp.changePath '/home/'
        ]
    .when '/game/test',
      controller: 'GameController'
      templateUrl: '/template/game'
    .when '/game/:gameId/',
      action: 'confirmLogin'
      controller: 'GameController'
      templateUrl: '/template/game'
      resolve:
        loginStatus: ["$q", "sharedApplication", ($q, sharedApp) ->
          deferred = $q.defer()
          if localStorage.userId?
            deferred.resolve yes
          else
            deferred.reject 'not signed up yet'
            sharedApp.changePath '/home/'
        ]
        gameModel: ["$q", "$route", "$http", "sharedApplication", ($q, $route, $http, sharedApp) ->
          deferred = $q.defer()
          gameId = $route.current.params.gameId
          $http(
            method: "GET"
            url: "/api/games/get/#{gameId}/"
            headers:
              "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password")
              "Content-Type": "application/json;charset=UTF-8"
          )
            .success (response) ->
              if response.payload.isComplete
                message = "This game is already completed/quit"
                deferred.reject message
                alert message
                sharedApp.changePath "/dashboard/"
              else
                deferred.resolve response.payload

            .error (response) ->
              deferred.reject response.message
              alert response.message
              sharedApp.changePath "/dashboard/"

          return deferred.promise
        ]

  $routeProvider
    .otherwise
      redirectTo: '/home/'
      action: 'checkStatus'
]
