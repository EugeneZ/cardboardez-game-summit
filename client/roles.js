module.exports = [
    {
        name: 'alphaWolf',
        label: 'Alpha Wolf',
        type: 'boolean',
        description: `When Alpha Wolf is used, a werewold card is added to the center cards. When Alpha Wolf wakes up,
            they switch the center werewolf card with a card held by another player.`,
        werewolf: true,
        wake: 21
    },
    {
        name: 'mysticWolf',
        label: 'Mystic Wolf',
        type: 'boolean',
        description: `Mystic Wolf can look at one player's card after the werewolf phase.`,
        werewolf: true,
        wake: 22
    },
    {
        name: 'dreamWolf',
        label: 'Dream Wolf',
        type: 'boolean',
        description: `Dream Wolf does not know who the other werewolves are, though they know who Dream Wolf is.`,
        werewolf: true,
        wake: false
    },
    {
        name: 'minion',
        label: 'Minion',
        type: 'boolean',
        description: `Minion knows who the werewolves are and wants them to win, even though Minion is a villager. That
            means the werewolves and Minion win if Minion is killed. If there are no werewolves, Minion only wins if a
            different villager is killed.`,
        werewolf: true
        //wake: 30 // Doesn't wake in this version, info is given directly
    },
    {
        name: 'squire',
        label: 'Squire',
        type: 'boolean',
        description: `Squire knows who the werewolves are and wants them to win, even though Squire is a villager. That
            means the werewolves and Minion win if Squire is killed. If there are no werewolves, Squire only wins if a
            different villager is killed. In addition, Squire gets to look at the werewolves' cards late in the night.`,
        werewolf: true,
        wake: 93
    },
    {
        name: 'tanner',
        label: 'Tanner',
        type: 'boolean',
        description: `Tanner only wins if Tanner is killed.`,
        wake: false
    },
    {
        name: 'apprenticeTanner',
        label: 'Apprentice Tanner',
        type: 'boolean',
        description: `Apprentice Tanner knows who Tanner is. Apprentice Tanner only wins if one or both of the tanners
            are killed.`
        //wake: 32 // Doesn't wake in our version, gets info directly
    },
    {
        name: 'doppleganger',
        label: 'Doppleganger',
        type: 'boolean',
        description: `The Doppleganger wakes first and looks at another player's card. They become that role,
                performing its action immediately if possible. If not possible to perform immediately, the doppleganger
                will wake to perform their new role later.`,
        wake: -70
    },
    {
        name: 'sentinel',
        label: 'Sentinel',
        type: 'boolean',
        description: `Sentinel places a shield token on any card. That card may not be viewed, moved, or have an
            artifact.`,
        wake: 0,
        villager: true
    },
    {
        name: 'thing',
        label: 'Thing',
        type: 'boolean',
        description: `Thing may tap the shoulder of a single player beside them when Thing Wakes.`,
        wake: 42,
        villager: true
    },
    {
        name: 'mason1',
        label: 'First Mason',
        type: 'boolean',
        description: `The Masons know each other.`,
        //wake: 40, // Doesn't wake in our version, gets info directly
        villager: true
    },
    {
        name: 'mason2',
        label: 'Second Mason',
        type: 'boolean',
        description: `The Masons know each other.`,
        //wake: 40, // Doesn't wake in our version, gets info directly
        villager: true
    },
    {
        name: 'seer',
        label: 'Seer',
        type: 'boolean',
        description: `Seer looks at another player's card or at two cards in the center.`,
        wake: 50,
        villager: true
    },
    {
        name: 'apprenticeSeer',
        label: 'Apprentice Seer',
        type: 'boolean',
        description: `Apprentice Seer looks at a card in the center.`,
        wake: 52,
        villager: true
    },
    {
        name: 'paranormalInvestigator',
        label: 'Paranormal Investigator',
        type: 'boolean',
        description: `PI may look at up to two other players' cards. If the PI sees a Tanner or a Werewolf of any type,
        PI stops looking at cards and becomes a tanner or werewolf respectively.`,
        wake: 53
    },
    {
        name: 'robber',
        label: 'Robber',
        type: 'boolean',
        description: `The Robber may swap cards with a player and look at the new card, but does not perform that new
            role's action.`,
        wake: 60,
        villager: true
    },
    {
        name: 'witch',
        label: 'Witch',
        type: 'boolean',
        description: `Witch may look at any center card. If Witch does, Witch must swap that card with any player's
            card.`,
        wake: 62,
        villager: true
    },
    {
        name: 'troublemaker',
        label: 'Troublemaker',
        type: 'boolean',
        description: `Troublemaker swaps the cards of two other players.`,
        wake: 70,
        villager: true
    },
    {
        name: 'villageIdiot',
        label: 'Village Idiot',
        type: 'boolean',
        description: `Village Idiot may move all players' cards except their own left or right.`,
        wake: 72,
        villager: true
    },
    {
        name: 'auraSeer',
        label: 'Aura Seer',
        type: 'boolean',
        description: `Aura Seer knows who viewed or moved cards.`,
        wake: 73,
        villager: true
    },
    {
        name: 'drunk',
        label: 'Drunk',
        type: 'boolean',
        description: `Drunk swaps their card with one in the center but does not look at it.`,
        wake: 80,
        villager: true
    },
    {
        name: 'insomniac',
        label: 'Insomniac',
        type: 'boolean',
        description: `Insomniac looks at their card towards the end of the night.`,
        wake: 90,
        villager: true
    },
    {
        name: 'beholder',
        label: 'Beholder',
        type: 'boolean',
        description: `Beholder knows who the Seer and Apprentice Seer is. The can also look at at the Seer's card.`,
        wake: 99,
        villager: true
    },
    {
        name: 'revealer',
        label: 'Revealer',
        type: 'boolean',
        description: `Revealer flips over one other player's card face up. If its a tanner or werewolf, it must be
        flipped back down.`,
        wake: 100,
        villager: true
    },
    {
        name: 'curator',
        label: 'Curator',
        type: 'boolean',
        description: `Curator places a random artifact token on any player's card. At the beginning of the day, that
            player must look at the artifact but cannot show it to anyone else. Artifacts include turning the player
            into a werewolf, villager, or tanner (with any powers they may have had removed), silencing the player, or 
            forcing the player to play with their back turned.`,
        wake: 110,
        villager: true
    },
    {
        name: 'bodyguard',
        label: 'Bodyguard',
        type: 'boolean',
        description: `Bodyguard does not wake, but whoever they choose at the end of the day cannot be killed.`,
        wake: false,
        villager: true
    },
    {
        name: 'cursed',
        label: 'Cursed',
        type: 'boolean',
        description: `Cursed is a villager unless at least one werewolf votes for Cursed, in which case Cursed is now
            a werewolf.`,
        wake: false
    },
    {
        name: 'hunter',
        label: 'Hunter',
        type: 'boolean',
        description: `Hunter does not wake, but whoever they choose at the end of the day is killed regardless of the
            vote count. (Though someone else may be killed, too.)`,
        wake: false,
        villager: true
    },
    {
        name: 'prince',
        label: 'Prince',
        type: 'boolean',
        description: `Votes for killing the prince do not count. The player with the next largest (or tied) amount of
            votes is killed instead.`,
        wake: false,
        villager: true
    },
];