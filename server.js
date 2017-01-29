// TODOS:
// 1. Minion win condition is wrong I think...
// 2. There are some information leaks if someone is watching the network, specifically the roles with multiple
//    phases like PI, Witch, Doppleganger...
// 3. Timer
// 4. Thing tap... which direction does it come from? Shouldn't the tapped player be able to tell? And can't the Thing
//    itself control where ont he person's body they tap...?

const _ = require('lodash');
const moment = require('moment');
const roles = require('./roles');

const CENTER_WEREWOLF = 3;
const WEREWOLF_ROLES_THAT_ARE_KNOWN = ['werewolf', 'alphaWolf', 'mysticWolf', 'dreamWolf'];
const SEER_ROLES = ['seer', 'apprenticeSeer'];
const ARTIFACTS = ['werewolf', 'villager', 'tanner', 'void', 'mute', 'shroud'];

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
        peekedOrMovedCards = true;

        tasks.push(() => {
            if (players.length > 1) {
                let next, last = players[players.length - 1]._hidden.role;
                players.filter(p => !p.shield).forEach(player => {
                    next = player._hidden.role;
                    player._hidden.role = last;
                    last = next;
                });
            } else if (players.length === 1 && centers.length === 1 && !players[0].shield) {
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
        if (peekedOrMovedCards) {
            mainPlayer._private.peekedOrMovedCards = true;
        }
        tasks.forEach(task => task());
        return this;
    };

    return this;
};

function throwFatalError(action) {
    throw new Error(`Cheating (or bug?) detected for player ${action.user.id}`);
}

function forPlayer(id, cb, { _players }) {
    for (let i = 0; i < _players.length; i++) {
        if (_players[i].id === id) {
            cb(_players[i]);
            break;
        }
    }
}

function playerIncludesRolesAt(player, location, roleOrRoles, game) {
    const roles = [].concat(roleOrRoles);
    return roles.includes(player[location].role) ||
        (player[location].role === 'doppleganger' && roleOrRoles.includes(game ? game[location].doppleganger : player[location].doppleganger)) ||
        (roles.includes('werewolf') && player[location].role === 'paranormalInvestigator' && game ? game[location].piIsWerewolf : player[location].piIsWerewolf) ||
        (roles.includes('tanner') && player[location].role === 'paranormalInvestigator' && game ? game[location].piIsTanner : player[location].piIsTanner) ||
        (roles.includes('vampire') && player[location].role === 'paranormalInvestigator' && game ? game[location].piIsVampire : player[location].piIsVampire);
}

function playerThinksTheyAre(player, roleOrRoles) {
    return playerIncludesRolesAt(player, '_private', roleOrRoles);
}

function playerActuallyIs(player, roleOrRoles, game) {
    return playerIncludesRolesAt(player, '_hidden', roleOrRoles, game);
}

function setKnows(players) {
    const werewolfRolesThatSeeKnowns = ['werewolf', 'alphaWolf', 'mysticWolf', 'minion', 'squire'];
    const masonRoles = ['mason', 'mason1', 'mason2'];

    const knownWolves = players
        .filter(player => playerThinksTheyAre(player, WEREWOLF_ROLES_THAT_ARE_KNOWN))
        .map(player => player.id);

    const knownMasons = players
        .filter(player => playerThinksTheyAre(player, masonRoles))
        .map(player => player.id);

    const knownSeers = players
        .filter(player => playerThinksTheyAre(player, SEER_ROLES))
        .map(player => player.id);

    players.forEach(player => {
        if (playerThinksTheyAre(player, werewolfRolesThatSeeKnowns)) {
            player._private.knows = player._private.knows.concat(knownWolves);
        }

        if (playerThinksTheyAre(player, 'apprenticeTanner')) {
            const tanner = players.filter(p => playerThinksTheyAre(p, 'tanner'));
            if (tanner) {
                player._private.knows.push(tanner.id);
            }
        }

        if (playerThinksTheyAre(player, ['mason', 'mason1', 'mason2'])) {
            player._private.knows = player._private.knows.concat(knownMasons);
        }

        if (playerThinksTheyAre(player, 'beholder')) {
            player._private.knows = player._private.knows.concat(knownSeers);
        }
    });

    // players' own ids shouldn't be in the knowns if they somehow ended up there.
    players.forEach(player => player._private.knows = player._private.knows.filter(id => player.id !== id));
}

function playerActionOrReady(game, action, role, cbIfRole, cbWhenNext, isDoppleganger) {
    forPlayer(action.user.id, player => {
        if (isDoppleganger ? player._private.role === 'doppleganger' && game._hidden.doppleganger === role : player._private.role === role) {
            if (!player.ready) {
                cbIfRole();
            }
            player.ready = true;
        } else {
            player.ready = true;
        }

        if (!isDoppleganger && game._players.every(p => p.ready)) {
            game._players.forEach(p => p.ready = false);
            cbWhenNext();
        }
    }, game);
}

module.exports.setup = function (game) {

    // Determine roles
    const selectedRoles = roles.reduce((cur, role) => {
        if (game.options[role.name]) {
            return cur.concat(role.name);
        }
        return cur;
    }, [].concat(_.times(game.options.villagers, ()=>'villager'), _.times(game.options.werewolves, ()=>'werewolf')));

    // Assign cards
    game._hidden.center = _.shuffle(selectedRoles.slice()); // all cards start in the center, we will hand them out soon

    game._players.forEach(player => {
        player.votes = 0;
        player._private.peeked = {};
        player._private.knows = [];
        player._hidden.role = player._private.role = game._hidden.center.pop();
    });

    if (selectedRoles.includes('alphaWolf')) {
        game._hidden.center.push('werewolf');
        game.centerCount = 4;
    } else {
        game.centerCount = 3;
    }

    // Determine night actions
    // We use the "wake" flag on roles, but this can be misleading -- many roles that have no flag actually do wake
    // but we only mark roles as "wake" if they need to perform some actions. So for example regular werewolves don't
    // "wake" in our version because we provide them with the identities of the other werewolves without any action
    // taken by them.
    const order = selectedRoles
        .map(role => roles.find(r => r.name === role) || { wake: false })
        .filter(role => typeof role.wake === 'number')
        .sort((a, b) => a.wake - b.wake)
        .map(role => role.name);

    if (selectedRoles.includes('doppleganger')) {

        // if there's a doppleganger, we need to add doppleganger actions to the order based on what's in the game
        // First the immediate doppleganger actions
        ['alphaWolf', 'mysticWolf', 'sentinel', 'thing', 'seer', 'apprenticeSeer', 'paranormalInvestigator', 'robber',
            'witch', 'troublemaker', 'villageIdiot', 'drunk'].forEach(role => {
            if (selectedRoles.includes(role)) {
                order.splice(order.indexOf('doppleganger') + 1, 0, 'doppleganger' + role);
            }
        });

        // Then the actions that go after their doppleganged role
        ['auraSeer', 'insomniac', 'squire', 'beholder', 'revealer', 'curator'].forEach(role => {
            if (selectedRoles.includes(role)) {
                order.splice(order.indexOf(role) + 1, 0, 'doppleganger' + role);
            }
        });

    } else {
        // if there's no doppleganger, tell people who they "know" (werewolves, etc). If there's a doppleganger we'll do
        // this after they go.
        setKnows(game._players);
    }
    game.order = _.uniq(order);
    game.order.push('day');
    game.mode = game.order[0];

    // Determine timing
    game.starts = moment().unix();
    game.minutes = parseInt(game.options.timer, 10) || 5;
    game.ends = moment().add(game.minutes, 'minutes').add(5, 'seconds').unix(); //adding five seconds for lag or w/e
};

module.exports.day = function (vote, game) {
    if (vote.user.id === vote.target) {
        throwFatalError(vote);
    }

    forPlayer(vote.user.id, player => {
        if (player.vote) {
            forPlayer(player.vote, target => {
                target.votes--;
                target._hidden.guarded = false;
            }, game);
        }
        player.vote = vote.target;
        if (player.vote) {
            forPlayer(player.vote, target => {
                target.votes++;
                if (playerActuallyIs(player, 'bodyguard', game)) {
                    target._hidden.guarded = true;
                }
            }, game);
        }
    }, game);

    if (game._players.every(p => p.vote) && (!game.ends || moment().unix() > game.ends)) {

        game.doppleganger = game._hidden.doppleganger;

        // figure out who died
        const deadPlayers = game._players
            .filter(player => !player.guarded)
            .filter(player => !playerActuallyIs(player, 'prince', game))
            .sort((a, b) => b.votes - a.votes)
            .filter((player, i, sorted) => player.votes > 1 && player.votes === sorted[0].votes);

        game._players.forEach(player => {
            _.merge(player, player._private, player._hidden);

            if (player.vote && playerActuallyIs(player, 'hunter', game)) {
                deadPlayers.push(game._players.find(target => target.id === player.vote && !target.guarded));
            }
        });

        game.deadPlayers = _.uniq(deadPlayers.filter(p => p));

        // figure out who won
        game.winners = [];

        // Tanners? Or PIs/dopples who are now tanners?
        game._players.forEach(player => {
            if (playerActuallyIs(player, ['tanner', 'apprenticeTanner'], game) && deadPlayers.includes(player)) {
                game.winners.push(player.id);
            }
        });

        // If any tanners won, no one else can win
        if (!game.winners.length) {
            const werewolvesInPlay = game._players
                .filter(player => playerActuallyIs(player, ['werewolf', 'alphaWolf', 'mysticWolf', 'dreamWolf'], game));
            const minionSquiresInPlay = game._players
                .filter(player => playerActuallyIs(player, ['minion', 'squire'], game));
            const evilTeamInPlay = game._players
                .filter(player => playerActuallyIs(player, ['werewolf', 'alphaWolf', 'mysticWolf', 'dreamWolf', 'minion', 'squire'], game));
            let goodTeamInPlay = game._players
                .filter(player => !playerActuallyIs(player, ['werewolf', 'alphaWolf', 'mysticWolf', 'dreamWolf', 'minion', 'squire', 'tanner', 'apprenticeTanner'], game));

            // cursed might actually be a werewolf
            goodTeamInPlay.filter(player => playerActuallyIs(player, 'cursed', game)).forEach(cursed => {
                if (cursed.votes) {
                    werewolvesInPlay.filter(p => playerActuallyIs(p, 'werewolf', game)).forEach(wolf => {
                        if (wolf.vote === cursed.id) {
                            goodTeamInPlay = goodTeamInPlay.filter(p => p !== cursed);
                            werewolvesInPlay.push(cursed);
                            evilTeamInPlay.push(cursed);
                        }
                    });
                }
            });

            if (werewolvesInPlay.length) {

                if (werewolvesInPlay.some(player => deadPlayers.includes(player))) {
                    game.winners = game.winners.concat(goodTeamInPlay.map(p=>p.id));
                } else {
                    game.winners = game.winners.concat(evilTeamInPlay.map(p=>p.id));
                }

            } else if (minionSquiresInPlay.length) {

                if (minionSquiresInPlay.some(player => deadPlayers.includes(player))) {
                    game.winners = game.winners.concat(goodTeamInPlay.map(p=>p.id));
                } else {
                    game.winners = game.winners.concat(evilTeamInPlay.map(p=>p.id));
                }

            } else if (!deadPlayers.length) {
                game.winners = game.winners.concat(goodTeamInPlay.map(p=>p.id));
            }
        }

        game.mode = 'gameover';
    }
};

module.exports.doppleganger = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        if (!pick.target || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .peek((player, peekedAt) => player._private.doppleganger = game._hidden.doppleganger = peekedAt)
            .do();
    },()=>{
        // Since there's a doppleganger, we need to recalculate the "knows" afterwards
        setKnows(game._players);
        game.mode = game.order[game.order.indexOf('doppleganger') + 1];
    });
};

