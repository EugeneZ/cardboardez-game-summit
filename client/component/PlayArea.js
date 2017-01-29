import React, { Component } from 'react';
import autobind from 'autobind-decorator';
import times from 'lodash/times';
import random from 'lodash/random';
import { FontIcon } from 'material-ui';
import { BottomNavigation, BottomNavigationItem } from 'material-ui';
import { Paper } from 'material-ui';
import { LinearProgress } from 'material-ui';
import { FlatButton } from 'material-ui';
import moment from 'moment';
import Board from './Board';
import Info from './Info';
import roles from '../../roles';

const styles = {
    wrapper: {
        backgroundImage: 'url(/assets/images/summit/bg.jpg)',
        paddingBottom: 44,
        minHeight: '100%'
    },

    instructions: {
        margin: 10,
        padding: 10
    },

    bottomNavigaiton: {
        position: 'fixed',
        left: 0, bottom: 0, width: '100%'
    },

    dialog: {
        wrapper: {
            paddingTop: '0 !important',
            marginTop: '-65px !important',
            bottom: '0 !important',
            overflow: 'scroll !important',
            height: 'auto !important'
        },
        content: {
            width: '100%',
            maxWidth: '450px',
            maxHeight: '100% !important'
        },
        body: {
            maxHeight: '100% !important'
        }
    },

    actionNeeded: { backgroundColor: '#81C784' }
};

const roleDetails = {
    doppleganger: {
        instructions: `Doppleganger, you must choose another player. You will see their card and become that role. If your role has night actions or knowledge associated with it, it will be given to you soon.`,
        actionNeeded: { player: true, self: false, optional: false }
    },
    sentinel: {
        instructions: `Sentinel, you may place a shield on any other player, preventing their card from being moved or viewed.`,
        actionNeeded: { player: true, self: false, optional: true }
    },
    alphaWolf: {
        instructions: `Alpha Wolf, you must choose another player. That player will receive the special fourth center card (which started as a Werewolf).`,
        actionNeeded: { player: true, self: false, optional: false }
    },
    mysticWolf: {
        instructions: `Mystic Wolf, you may choose another player. You will see that player's card.`,
        actionNeeded: { player: true, self: false, optional: true }
    },
    thing: {
        instructions: `Thing, you may choose a player to your left or right, and that player will know you "tapped" them.`,
        actionNeeded: { player: true, self: false, optional: true, leftOrRightPlayerOnly: true }
    },
    seer: {
        instructions: `Seer, you may choose another player OR two center cards, and look at them.`,
        actionNeeded: { player: true, self: false, optional: true, center: 2, playerOrCenter: true }
    },
    apprenticeSeer: {
        instructions: `Apprentice Seer, you may choose a center card, and look at it.`,
        actionNeeded: { player: false, self: false, optional: true, center: true }
    },
    paranormalInvestigator: {
        instructions: `Paranormal Investigator, you may choose another player and look at their card. If it's a Werewolf, Tanner, or Vampire, you become that role. If it's not, you may repeat this process once.`,
        actionNeeded: { player: true, self: false, optional: true }
    },
    paranormalInvestigator2: {
        instructions: `Paranormal Investigator, you may choose another player and look at their card. If it's a Werewolf, Tanner, or Vampire, you become that role.`,
        actionNeeded: { player: true, self: false, optional: true }
    },
    robber: {
        instructions: `Robber, you must choose another player and swap cards with them. You will then see your new card.`,
        actionNeeded: { player: true, self: false, optional: false }
    },
    witch: {
        instructions: `Witch, you may look at a center card. If you do, you must swap that card with any player of your choice (possibly your own).`,
        actionNeeded: { player: false, self: false, optional: true, center: true }
    },
    witchSwaps: {
        instructions: `Witch, you must now choose whose card to swap with the card you looked at.`,
        actionNeeded: { player: true, self: true, optional: false }
    },
    troublemaker: {
        instructions: `Troublemaker, choose two other players. Their cards will be swapped.`,
        actionNeeded: { player: 2, self: false, optional: true }
    },
    villageIdiot: {
        instructions: `Village Idiot, you may choose to move all other players' cards without a shield left or right. Select the direction desired or pass.`,
        actionNeeded: { player: false, self: false, optional: true, chooseLeftOrRight: true }
    },
    auraSeer: {
        instructions: `Aura Seer, prepare to receive the names of the players who looked at or moved cards so far (if any).`,
        actionNeeded: { player: false, self: false, optional: true }
    },
    drunk: {
        instructions: `Drunk, you must choose a center card. You will swap with this card without looking at it.`,
        actionNeeded: { player: false, self: false, optional: false, center: true }
    },
    insomniac: {
        instructions: `Insomniac, prepare to receive the name of your current role.`,
        actionNeeded: { player: false, self: false, optional: true }
    },
    squire: {
        instructions: `Squire, prepare to see the cards of the werewolf players you have identified (if any).`,
        actionNeeded: { player: false, self: false, optional: true }
    },
    beholder: {
        instructions: `Beholder, prepare to see the card of the seer you identified (if any).`,
        actionNeeded: { player: false, self: false, optional: true }
    },
    revealer: {
        instructions: `Revealer, you may choose a player whose card will be flipped. If it is a Werewolf, Tanner, or Vampire, it will be flipped back down and only you will know about it!`,
        actionNeeded: { player: true, self: false, optional: true }
    },
    curator: {
        instructions: `Curator, you may choose any player. That player will receive a random artifact, and only that player will know which artifact.`,
        actionNeeded: { player: true, self: true, optional: true }
    },
};

