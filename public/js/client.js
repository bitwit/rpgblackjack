// Generated by CoffeeScript 1.6.1
var BattleRound, Card, CardPile, GAME_STATE, Game, MOVE_TYPE, Move, Player, PlayerCardPile, PlayerInventoryCardPile, Table, UnusedCardPile, UsedCardPile, appModule,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

MOVE_TYPE = {
  STAY: 1,
  HIT: 2,
  SPLIT: 3,
  BUST: 4,
  QUIT: 5
};

GAME_STATE = {
  NEW_GAME: 1,
  ROUND_START: 2,
  DEFENDER_MOVING: 3,
  ATTACKER_MOVING: 4,
  ROUND_END: 5,
  GAME_OVER: 6
};

Game = (function() {

  function Game() {
    this.table = new Table();
    this.players = [new Player(), new Player()];
    this.thisPlayer = 0;
    this.lastMoveId = 0;
    this.currentRound = null;
    this.state = GAME_STATE.NEW_GAME;
    this.moves = [];
    this.dealNextHand();
  }

  Game.prototype.getSaveData = function() {
    return {
      table: this.table.getSaveData(),
      state: this.state,
      currentRound: this.currentRound.getSaveData(),
      players: [this.players[0].getSaveData(), this.players[1].getSaveData()]
    };
  };

  Game.prototype.loadData = function(data) {
    var attackerHand, i, player, _i, _len, _ref;
    this.table.loadData(data.table);
    this.state = data.state;
    this.currentRound.loadData(data.currentRound);
    _ref = this.players;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      player = _ref[i];
      player.loadData(data.players[i]);
    }
    if (this.state === GAME_STATE.ATTACKER_MOVING) {
      attackerHand = this.table.playerHands[this.currentRound.playerTurn];
      return attackerHand.reveal();
    }
  };

  Game.prototype.dealNextHand = function() {
    var attackerHand, defenderHand, startingPlayer;
    if (this.state === GAME_STATE.GAME_OVER) {
      return;
    }
    this.state = GAME_STATE.ROUND_START;
    if (this.currentRound != null) {
      this.clearHand();
      startingPlayer = this.currentRound.playerTurn;
    } else {
      startingPlayer = 0;
    }
    defenderHand = this.table.playerHands[startingPlayer];
    attackerHand = this.table.playerHands[Number(!startingPlayer)];
    attackerHand.isRevealingAll = false;
    defenderHand.push(this.table.unusedPile.takeNextCard());
    attackerHand.push(this.table.unusedPile.takeNextCard());
    defenderHand.push(this.table.unusedPile.takeNextCard());
    attackerHand.push(this.table.unusedPile.takeNextCard());
    this.currentRound = new BattleRound(startingPlayer);
    return this.state = GAME_STATE.DEFENDER_MOVING;
  };

  Game.prototype.makeMove = function(move) {
    var attackerHand, card, playerHand;
    if (this.state === GAME_STATE.GAME_OVER) {
      return;
    }
    this.moves.push(new Move(this.currentRound.playerTurn, move));
    switch (move) {
      case MOVE_TYPE.HIT:
        card = this.table.unusedPile.takeNextCard();
        playerHand = this.table.playerHands[this.currentRound.playerTurn];
        playerHand.push(card);
        if (playerHand.value() > 21) {
          this.currentRound.endPlayerTurn();
        }
        break;
      case MOVE_TYPE.STAY:
        this.currentRound.endPlayerTurn();
        break;
      default:
        null;
    }
    if (this.currentRound.isOver) {
      return true;
    } else {
      this.state = GAME_STATE.ATTACKER_MOVING;
      attackerHand = this.table.playerHands[this.currentRound.playerTurn];
      attackerHand.reveal();
      return false;
    }
  };

  Game.prototype.evaluateResult = function() {
    var hpLost, player1, player1HandValue, player2, player2HandValue;
    player1 = this.players[0];
    player1HandValue = this.table.playerHands[0].value();
    if (player1HandValue > 21) {
      player1HandValue = 0;
    }
    player2 = this.players[1];
    player2HandValue = this.table.playerHands[1].value();
    if (player2HandValue > 21) {
      player2HandValue = 0;
    }
    if (player1HandValue > player2HandValue) {
      hpLost = player1HandValue - player2HandValue;
      if (hpLost > 11) {
        hpLost = 11;
      }
      player2.takeDamage(hpLost);
    } else if (player2HandValue > player1HandValue) {
      hpLost = player2HandValue - player1HandValue;
      if (hpLost > 11) {
        hpLost = 11;
      }
      player1.takeDamage(hpLost);
    } else {
      console.log('tie round, no damage');
    }
    if (player1.hp === 0 || player2.hp === 0) {
      return this.state = GAME_STATE.GAME_OVER;
    }
  };

  Game.prototype.clearHand = function() {
    var card, cards, hand, _i, _len, _ref, _results;
    _ref = this.table.playerHands;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      hand = _ref[_i];
      cards = hand.takeAllCards();
      _results.push((function() {
        var _j, _len1, _results1;
        _results1 = [];
        for (_j = 0, _len1 = cards.length; _j < _len1; _j++) {
          card = cards[_j];
          _results1.push(this.table.usedPile.push(card));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  return Game;

})();

/* --------------------------------------------
     Begin Card.coffee
--------------------------------------------
*/


Card = (function() {

  function Card(value, suit) {
    this.value = value;
    this.suit = suit;
    this.currentPile = null;
    this.isFlipped = false;
  }

  Card.prototype.getSaveData = function() {
    return {
      value: this.value,
      suit: this.suit
    };
  };

  Card.prototype.loadData = function(data) {
    this.value = data.value;
    return this.suit = data.suit;
  };

  return Card;

})();

/* --------------------------------------------
     Begin CardPile.coffee
--------------------------------------------
*/


CardPile = (function() {

  function CardPile() {
    this.cards = [];
  }

  CardPile.prototype.shuffle = function() {
    /*
    Fisher Yates Shuffle algorithm for arrays
    */

    var i, j, tempi, tempj, _results;
    i = this.cards.length;
    if (i === 0) {
      return false;
    }
    _results = [];
    while (--i) {
      j = Math.floor(Math.random() * (i + 1));
      tempi = this.cards[i];
      tempj = this.cards[j];
      this.cards[i] = tempj;
      _results.push(this.cards[j] = tempi);
    }
    return _results;
  };

  CardPile.prototype.push = function(card) {
    card.currentPile = this;
    return this.cards.push(card);
  };

  CardPile.prototype.takeNextCard = function() {
    return this.cards.shift();
  };

  CardPile.prototype.takeAllCards = function() {
    return this.cards.splice(0);
  };

  CardPile.prototype.getSaveData = function() {
    var card, cards, _i, _len, _ref;
    cards = [];
    _ref = this.cards;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card = _ref[_i];
      cards.push(card.getSaveData());
    }
    return {
      cards: cards
    };
  };

  CardPile.prototype.loadData = function(data) {
    var card, _i, _len, _ref, _results;
    this.cards.length = 0;
    _ref = data.cards;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card = _ref[_i];
      card = new Card(card.value, card.suit);
      _results.push(this.push(card));
    }
    return _results;
  };

  return CardPile;

})();

UnusedCardPile = (function(_super) {

  __extends(UnusedCardPile, _super);

  function UnusedCardPile() {
    UnusedCardPile.__super__.constructor.call(this);
    this.name = "unused";
  }

  return UnusedCardPile;

})(CardPile);

UsedCardPile = (function(_super) {

  __extends(UsedCardPile, _super);

  function UsedCardPile() {
    UsedCardPile.__super__.constructor.call(this);
    this.name = "used";
  }

  UsedCardPile.prototype.push = function(card) {
    UsedCardPile.__super__.push.call(this, card);
    return card.isFlipped = false;
  };

  return UsedCardPile;

})(CardPile);

PlayerCardPile = (function(_super) {

  __extends(PlayerCardPile, _super);

  function PlayerCardPile(name, index) {
    this.name = name;
    this.index = index;
    PlayerCardPile.__super__.constructor.call(this);
    this.isRevealingAll = true;
  }

  PlayerCardPile.prototype.push = function(card) {
    PlayerCardPile.__super__.push.call(this, card);
    if (this.isRevealingAll || this.cards.length === 1) {
      return card.isFlipped = true;
    }
  };

  PlayerCardPile.prototype.reveal = function() {
    var card, _i, _len, _ref, _results;
    this.isRevealingAll = true;
    _ref = this.cards;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card = _ref[_i];
      _results.push(card.isFlipped = true);
    }
    return _results;
  };

  PlayerCardPile.prototype.value = function() {
    var aceCount, card, handValue, i, _i, _j, _len, _ref;
    if (!this.cards.length) {
      return 0;
    }
    if (!this.isRevealingAll) {
      return "?";
    }
    handValue = 0;
    aceCount = 0;
    _ref = this.cards;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card = _ref[_i];
      switch (card.value) {
        case "A":
          aceCount++;
          break;
        case "J":
        case "Q":
        case "K":
          handValue += 10;
          break;
        default:
          handValue += card.value;
      }
    }
    if (aceCount != null) {
      for (i = _j = 0; 0 <= aceCount ? _j < aceCount : _j > aceCount; i = 0 <= aceCount ? ++_j : --_j) {
        if (handValue <= 10) {
          handValue += 11;
        } else {
          handValue += 1;
        }
      }
    }
    return handValue;
  };

  return PlayerCardPile;

})(CardPile);

