export function getConfiguration(options = {}, players) {
    const totalRoles = roles.reduce((value, role) => {
            if (options[role.name]) {
                return ++value;
            } else {
                return value;
            }
        }, 0) + (options.villagers || 0) + (options.werewolves || 0);

    let error = null;
    if (totalRoles < 6 || totalRoles > 13) {
        error = 'You must select between 6 and 13 roles. (Number of players plus 3)';
    }

    return {
        name: 'Summit',
        minPlayers: error ? 3 : totalRoles - 3,
        maxPlayers: error ? 10 : totalRoles - 3,
        error,
        options: [{
            label: 'Villagers',
            name: 'villagers',
            type: 'select',
            items: [{
                label: 'None',
                value: null
            }, {
                label: 'One',
                value: 1
            }, {
                label: 'Two',
                value: 2
            }, {
                label: 'Three',
                value: 3
            }, {
                label: 'Four',
                value: 4
            }, {
                label: 'Five',
                value: 5
            }]
        }, {
            label: 'Werewolves',
            name: 'werewolves',
            type: 'select',
            items: [{
                label: 'None',
                value: null
            }, {
                label: 'One',
                value: 1
            }, {
                label: 'Two',
                value: 2
            }, {
                label: 'Three',
                value: 3
            }, {
                label: 'Four',
                value: 4
            }, {
                label: 'Five',
                value: 5
            }]
        }].concat(roles)
    }
}