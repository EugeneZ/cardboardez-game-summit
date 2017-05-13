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
const handlers = require('./actionHandlers');

const CENTER_WEREWOLF = 3;
const WEREWOLF_ROLES_THAT_ARE_KNOWN = ['werewolf', 'alphaWolf', 'mysticWolf', 'dreamWolf'];
const SEER_ROLES = ['seer', 'apprenticeSeer'];
const ARTIFACTS = ['werewolf', 'villager', 'tanner', 'void', 'mute', 'shroud'];

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
            // TODO: FIX THIS! Pi works differently now
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
    game.role = game.order[0];

    // Determine timing
    game.starts = moment().unix();
    game.minutes = parseInt(game.options.timer, 10) || 5;
    game.ends = moment().add(game.minutes, 'minutes').add(5, 'seconds').unix(); //adding five seconds for lag or w/e

    game.mode = 'night';
};

module.exports.night = function (action, game) {
    const { role } = game;
    const isForDoppleganger = handlers[role].dopplegangerOf;
    const handler = isForDoppleganger || handlers[role];

    forPlayer(action.user.id, player => {
        let thisPlayersTurn;

        if (isForDoppleganger) {
            thisPlayersTurn = player._private.role === 'doppleganger' && game._hidden.doppleganger === dopplegangerOf;
        } else {
            thisPlayersTurn = player._private.role === role;
        }

        if (thisPlayersTurn && !player.ready) {
            handler(game, action);
        }

        player.ready = true;
    }, game);

    if (game._players.every(p => p.ready)) {
        game._players.forEach(p => p.ready = false);

        if (game.role === 'doppleganger') {
            setKnows(game._players);
        }

        const { intermediateRole, preIntermediateRole } = handlers[game.role];

        if (intermediateRole) {
            game.role = intermediateRole;
        } else {
            game.role = game.order[game.order.indexOf(preIntermediateRole || role) + 1];
        }

        if (!game.role) {
            game.mode = 'day';
        }
    }
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

module.exports.playerThinksTheyAre = playerThinksTheyAre;
module.exports.forPlayer = forPlayer;
module.exports.throwFatalError = throwFatalError;
module.exports.CENTER_WEREWOLF = CENTER_WEREWOLF;
module.exports.ARTIFACTS = ARTIFACTS;
module.exports.WEREWOLF_ROLES_THAT_ARE_KNOWN = WEREWOLF_ROLES_THAT_ARE_KNOWN;
module.exports.SEER_ROLES = SEER_ROLES;