PlayerInventoryCardPile = (function(_super) {

  __extends(PlayerInventoryCardPile, _super);

  function PlayerInventoryCardPile() {
    return PlayerInventoryCardPile.__super__.constructor.apply(this, arguments);
  }

  return PlayerInventoryCardPile;

})(CardPile);

/* --------------------------------------------
     Begin Player.coffee
--------------------------------------------
*/


Player = (function() {

  function Player() {
    this.hp = 20;
    this.maxHp = 20;
  }

  Player.prototype.getHp = function() {
    return this.hp;
  };

  Player.prototype.takeDamage = function(dmg) {
    console.log('Player Taking Damage', dmg);
    this.hp -= dmg;
    if (this.hp < 0) {
      return this.hp = 0;
    }
  };

  Player.prototype.getSaveData = function() {
    return {
      hp: this.hp,
      maxHp: this.maxHp
    };
  };

  Player.prototype.loadData = function(data) {
    this.hp = data.hp;
    return this.maxHp = data.maxHp;
  };

  return Player;

})();

/* --------------------------------------------
     Begin BattleRound.coffee
--------------------------------------------
*/


BattleRound = (function() {

  function BattleRound(playerTurn) {
    this.isOver = false;
    this.playerTurn = playerTurn;
    this.playerCompleteStatuses = [false, false];
  }

  BattleRound.prototype.endPlayerTurn = function() {
    this.playerCompleteStatuses[this.playerTurn] = true;
    if (this.playerCompleteStatuses[0] && this.playerCompleteStatuses[1]) {
      return this.isOver = true;
    } else {
      return this.playerTurn = Number(!this.playerTurn);
    }
  };

  BattleRound.prototype.getSaveData = function() {
    return {
      isOver: this.isOver,
      playerTurn: this.playerTurn,
      playerCompleteStatuses: this.playerCompleteStatuses
    };
  };

  BattleRound.prototype.loadData = function(data) {
    this.isOver = data.isOver;
    this.playerTurn = data.playerTurn;
    return this.playerCompleteStatuses = data.playerCompleteStatuses;
  };

  return BattleRound;

})();

