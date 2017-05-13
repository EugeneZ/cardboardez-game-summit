const tape = require('tape');
const _ = require('lodash');
const summit = require('../../server');

function getRandomInt(max) {
    return Math.floor(Math.random() * (Math.floor(max) + 1));
}

function getNewGame(villagers, werewolves, roles) {
    const game = {
        id: '1',
        game: 'summit',
        players: [],
        name: 'test',
        _hidden: {},
        _players: [],
        options: {
            villagers,
            werewolves,
            ...roles
        }
    };

    game.players = _.times(villagers + werewolves + Object.keys(game.options).length - 5, i => 'id' + i);
    game._players = _.times(villagers + werewolves + Object.keys(game.options).length - 5, i => ({
        id: 'id' + i,
        _hidden: {},
        _private: {}
    }));

    return game;
}

tape.skip('setup', t => {
    const roles = {
        alphaWolf: true,
        troublemaker: true
    };
    const game = getNewGame(4, 1, roles);
    summit.setup(game);

    t.equals(game._hidden.center.length, roles.alphaWolf ? 4 : 3);
    t.ok(game.order.length);
    t.equals(game.order[game.order.length - 1], 'day');

    t.equals(game.mode, 'alphaWolf');
    summit.alphaWolf({ target: 'id2', user: { id: 'id0' }}, game);
    t.equals(game.mode, 'alphaWolf');
    summit.alphaWolf({ target: 'id2', user: { id: 'id1' }}, game);
    t.equals(game.mode, 'alphaWolf');
    summit.alphaWolf({ target: 'id3', user: { id: 'id2' }}, game);
    t.equals(game.mode, 'alphaWolf');
    summit.alphaWolf({ target: 'id2', user: { id: 'id3' }}, game);

    t.equals(game.mode, 'troublemaker');
    summit.troublemaker({ target1: 'id1', target2: 'id2', user: { id: 'id0' }}, game);
    t.equals(game.mode, 'troublemaker');
    summit.troublemaker({ target1: 'id0', target2: 'id2', user: { id: 'id1' }}, game);
    t.equals(game.mode, 'troublemaker');
    summit.troublemaker({ target1: 'id1', target2: 'id3', user: { id: 'id2' }}, game);
    t.equals(game.mode, 'troublemaker');
    summit.troublemaker({ target1: 'id1', target2: 'id2', user: { id: 'id3' }}, game);

    t.equals(game.mode, 'day');

    summit.day({ target: 'id1', user: { id: 'id0' }}, game);
    t.equals(game.mode, 'day');
    summit.day({ target: 'id0', user: { id: 'id1' }}, game);
    t.equals(game.mode, 'day');
    summit.day({ target: 'id1', user: { id: 'id2' }}, game);
    t.equals(game.mode, 'day');
    summit.day({ target: 'id1', user: { id: 'id3' }}, game);
    t.equals(game.mode, 'gameover');



    console.log(game);
    console.log(game._players);
    t.end();
});