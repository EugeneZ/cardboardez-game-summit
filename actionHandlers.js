const _ = require('lodash');
const roles = require('./roles');
const { playerThinksTheyAre, forPlayer, throwFatalError, CENTER_WEREWOLF, WEREWOLF_ROLES_THAT_ARE_KNOWN, SEER_ROLES, ARTIFACTS } = require('./server');

const doAction = function (game, action) {
    if (!(this instanceof doAction)) {
        return new doAction(game, action);
    }

    const getPlayer = idOrPlayer => {
        return typeof idOrPlayer === 'string' ? game._players.find(p => p.id === idOrPlayer) : idOrPlayer;
    };

    const tasks = [],
        players = [],
        centers = [],
        mainPlayer = getPlayer(action.user.id);

    let peekedOrMovedCards = false;

    this.player = idOrPlayer => {
        players.push(getPlayer(idOrPlayer));
        return this;
    };

    this.center = index => {
        centers.push(index);
        return this;
    };

    this.swap = () => {
        tasks.push(() => {
            if (players.length > 1) {
                let unshieldedPlayers = players.filter(p => !p.shield);
                let next, last = unshieldedPlayers[unshieldedPlayers.length - 1]._hidden.role;
                unshieldedPlayers.forEach(player => {
                    if (last !== player._hidden.role) {
                        peekedOrMovedCards = true;
                    }
                    next = player._hidden.role;
                    player._hidden.role = last;
                    last = next;
                });
            } else if (players.length === 1 && centers.length === 1 && !players[0].shield) {
                peekedOrMovedCards = true;
                let temp = game._hidden.center[centers[0]];
                game._hidden.center[centers[0]] = players[0]._hidden.role;
                players[0]._hidden.role = temp;
            }
        });

        return this;
    };

    this.peek = cb => {
        peekedOrMovedCards = true;

        tasks.push(
            () => {
                let peekedAt = null;

                players.filter(p => !p.shield).forEach(
                    player => mainPlayer._private.peeked[player.id] = peekedAt = player._hidden.role
                );

                centers.forEach(
                    center => mainPlayer._private.peeked[center.toString()] = peekedAt = game._hidden.center[center]
                );

                if (peekedAt === null) {
                    throwFatalError({ user: mainPlayer.id });
                }

                if (typeof cb === 'function') {
                    cb(mainPlayer, peekedAt);
                }
            }
        );

        return this;
    };

    this.attributes = attributes => {
        tasks.push(() => players.forEach(player => _.merge(player, attributes)));
        return this;
    };

    this.reversePlayers = () => {
        tasks.push(() => players.reverse());
        return this;
    };

    this.do = () => {
        tasks.forEach(task => task());
        if (peekedOrMovedCards) {
            mainPlayer._private.peekedOrMovedCards = true;
        }
        return this;
    };

    return this;
};

function piAction(game, pick) {
    if (pick.target === pick.user.id) {
        throwFatalError(pick);
    }

    if (!pick.target) {
        return;
    }

    doAction(game, pick)
        .player(pick.target)
        .peek((player, peeked) => {
            if (peeked === null) {
                throwFatalError(pick);
            }

            if (['werewolf', 'tanner', 'vampire'].includes(peeked)) {
                player._private[peeked] = true;
                game._hidden.pi = peeked;
            }
        })
        .do();
}