@autobind
export default class PlayArea extends Component {
    state = {
        tab: 0,
        currentTarget: null,
        readyAt: moment().add(random(5, 10), 's').valueOf(),
    };

    componentDidMount() {
        if (!this.props.me.ready) {
            this.timer = setInterval(() => this.forceUpdate(), 500);
        }
        window.addEventListener('resize', this.resizeToFit);
        this.resizeToFit();
        this.calculateRoles();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeToFit);
    }

    componentWillReceiveProps(nextProps) {
        const { me } = this.props;

        if (me.ready && !nextProps.me.ready) {
            this.setState({
                readyAt: moment().add(random(1, 5), 's').valueOf()
            });
            this.timer = setInterval(() => this.forceUpdate(), 500);
        } else if (!me.ready && nextProps.me.ready) {
            clearInterval(this.timer);
        }
    }

    componentDidUpdate() {
        this.resizeToFit();
    }

    render() {
        const { game, me } = this.props;

        const progress = (game.order.indexOf(game.mode) + 1 / game.order.length) * 100;

        const itsMyTurn = !me.ready && (game.mode === me._private.role ||
            (['paranormalInvestigator', 'witch'].includes(me._private.role) && game.mode.indexOf(me._private.role) === 0) ||
            (me._private.role === 'doppleganger' && game.mode.indexOf('doppleganger' + me._private.doppleganger) === 0));
        const color = itsMyTurn ? styles.actionNeeded : {};

        const submode = me._private.role === 'doppleganger' &&
        game.mode !== 'doppleganger' &&
        game.mode.indexOf('doppleganger') === 0 ?
            game.mode.replace('doppleganger', '') :
            game.mode;

        let instructions = 'Wait...';
        let actionNeeded = null;

        if (game.mode === 'day') {
            instructions = `When you are ready, tap the name of the player who you want to vote to kill. No one will see
            who you voted for until the game is over. You can change your vote at any time until the last person has voted.`;
        } else if (game.mode === 'gameover') {
            instructions = `The game is over! `;

            if (!game.winners.length) {
                instructions += `No one won! `;
            } else {
                const winnersNames = game.winners.map(winnerId => game._players.find(player => player.id === winnerId).name);
                instructions += `${winnersNames.join(', ')} won! `;
            }

            if (!game.deadPlayers.length) {
                instructions += `No one died! `;
            } else {
                const deadPlayersNames = game.deadPlayers.map(player => game._players.find(p => p.id === player.id).name);
                instructions += `${deadPlayersNames.join(', ')} died. `;
            }

            instructions += `Everyone's roles and other info are visible below.`;
        } else if (itsMyTurn) {
            instructions = roleDetails[submode].instructions;
            actionNeeded = roleDetails[submode].actionNeeded;
        }

        let main = <Board players={game._players} game={game} me={me}
                          onClickCard={this.onClickCard.bind(this, actionNeeded)}/>;
        if (this.state.tab === 1) {
            main = <Info roles={this.roles} order={game.order.filter(
                order => !['day',
                    'witchSwaps',
                    'paranormalInvestigator2',
                    'dopplegangerparanormalInvestigator2',
                    'dopplegangerwitchSwaps'].includes(order))}/>;
        } else if (this.state.tab === 2) {
            main = 'Coming soon...';
        }

        const secondsLeft = moment(this.state.readyAt).diff(moment(), 's');
        const readyButton = !actionNeeded && !me.ready && game.mode !== 'day' && game.mode !== 'gameover' && <FlatButton
                disabled={secondsLeft >= 0}
                label={secondsLeft < 0 ? 'Ready' : moment.duration(secondsLeft, 's').humanize()}
                primary={true}
                onTouchTap={this.onDoNothing}
            />;

        const passButton = actionNeeded && actionNeeded.optional &&
            <FlatButton label="Do Nothing" primary={true} onTouchTap={this.onDoNothing}/>;

        const leftAndRightButtons = actionNeeded && actionNeeded.chooseLeftOrRight && [
                <FlatButton
                    label="Move Cards Left"
                    primary={true}
                    onTouchTap={this.onMoveLeft}
                />,
                <FlatButton
                    label="Move Cards Right"
                    primary={true}
                    onTouchTap={this.onMoveRight}
                />,
            ];

        return (
            <div ref={node => this.node = node}>
                <div style={styles.wrapper}>
                    <LinearProgress mode="determinate" value={progress}/>
                    <Paper zDepth={4} style={{ ...styles.instructions, ...color }}>
                        {instructions}{passButton}{leftAndRightButtons}{readyButton}
                    </Paper>
                    {main}
                </div>
                <Paper zDepth={1} style={styles.bottomNavigaiton}>
                    <BottomNavigation selectedIndex={this.state.tab}>
                        <BottomNavigationItem label="Main" icon={<FontIcon className="fa fa-clone"/>}
                                              onTouchTap={() => this.setState({ tab: 0 })}/>
                        <BottomNavigationItem label="Info" icon={<FontIcon className="fa fa-info"/>}
                                              onTouchTap={() => this.setState({ tab: 1 })}/>
                        <BottomNavigationItem label="Log" icon={<FontIcon className="fa fa-hand-stop-o"/>}
                                              onTouchTap={() => this.setState({ tab: 2 })}/>
                    </BottomNavigation>
                </Paper>
            </div>
        );
    }

    onClickCard(actionNeeded, card) {
        const isCenter = card.toString().length === 1;
        let data = null;

        if (!actionNeeded) {
            data = { target: card };
        } else if ((typeof actionNeeded.player === 'boolean' && !isCenter) || (typeof actionNeeded.center === 'boolean' && isCenter)) {
            data = { target: card };
        } else if (typeof actionNeeded.player === 'number' || typeof actionNeeded.center === 'number') {
            if (this.state.currentTarget && (isCenter ? this.state.currentTarget.toString().length === 1 : this.state.currentTarget.toString().length > 1)) {
                data = {
                    target1: this.state.currentTarget,
                    target2: card
                };
            } else {
                this.setState({ currentTarget: card });
            }
        }

        if (data) {
            this.sendAction(data);
        }
    }

    sendAction(data) {
        this.props.onSendAction(data);
    }

    onDoNothing() {
        this.sendAction();
    }

    onMoveLeft() {
        this.sendAction({ target: 'reverse' });
    }

    onMoveRight() {
        this.sendAction({ target: 'right' });
    }

    resizeToFit() {
        if (this.node) {
            this.node.style.height = (window.innerHeight - 110) + "px";
        }
    }

    calculateRoles() {
        const { game } = this.props;

        this.roles = roles.filter(role => game.options[role.name]);

        if (game.options.werewolves) {
            times(game.options.werewolves, () => this.roles.push({
                label: 'Werewolf',
                description: 'Knows the other werewolves.'
            }));
        }
        if (game.options.villagers) {
            times(game.options.villagers, () => this.roles.push({
                label: 'Villager',
                description: 'Want a werewolf to die.'
            }));
        }
    }
}