module.exports.dopplegangeralphaWolf = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.alphaWolf(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangeralphaWolf') + 1];
    });
};

module.exports.dopplegangermysticWolf = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.mysticWolf(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangermysticWolf') + 1];
    });
};

module.exports.dopplegangersentinel = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.sentinel(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangersentinel') + 1];
    });
};

module.exports.dopplegangerthing = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.thing(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerthing') + 1];
    });
};

module.exports.dopplegangerseer = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.seer(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerseer') + 1];
    });
};

module.exports.dopplegangerapprenticeSeer = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.apprenticeSeer(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerapprenticeSeer') + 1];
    });
};

module.exports.dopplegangerparanormalInvestigator = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.paranormalInvestigator(pick, game, true);
    },()=>{
        if (game._hidden.mode === 'paranormalInvestigator2') {
            game.mode = 'dopplegangerparanormalInvestigator2';
            game._hidden.mode = null;
        } else {
            game.mode = game.order[game.order.indexOf('dopplegangerparanormalInvestigator') + 1];
        }
    });
};

module.exports.dopplegangerparanormalInvestigator2 = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.paranormalInvestigator2(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerparanormalInvestigator') + 1];
    });
};

module.exports.dopplegangerrobber = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.robber(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerrobber') + 1];
    });
};

module.exports.dopplegangerwitch = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.witch(pick, game, true);
    },()=>{
        if (game._hidden.dopWitchWillSwap) {
            game.mode = 'dopplegangerwitchSwaps';
        } else {
            game.mode = game.order[game.order.indexOf('dopplegangerwitch') + 1];
        }
    });
};