/* --------------------------------------------
     Begin Move.coffee
--------------------------------------------
*/


Move = (function() {

  function Move(player, move_type) {
    this.player = player;
    this.move_type = move_type;
    this.date = Date();
  }

  return Move;

})();

/* --------------------------------------------
     Begin Table.coffee
--------------------------------------------
*/


Table = (function() {

  function Table() {
    var card, suit, value, _i, _j, _len, _len1, _ref, _ref1;
    this.suits = ["spades", "clubs", "diamonds", "hearts"];
    this.values = [2, 3, 4, 5, 6, 7, 8, 9, 10].concat(["J", "Q", "K", "A"]);
    this.allCards = [];
    this.unusedPile = new UnusedCardPile();
    this.usedPile = new UsedCardPile();
    this.playerHands = [new PlayerCardPile("player1", 0), new PlayerCardPile("player2", 1)];
    this.playerInventories = [new PlayerInventoryCardPile(), new PlayerInventoryCardPile()];
    _ref = this.suits;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      suit = _ref[_i];
      _ref1 = this.values;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        value = _ref1[_j];
        card = new Card(value, suit);
        this.allCards.push(card);
        this.unusedPile.push(card);
      }
    }
    this.unusedPile.shuffle();
  }

  Table.prototype.getSaveData = function() {
    return {
      unusedPile: this.unusedPile.getSaveData(),
      usedPile: this.usedPile.getSaveData(),
      playerHands: [this.playerHands[0].getSaveData(), this.playerHands[1].getSaveData()]
    };
  };

  Table.prototype.loadData = function(data) {
    var card, i, playerHand, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
    this.allCards.length = 0;
    this.unusedPile.loadData(data.unusedPile);
    _ref = this.unusedPile.cards;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card = _ref[_i];
      this.allCards.push(card);
    }
    this.usedPile.loadData(data.usedPile);
    _ref1 = this.usedPile;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      card = _ref1[_j];
      this.allCards.push(card);
    }
    _ref2 = this.playerHands;
    _results = [];
    for (i = _k = 0, _len2 = _ref2.length; _k < _len2; i = ++_k) {
      playerHand = _ref2[i];
      playerHand.loadData(data.playerHands[i]);
      _results.push((function() {
        var _l, _len3, _ref3, _results1;
        _ref3 = playerHand.cards;
        _results1 = [];
        for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
          card = _ref3[_l];
          _results1.push(this.allCards.push(card));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  return Table;

})();

/* --------------------------------------------
     Begin client.coffee
--------------------------------------------
*/


appModule = angular.module('appModule', ['ngResource']);

appModule.controller('AppController', [
  '$scope', '$timeout', 'sharedApplication', function($scope, $timeout, sharedApp) {
    console.log('AppController setup');
    return $scope.windowSize = function() {
      var height, increase, size, width, windowHeight, windowWidth;
      windowWidth = window.innerWidth;
      windowHeight = window.innerHeight;
      height = windowHeight;
      width = windowWidth;
      size = 1.0;
      if (width > 320) {
        increase = (width / 320) - 1;
        increase /= 3;
        size += increase;
      }
      size = Math.round(size * 100);
      return {
        "font-size": size + "%",
        height: height + "px",
        width: width + "px"
      };
    };
  }
]);

appModule.controller('HomeController', [
  '$scope', '$http', 'sharedApplication', function($scope, $http, sharedApp) {
    $scope.username = null;
    $scope.avatar = null;
    $scope.currentStage = "username";
    $scope.avatars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    $scope.confirmUsername = function() {
      console.log('confirming Username', $scope.username);
      return $scope.currentStage = "avatar";
    };
    $scope.confirmAvatar = function(index) {
      $scope.avatar = "avatar-" + index + ".png";
      return $scope.createNewUser();
    };
    return $scope.createNewUser = function() {
      $scope.currentStage = "loading";
      return $http({
        url: "/api/users/new",
        method: "POST",
        data: {
          username: $scope.username,
          avatar: $scope.avatar
        },
        headers: {
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).error(function(response) {
        return console.log('error while trying to create new user', response);
      }).success(function(response) {
        console.log('success creating new user', response);
        localStorage.userId = response.payload._id;
        localStorage.username = response.payload.username;
        $http.defaults.headers = {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        };
        return sharedApp.changePath('/lobby/');
      });
    };
  }
]);

/*
This directive is for the game lobby
*/


appModule.controller('LobbyController', [
  "$scope", "$http", "sharedApplication", function($scope, $http, sharedApp) {
    $scope.username = localStorage.username;
    $scope.games = [];
    $scope.isInRoom = false;
    $scope.waitingGameId = null;
    $scope.waitingInterval = null;
    $scope.waitingIncrement = 5000;
    $scope.isChecking = false;
    $scope.refreshRooms = function() {
      return $http({
        method: "GET",
        url: "/api/games/rooms/",
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).success(function(response) {
        return $scope.games = response.payload;
        /*
        #TODO: dont let people join their own games
        for game in $scope.games
          if game.playerName is sharedApp.user.username
            $scope.startWaiting game.id
        */

      });
    };
    $scope.refreshRooms();
    $scope.newUser = function() {
      delete localStorage.userId;
      return sharedApp.changePath('/');
    };
    $scope.singlePlayer = function() {
      return $scope.createNewGame(false);
    };
    $scope.newRoom = function() {
      return $scope.createNewGame(true);
    };
    $scope.cancelRoom = function() {
      if (!$scope.isInRoom) {
        return;
      }
      clearInterval($scope.waitingInterval);
      return $http({
        method: "GET",
        url: "/api/games/cancel/" + $scope.waitingGameId,
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).success(function(response) {
        $scope.isInRoom = false;
        $scope.waitingGameId = null;
        return $scope.refreshRooms();
      }).error(function(response) {
        alert("Error while cancelling game ->" + response.message);
        $scope.isInRoom = false;
        $scope.waitingGameId = null;
        return $scope.refreshRooms();
      });
    };
    $scope.joinGame = function(game) {
      return $http({
        method: "POST",
        url: "/api/games/join/" + game._id,
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).success(function(response) {
        return sharedApp.changePath("/game/" + response.payload._id);
      });
    };
    $scope.startWaiting = function(game_id) {
      $scope.isInRoom = true;
      $scope.waitingGameId = game_id;
      return $scope.waitingInterval = setInterval($scope.checkGameState, $scope.waitingIncrement);
    };
    $scope.checkGameState = function() {
      console.log('check game state');
      if ($scope.isChecking) {
        return;
      }
      $scope.isChecking = true;
      $http({
        method: "GET",
        url: "/api/games/get/" + $scope.waitingGameId,
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).success(function(response) {
        console.log('lobby checking game state', response);
        if (response.payload.userCount === 2) {
          clearInterval($scope.waitingInterval);
          sharedApp.changePath("/game/" + response.payload._id);
        }
        return $scope.isChecking = false;
      }).error(function(response) {
        clearInterval($scope.waitingInterval);
        $scope.isChecking = false;
        return alert(response.message);
      });
      return $scope.$apply();
    };
    return $scope.createNewGame = function(isMultiplayer) {
      return $http({
        method: "POST",
        url: "/api/games/new/",
        data: {
          isMultiplayer: isMultiplayer
        },
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).success(function(response) {
        if (!isMultiplayer) {
          return sharedApp.changePath("/game/" + response.payload._id);
        } else {
          return $scope.startWaiting(response.payload._id);
        }
      }).error(function(response) {
        return alert(response.message);
      });
    };
  }
]);

appModule.controller('GameController', [
  '$scope', '$timeout', '$http', 'gameModel', function($scope, $timeout, $http, gameModel) {
    $scope.game = null;
    $scope.checkInterval = null;
    $scope.checkIncrement = 2000;
    $scope.isChecking = false;
    $scope.lastMoveId = 0;
    $scope.moves = [];
    $scope.queuedMoves = [];
    (function() {
      var playerIndex;
      if ($scope.game != null) {
        return;
      }
      $scope.game = new Game();
      $scope.game.loadData(gameModel.data);
      $scope.moves = gameModel.moves;
      try {
        $scope.lastMoveId = gameModel.moves[gameModel.moves.length - 1]._id;
      } catch (e) {
        $scope.lastMoveId = 0;
      }
      try {
        if (localStorage.userId === gameModel.player1._id.toString()) {
          playerIndex = 0;
        } else if (localStorage.userId === gameModel.player2._id.toString()) {
          playerIndex = 1;
        }
      } catch (e) {
        playerIndex = 0;
      }
      $scope.game.thisPlayer = playerIndex;
      return console.log('initialized game', $scope.game);
    })();
    $scope.startChecker = function() {
      return $scope.checkInterval = $timeout(function() {
        return $scope.checkGameState();
      }, $scope.checkIncrement);
    };
    $scope.startChecker();
    /*
     Server sync related
    */

    $scope.checkGameState = function() {
      if ($scope.queuedMoves.length > 0) {
        $scope.applyNextQueuedMove();
        $scope.startChecker();
        return;
      }
      if ($scope.isChecking) {
        $scope.startChecker();
        return;
      }
      $scope.isChecking = true;
      return $scope.getLatestState();
    };
    $scope.getLatestState = function() {
      return $http({
        method: "GET",
        url: "/api/games/state/" + gameModel._id + "?since=" + $scope.lastMoveId,
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).error(function(response) {
        console.error('error while checking game state');
        $scope.isChecking = false;
        return $scope.startChecker();
      }).success(function(response) {
        var move, _i, _len, _ref;
        if (response.payload.moves.length === 0) {
          $scope.isChecking = false;
          $scope.startChecker();
          return;
        }
        _ref = response.payload.moves;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          move = _ref[_i];
          $scope.queuedMoves.push(move);
          $scope.lastMoveId = move._id;
        }
        $scope.isAnimating = true;
        return $scope.applyNextQueuedMove();
      });
    };
    $scope.applyNextQueuedMove = function() {
      var doesEndRound, move;
      move = $scope.queuedMoves.shift();
      doesEndRound = $scope.game.makeMove(move.moveType);
      if (doesEndRound) {
        $scope.game.evaluateResult();
        $scope.game.dealNextHand();
      }
      $scope.moves.push(move);
      $scope.isChecking = false;
      return $scope.startChecker();
    };
    $scope.playerHit = function() {
      return $scope.sendMoveToServer(MOVE_TYPE.HIT);
    };
    $scope.playerStay = function() {
      return $scope.sendMoveToServer(MOVE_TYPE.STAY);
    };
    $scope.playerSplit = function() {
      return $scope.sendMoveToServer(MOVE_TYPE.SPLIT);
    };
    $scope.sendMoveToServer = function(move) {
      return $http({
        url: '/api/games/move/' + gameModel._id,
        method: 'POST',
        data: {
          move: move
        },
        headers: {
          "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
          "Content-Type": "application/json;charset=UTF-8"
        }
      }).error(function(response) {
        return console.log('error while moving', response);
      }).success(function(response) {
        return console.log('move success', response);
      });
    };
    /*
     View related responses
    */

    $scope.cardStyles = function(card) {
      var fontSize, i, pileCard, position, _i, _len, _ref;
      if (card.currentPile == null) {
        return null;
      } else {
        fontSize = 16;
        switch (card.currentPile.name) {
          case "used":
            return {
              top: 160 / fontSize + "em",
              left: 230 / fontSize + "em"
            };
          case "unused":
            return {
              top: 160 / fontSize + "em",
              left: 10 / fontSize + "em"
            };
          case "player1":
            if ($scope.game.thisPlayer === 0) {
              position = {
                top: 290,
                left: 115
              };
            } else {
              position = {
                top: 10,
                left: 115
              };
            }
            break;
          case "player2":
            if ($scope.game.thisPlayer === 0) {
              position = {
                top: 10,
                left: 115
              };
            } else {
              position = {
                top: 290,
                left: 115
              };
            }
            break;
          default:
            return null;
        }
        _ref = card.currentPile.cards;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          pileCard = _ref[i];
          if (pileCard === card) {
            return {
              "top": position.top / fontSize + "em",
              "left": (position.left + (i * 30 - card.currentPile.cards.length * 25)) / fontSize + "em",
              "z-index": i
            };
          }
        }
      }
    };
    $scope.hpBarStyles = function(isMe) {
      var index, player;
      if (isMe) {
        player = $scope.game.players[$scope.game.thisPlayer];
      } else {
        index = $scope.game.thisPlayer === 1 ? 0 : 1;
        player = $scope.game.players[index];
      }
      return {
        width: Math.round(100 * (player.hp / player.maxHp)) + "%"
      };
    };
    $scope.playerHp = function(isMe) {
      var index, player;
      if (isMe) {
        player = $scope.game.players[$scope.game.thisPlayer];
      } else {
        index = $scope.game.thisPlayer === 1 ? 0 : 1;
        player = $scope.game.players[index];
      }
      return player.getHp();
    };
    $scope.handValue = function(isMe) {
      var hand, handValue, index;
      if (isMe) {
        hand = $scope.game.table.playerHands[$scope.game.thisPlayer];
      } else {
        index = $scope.game.thisPlayer === 1 ? 0 : 1;
        hand = $scope.game.table.playerHands[index];
      }
      handValue = hand.value();
      if (handValue > 21) {
        handValue = "BUST";
      }
      return handValue;
    };
    $scope.avatar = function(isMe) {
      var index;
      if (isMe) {
        index = $scope.game.thisPlayer === 1 ? "player2" : "player1";
      } else {
        if (!gameModel.isMultiplayer) {
          return "/img/avatar-1.png";
        }
        index = $scope.game.thisPlayer === 1 ? "player1" : "player2";
      }
      return "/img/" + gameModel[index].avatar;
    };
    return $scope.username = function(isMe) {
      var index;
      if (isMe) {
        index = $scope.game.thisPlayer === 1 ? "player2" : "player1";
      } else {
        if (!gameModel.isMultiplayer) {
          return "Computer";
        }
        index = $scope.game.thisPlayer === 1 ? "player1" : "player2";
      }
      return gameModel[index].username;
    };
  }
]);

appModule.factory("sharedApplication", [
  "$rootScope", "$http", "$location", "$route", "$routeParams", function($rootScope, $http, $location, $route, $routeParams) {
    var sharedApp;
    sharedApp = {};
    sharedApp.changePath = function(path) {
      return $location.path(path);
    };
    sharedApp.rootScope = $rootScope;
    /*
    # rootscope setup
    */

    $rootScope.currentView = "menus";
    $rootScope.isSoundEnabled = true;
    $rootScope.isMusicEnabled = true;
    $rootScope.toggleSound = function() {
      return $rootScope.isSoundEnabled = !$rootScope.isSoundEnabled;
    };
    $rootScope.soundStatus = function() {
      if ($rootScope.isSoundEnabled) {
        return "On";
      } else {
        return "Off";
      }
    };
    $rootScope.toggleMusic = function() {
      return $rootScope.isMusicEnabled = !$rootScope.isMusicEnabled;
    };
    $rootScope.musicStatus = function() {
      if ($rootScope.isMusicEnabled) {
        return "On";
      } else {
        return "Off";
      }
    };
    $rootScope.mainMenu = function() {
      return sharedApp.changePath("/dashboard/");
    };
    $rootScope.$on("$routeChangeSuccess", function($currentRoute, $previousRoute) {
      var renderAction;
      console.log('route change success');
      try {
        return renderAction = $route.current.action;
      } catch (e) {

      }
    });
    return sharedApp;
  }
]);

/* --------------------------------------------
     Begin routing.coffee
--------------------------------------------
*/


appModule.config([
  '$routeProvider', function($routeProvider) {
    $routeProvider.when('/home/', {
      action: 'checkStatus',
      templateUrl: '/template/home',
      controller: 'HomeController',
      resolve: {
        loginStatus: [
          "$q", "sharedApplication", function($q, sharedApp) {
            var deferred;
            deferred = $q.defer();
            if (localStorage.userId != null) {
              deferred.reject('already signed up');
              return sharedApp.changePath('/lobby/');
            } else {
              return deferred.resolve(true);
            }
          }
        ]
      }
    }).when('/lobby/', {
      action: 'confirmLogin',
      templateUrl: '/template/lobby',
      controller: 'LobbyController',
      resolve: {
        loginStatus: [
          "$q", "sharedApplication", function($q, sharedApp) {
            var deferred;
            deferred = $q.defer();
            if (localStorage.userId != null) {
              return deferred.resolve(true);
            } else {
              deferred.reject('not signed up yet');
              return sharedApp.changePath('/home/');
            }
          }
        ]
      }
    }).when('/game/test', {
      controller: 'GameController',
      templateUrl: '/template/game'
    }).when('/game/:gameId/', {
      action: 'confirmLogin',
      controller: 'GameController',
      templateUrl: '/template/game',
      resolve: {
        loginStatus: [
          "$q", "sharedApplication", function($q, sharedApp) {
            var deferred;
            deferred = $q.defer();
            if (localStorage.userId != null) {
              return deferred.resolve(true);
            } else {
              deferred.reject('not signed up yet');
              return sharedApp.changePath('/home/');
            }
          }
        ],
        gameModel: [
          "$q", "$route", "$http", "sharedApplication", function($q, $route, $http, sharedApp) {
            var deferred, gameId;
            deferred = $q.defer();
            gameId = $route.current.params.gameId;
            $http({
              method: "GET",
              url: "/api/games/get/" + gameId + "/",
              headers: {
                "Authorization": "Basic " + Base64.encode(localStorage.userId + ":password"),
                "Content-Type": "application/json;charset=UTF-8"
              }
            }).success(function(response) {
              var message;
              if (response.payload.isComplete) {
                message = "This game is already completed/quit";
                deferred.reject(message);
                alert(message);
                return sharedApp.changePath("/dashboard/");
              } else {
                return deferred.resolve(response.payload);
              }
            }).error(function(response) {
              deferred.reject(response.message);
              alert(response.message);
              return sharedApp.changePath("/dashboard/");
            });
            return deferred.promise;
          }
        ]
      }
    });
    return $routeProvider.otherwise({
      redirectTo: '/home/',
      action: 'checkStatus'
    });
  }
]);
