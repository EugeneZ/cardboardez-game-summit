const tape = require('tape');
const { playerStub } = require('../util');
const rewire = require('rewire');
const diff = require('deep-diff');
const actionHandlers = rewire('../../actionHandlers');

const doAction = actionHandlers.__get__('doAction');

function objectSort(a, b) {
    const jsonA = JSON.stringify(a);
    const jsonB = JSON.stringify(b);
    return jsonA.localeCompare(jsonB);
}

function gameStub() {
    return {
        _players: [
            playerStub('p0', 'test0'),
            playerStub('p1', 'test1'),
            playerStub('p2', 'test2'),
            playerStub('p3', 'test3'),
            playerStub('p4', 'test4'),
            playerStub('p5', 'test5', { shield: true }),
        ],
        _hidden: { center: ['center0', 'center1', 'center2', 'special'] }
    };
}

function testDiff(t, target, descriptor, msg) {
    const difference = diff(gameStub(), target);
    t.deepEquals(
        difference && difference.sort(objectSort),
        descriptor.sort(objectSort),
        msg
    );
}

function standardP1toP3(t, role, descriptor) {
    t.plan(1);
    const game = gameStub();
    actionHandlers[role](game, { user: { id: 'p1' }, target: 'p3' });
    testDiff(t, game, descriptor);
    t.end();
}

tape('doAction.swap', t => {
    t.plan(15);
    const game = gameStub();

    doAction(game, { user: { id: 'p0' } })
        .player('p0')
        .player('p3')
        .swap()
        .do();

    doAction(game, { user: { id: 'p2' } })
        .player('p2')
        .center(0)
        .swap()
        .do();

    // This shouldn't do anything because player 5 is shielded
    doAction(game, { user: { id: 'p1' } })
        .player('p1')
        .player('p5')
        .swap()
        .do();

    t.equals(game._players[0]._hidden.role, 'test3', 'Role was swapped in');
    t.equals(game._players[2]._hidden.role, 'center0', 'Role was swapped with center');
    t.equals(game._players[3]._hidden.role, 'test0', 'Role was swapped out');
    t.equals(game._players[0]._private.peekedOrMovedCards, true, 'peekedOrMovedCards flag set');
    t.equals(game._players[2]._private.peekedOrMovedCards, true, 'peekedOrMovedCards flag set');
    t.equals(game._hidden.center[0], 'test2', 'Role was swapped into center');

    t.equals(game._hidden.center[1], 'center1', 'Center 1 was untouched');
    t.equals(game._hidden.center[2], 'center2', 'Center 2 was untouched');
    game._players.forEach((p, i) => {
        if (p.id !== 'p0' && p.id !== 'p3' && p.id !== 'p2') {
            t.equals(p._hidden.role, `test${i}`, 'Role was untouched');
        }
        if (p.id !== 'p0' && p.id !== 'p2') {
            t.equals(p._private.peekedOrMovedCards, undefined, 'peekedOrMovedCards flag not set');
        }
    });

    t.end();
});

const rolesThatRequireTargets = [
    'doppleganger',
    'alphaWolf',
    'drunk',
];
tape('Roles that require targets throw when not provided one', t => {
    t.plan(rolesThatRequireTargets.length);
    const game = gameStub();
    rolesThatRequireTargets.forEach(handlerName => {
        t.throws(()=>{
            actionHandlers[handlerName](game, { user: { id: 'p0' } });
        }, Error, `${handlerName} throws when no target provided`);
    });
    t.end();
});

const rolesThatCannotSelfTarget = [
    'doppleganger',
    'sentinel',
    'alphaWolf',
    'mysticWolf',
    'thing',
    'paranormalInvestigator',
    'paranormalInvestigator2',
    'robber',
];
tape('Roles that cannot target themselves throw when it happens', t => {
    t.plan(rolesThatCannotSelfTarget.length);
    const game = gameStub();
    rolesThatCannotSelfTarget.forEach(handlerName => {
        t.throws(()=>{
            actionHandlers[handlerName](game, { user: { id: 'p1' }, target: 'p1' });
        }, Error, `${handlerName} throws when targeting self`);
    });
    t.end();
});

const rolesThatCanDoNothing = [
    'sentinel',
    'mysticWolf',
    'thing',
    'paranormalInvestigator',
    'paranormalInvestigator2',
    'robber',
];
tape('Roles that have the option of doing nothing dont change the game', t => {
    t.plan(rolesThatCanDoNothing.length);
    rolesThatCanDoNothing.forEach(handlerName => {
        const game = gameStub();
        actionHandlers[handlerName](game, { user: { id: 'p1' } });
        t.deepEquals(game, gameStub(), 'Nothing changed');
    });
    t.end();
});

tape('doppleganger', t => {
    const descriptor = [
        { kind: 'N', path: ['_players', 1, '_private', 'peekedOrMovedCards'], rhs: true },
        { kind: 'N', path: ['_players', 1, '_private', 'peeked', 'p3'], rhs: 'test3' },
        { kind: 'N', path: ['_players', 1, '_private', 'doppleganger'], rhs: 'test3' },
        { kind: 'N', path: ['_hidden', 'doppleganger'], rhs: 'test3' },
    ];
    standardP1toP3(t, 'doppleganger', descriptor);
});

tape('sentinel', t => {
    standardP1toP3(t, 'sentinel', [{ kind: 'N', path: ['_players', 3, 'shield'], rhs: true }]);
});

tape('alphaWolf', t => {
    const descriptor = [
        { kind: 'E', path: ['_hidden', 'center', 3], lhs: 'special', rhs: 'test3' },
        { kind: 'N', path: ['_players', 1, '_private', 'peekedOrMovedCards'], rhs: true },
        { kind: 'E', path: ['_players', 3, '_hidden', 'role'], lhs: 'test3', rhs: 'special' },

    ];
    standardP1toP3(t, 'alphaWolf', descriptor);
});

tape('mysticWolf', t => {
    const descriptor = [
        { kind: 'N', path: ['_players', 1, '_private', 'peeked', 'p3'],  rhs: 'test3' },
        { kind: 'N', path: ['_players', 1, '_private', 'peekedOrMovedCards'], rhs: true },
    ];
    standardP1toP3(t, 'mysticWolf', descriptor);
});