module.exports.dopplegangerwitchSwaps = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.witchSwaps(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerwitch') + 1];
    });
};

module.exports.dopplegangertroublemaker = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.troublemaker(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangertroublemaker') + 1];
    });


};

module.exports.dopplegangervillageIdiot = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.villageIdiot(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangervillageIdiot') + 1];
    });
};

module.exports.dopplegangerdrunk = function(pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.drunk(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerdrunk') + 1];
    });
};

module.exports.sentinel = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'sentinel', ()=>{
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
    },()=>{
        game.mode = game.order[game.order.indexOf('sentinel') + 1];
    }, isDoppleganger);
};

module.exports.alphaWolf = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'alphaWolf', ()=>{
        if (!pick.target || pick.target === pick.user.id) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target)
            .center(CENTER_WEREWOLF)
            .swap()
            .do();
    },()=>{
        game.mode = game.order[game.order.indexOf('alphaWolf') + 1];
    }, isDoppleganger);
};

module.exports.mysticWolf = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'mysticWolf', ()=>{
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
    },()=>{
        game.mode = game.order[game.order.indexOf('mysticWolf') + 1];
    }, isDoppleganger);
};

module.exports.thing = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'thing', ()=>{
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
    },()=>{
        game.mode = game.order[game.order.indexOf('thing') + 1];
    }, isDoppleganger);
};

