import { createSelector } from 'reselect';

const games = props => props.games;
const gameId = props => props.params.id;
const users = props => props.users;
const user = props => props.user;

export const game = createSelector(
    games,
    gameId,

    (games, gameId) => games.find(game => game.id === gameId)
);

export const players = createSelector(
    game,
    users,

    (game, users) => game._players.map(
        player => ({
            name: users.find(user => user.id === player.id).name,
            ...player
        })
    )
);

export const me = createSelector(
    players,
    user,

    (players, user) => players.find(player => player.id === user.id)
);