const handlers = {
    doppleganger(game, pick){
        if (!pick.target || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .peek((player, peekedAt) => player._private.doppleganger = game._hidden.doppleganger = peekedAt)
            .do();
    },
    sentinel(game, pick) {
        if (pick.target && pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        if (!pick.target) {
            return;
        }

        doAction(game, pick)
            .player(pick.target)
            .attributes({ shield: true })
            .do();
    },

    alphaWolf(game, pick){
        if (!pick.target || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .center(CENTER_WEREWOLF)
            .swap()
            .do();
    },

    mysticWolf(game, pick){
        if (pick.target && pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        if (!pick.target) {
            return;
        }

        doAction(game, pick)
            .player(pick.target)
            .peek()
            .do();
    },

    thing(game, pick) {
        if (pick.target && pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        if (!pick.target) {
            return;
        }

        let currentPlayerIndex = _.findIndex(game._players, player => pick.user.id === player.id);
        let pickedPlayerIndex = _.findIndex(game._players, player => pick.user.id === pick.target);

        if (pickedPlayerIndex !== currentPlayerIndex - 1 || pickedPlayerIndex !== currentPlayerIndex + 1 ||
            (currentPlayerIndex === 0 && pickedPlayerIndex !== game._players.length - 1) ||
            (currentPlayerIndex === game._players.length - 1 && pickedPlayerIndex !== 0)) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .attributes({ _private: { tapped: true } })
            .do();
    },

    seer(game, pick) {
        if ((!_.isNil(pick.target1) && _.isNil(pick.target2)) || (_.isNil(pick.target1) && !_.isNil(pick.target2)) || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        if (!pick.target && _.isNil(pick.target1)) {
            return;
        }

        const action = doAction(game, pick);

        if (!_.isNil(pick.target1)) {
            action
                .center(parseInt(pick.target1, 10))
                .center(parseInt(pick.target2, 10));
        } else {
            action
                .player(pick.target);
        }

        action.peek().do();
    },

    apprenticeSeer(game, pick) {
        if (_.isNil(pick.target)) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .center(pick.target)
            .peek()
            .do();
    },

    paranormalInvestigator: piAction,

    paranormalInvestigator2(game, pick) {
        if (pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        let skip = false;
        forPlayer(pick.user.id, ({ _private: { werewolf, tanner, vampire } }) => {
            if (werewolf || tanner || vampire) {
                skip = true;
            }
        }, game);

        if (skip) {
            return;
        }

        piAction(game, pick);
    },

    robber(game, pick) {
        if (pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        if (!pick.target) {
            return;
        }

        doAction(game, pick)
            .player(pick.user.id)
            .player(pick.target)
            .swap()
            .do();

        doAction(game, pick)
            .player(pick.user.id)
            .peek()
            .do();
    },

    witch(game, pick){
        if (pick.target && pick.target.toString().length !== 1) {
            throwFatalError(pick);
        }

        if (_.isNil(pick.target)) {
            return;
        }

        doAction(game, pick)
            .center(pick.target)
            .peek()
            .do();
    },

    witchSwaps(game, pick) {
        let peekedAt = null;

        forPlayer(pick.user.id, player => {
            _.forOwn(player._private.peeked, (value, key) => peekedAt = key);
        }, game);

        if (peekedAt === null) {
            return;
        }

        if (!pick.target) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .center(peekedAt)
            .swap()
            .do();

        doAction(game, pick)
            .player(pick.target)
            .peek()
            .do();
    },
    troublemaker(game, pick) {
        if (!pick.target1 || !pick.target2 || pick.target1 === pick.target2) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target1)
            .player(pick.target2)
            .swap()
            .do();
    },

    villageIdiot(game, pick){
        if (!pick.target) {
            return;
        }

        const action = doAction(game, pick);
        game._players.forEach(player => {
            if (player.id !== pick.user.id) {
                action.player(player);
            }
        });
        if (pick.target === 'reverse') {
            action.reversePlayers();
        }

        action.swap().do();
    },

    auraSeer(game, pick){
        const auraPlayers = game._players.filter(player => player._private.peekedOrMovedCards);
        forPlayer(pick.user.id,
            player => player._hidden.knows = player._hidden.knows.concat(auraPlayers)
            , game);
    },

    drunk(game, pick) {
        if (!pick.target || pick.target.toString().length !== 1) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.user.id)
            .center(pick.target)
            .swap()
            .do();
    },

    insomniac(game, pick){
        doAction(game, pick)
            .player(pick.user.id)
            .peek()
            .do();
    },

    squire(game, pick) {
        const action = doAction(game, pick);

        game._players
            .filter(player => playerThinksTheyAre(player, WEREWOLF_ROLES_THAT_ARE_KNOWN))
            .forEach(player => action.player(player));

        action.peek().do();
    },

    beholder(game, pick) {
        const action = doAction(game, pick);

        game._players
            .filter(player => playerThinksTheyAre(player, SEER_ROLES))
            .forEach(player => action.player(player));

        action.peek().do();
    },

    revealer(game, pick) {
        if (!pick.target || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .peek()
            .do();

        forPlayer(pick.target, target => {
            if (target.shield) {
                throwFatalError(pick);
            }

            if (target._hidden.role !== 'werewolf' && target._hidden.role !== 'tanner') {
                target.role = target._hidden.role;
            }
        }, game);
    },

    curator(game, pick) {
        const artifactsInUse = game._players.map(player => player._private.artifact);
        const artifacts = _.difference(ARTIFACTS, artifactsInUse);

        if (pick.target) {
            doAction(game, pick)
                .player(pick.target)
                .attributes({ artifact: true })
                .do();

            forPlayer(pick.target, player => {
                player._private.artifact = _.shuffle(artifacts)[0];
                if (['werewolf', 'villager', 'vampire'].concat(roles.map(role => role.name)).includes(player._private.artifact)) {
                    player._hidden.ignoredRole = player._hidden.role;
                    player._hidden.role = player._private.role = player._private.artifact;
                }
            }, game);
        }
    },
};

handlers.paranormalInvestigator.intermediateRole = 'paranormalInvestigator2';
handlers.paranormalInvestigator2.preIntermediateRole = 'paranormalInvestigator';
handlers.witch.intermediateRole = 'witchSwaps';
handlers.witchSwaps.preIntermediateRole = 'witch';

handlers.dopplegangeralphaWolf = { dopplegangerOf: handlers.alphaWolf };
handlers.dopplegangermysticWolf = { dopplegangerOf: handlers.mysticWolf };
handlers.dopplegangersentinel = { dopplegangerOf: handlers.sentinel };
handlers.dopplegangerthing = { dopplegangerOf: handlers.thing };
handlers.dopplegangerseer = { dopplegangerOf: handlers.seer };
handlers.dopplegangerapprenticeSeer = { dopplegangerOf: handlers.apprenticeSeer };
handlers.dopplegangerparanormalInvestigator = { dopplegangerOf: handlers.paranormalInvestigator, intermediateRole: 'dopplegangerparanormalInvestigator2' };
handlers.dopplegangerparanormalInvestigator2 = { dopplegangerOf: handlers.paranormalInvestigator2, preIntermediateRole: 'dopplegangerparanormalInvestigator' };
handlers.dopplegangerrobber = { dopplegangerOf: handlers.robber };
handlers.dopplegangerwitch = { dopplegangerOf: handlers.witch, intermediateRole: 'dopplegangerwitchSwaps' };
handlers.dopplegangerwitchSwaps = { dopplegangerOf: handlers.witchSwaps, preIntermediateRole: 'dopplegangerwitch' };
handlers.dopplegangertroublemaker = { dopplegangerOf: handlers.troublemaker };
handlers.dopplegangervillageIdiot = { dopplegangerOf: handlers.villageIdiot };
handlers.dopplegangerdrunk = { dopplegangerOf: handlers.drunk };
handlers.dopplegangerauraSeer = { dopplegangerOf: handlers.auraSeer };
handlers.dopplegangerinsomniac = { dopplegangerOf: handlers.insomniac };
handlers.dopplegangersquire = { dopplegangerOf: handlers.squire };
handlers.dopplegangerbeholder = { dopplegangerOf: handlers.beholder };
handlers.dopplegangerrevealer = { dopplegangerOf: handlers.revealer };
handlers.dopplegangercurator = { dopplegangerOf: handlers.curator };

module.exports = handlers;