module.exports.seer = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'seer', ()=>{
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
    },()=>{
        game.mode = game.order[game.order.indexOf('seer') + 1];
    }, isDoppleganger);
};

module.exports.apprenticeSeer = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'apprenticeSeer', ()=>{
        if (_.isNil(pick.target)) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .center(pick.target)
            .peek()
            .do();
    },()=>{
        game.mode = game.order[game.order.indexOf('apprenticeSeer') + 1];
    }, isDoppleganger);
};

module.exports.paranormalInvestigator = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'paranormalInvestigator', ()=>{
        if (!pick.target) {
            return;
        }

        doAction(game, pick)
            .player(pick.target)
            .peek((player, peeked) => {
                if (peeked === null) {
                    throwFatalError(pick);
                }

                if (peeked === 'werewolf') {
                    player._private.werewolf = true;
                    game._hidden.piIsWerewolf = true;
                    game._hidden.mode = game.order[game.order.indexOf('paranormalInvestigator') + 1];
                } else if (peeked === 'tanner') {
                    player._private.tanner = true;
                    game._hidden.piIsTanner = true;
                    game._hidden.mode = game.order[game.order.indexOf('paranormalInvestigator') + 1];
                } else if (peeked === 'vampire') {
                    player._private.vampire = true;
                    game._hidden.piIsVampire = true;
                    game._hidden.mode = game.order[game.order.indexOf('paranormalInvestigator') + 1];
                } else {
                    game._hidden.mode = 'paranormalInvestigator2';
                }
            })
            .do();

    },()=>{
        if (game._hidden.mode) {
            game.mode = game._hidden.mode;
            game._hidden.mode = null;
        } else {
            game.mode = game.order[game.order.indexOf('paranormalInvestigator') + 1];
        }
    }, isDoppleganger);
};

module.exports.paranormalInvestigator2 = function(pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'paranormalInvestigator', ()=>{
        module.exports.paranormalInvestigator(pick, game, isDoppleganger);
    },()=>{
        game.mode = game.order[game.order.indexOf('paranormalInvestigator') + 1];
    }, isDoppleganger);
};

module.exports.robber = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'robber', ()=>{
        if (!pick.target) {
            throwFatalError(pick);
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

    },()=>{
        game.mode = game.order[game.order.indexOf('robber') + 1];
    }, isDoppleganger);
};

module.exports.witch = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'witch', ()=>{
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

        if (isDoppleganger) {
            game._hidden.dopWitchWillSwap = true;
        } else {
            game._hidden.witchWillSwap = true;
        }

    },()=>{
        if (game._hidden.witchWillSwap) {
            game.mode = 'witchSwaps';
        } else {
            game.mode = game.order[game.order.indexOf('witch') + 1];
        }
    }, isDoppleganger);
};

module.exports.witchSwaps = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'witch', ()=>{
        if (!pick.target) {
            throwFatalError(pick);
        }

        let peekedAt = null;

        forPlayer(pick.user.id, player => {
            _.forOwn(player._private.peeked, (value, key) => peekedAt = key);
        }, game);

        if (peekedAt === null) {
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
    },()=>{
        game.mode = game.order[game.order.indexOf('witch') + 1];
    }, isDoppleganger);
};

module.exports.troublemaker = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'troublemaker', ()=>{
        if (!pick.target1 || !pick.target2 || pick.target1 === pick.target2) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.target1)
            .player(pick.target2)
            .swap()
            .do();
    },()=>{
        game.mode = game.order[game.order.indexOf('troublemaker') + 1];
    }, isDoppleganger);
};

module.exports.villageIdiot = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'villageIdiot', ()=>{
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

    },()=>{
        game.mode = game.order[game.order.indexOf('villageIdiot') + 1];
    }, isDoppleganger);
};

module.exports.auraSeer = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'auraSeer', ()=>{
        const auraPlayers = game._players.filter(player => player.peekedOrMovedCards);

        forPlayer(pick.user.id, player => player._hidden.knows = player._hidden.knows.concat(auraPlayers), game);
    },()=>{
        game.mode = game.order[game.order.indexOf('auraSeer') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangerauraSeer = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.auraSeer(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerauraSeer') + 1];
    });
};

module.exports.drunk = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'drunk', ()=>{
        if (!pick.target || pick.target.toString().length !== 1) {
            throwFatalError(pick);
        }

        doAction(game, pick)
            .player(pick.user.id)
            .center(pick.target)
            .swap()
            .do();
    },()=>{
        game.mode = game.order[game.order.indexOf('drunk') + 1];
    }, isDoppleganger);
};

module.exports.insomniac = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'insomniac', ()=>{
        doAction(game, pick)
            .player(pick.user.id)
            .peek()
            .do();
    },()=>{
        game.mode = game.order[game.order.indexOf('insomniac') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangerinsomniac = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.insomniac(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerinsomniac') + 1];
    });
};

module.exports.squire = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'squire', ()=>{
        const action = doAction(game, pick);

        game._players
            .filter(player => playerThinksTheyAre(player, WEREWOLF_ROLES_THAT_ARE_KNOWN))
            .forEach(player => action.player(player));

        action.peek().do();
    },()=>{
        game.mode = game.order[game.order.indexOf('squire') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangersquire = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.squire(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangersquire') + 1];
    });
};

module.exports.beholder = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'beholder', ()=>{
        const action = doAction(game, pick);

        game._players
            .filter(player => playerThinksTheyAre(player, SEER_ROLES))
            .forEach(player => action.player(player));

        action.peek().do();
    },()=>{
        game.mode = game.order[game.order.indexOf('beholder') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangerbeholder = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.beholder(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerbeholder') + 1];
    });
};

module.exports.revealer = function (pick, game, isDoppleganger) {
    playerActionOrReady(game, pick, 'revealer', ()=>{
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
    },()=>{
        game.mode = game.order[game.order.indexOf('revealer') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangerrevealer = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        module.exports.revealer(pick, game, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangerrevealer') + 1];
    });
};

module.exports.curator = function (pick, game, artifactToSplice, isDoppleganger) {
    playerActionOrReady(game, pick, 'curator', ()=>{
        let artifacts = ARTIFACTS.slice();

        if (artifactToSplice) {
            artifacts = artifacts.splice(artifactToSplice, 1);
        }

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
    },()=>{
        game.mode = game.order[game.order.indexOf('curator') + 1];
    }, isDoppleganger);
};

module.exports.dopplegangercurator = function (pick, game) {
    playerActionOrReady(game, pick, 'doppleganger', ()=>{
        const playerWithArtifact = game._players.find(player => player.artifact);
        module.exports.curator(pick, game, playerWithArtifact && playerWithArtifact._private.artifact, true);
    },()=>{
        game.mode = game.order[game.order.indexOf('dopplegangercurator') + 1];
    });
};