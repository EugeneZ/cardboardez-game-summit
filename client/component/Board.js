import React, { Component } from 'react';
import times from 'lodash/times';

import Player from './Player';

const circleSize = 70,
      unit = 'vw';

const styles = {
    container: {
        fontFamily: 'Roboto, sans-serif',
        position: 'relative'
    },
    board: {
        position: 'relative',
        width:  circleSize.toString() + unit,
        height: circleSize.toString() + unit,
        padding: 0,
        borderRadius: '50%',
        listStyle: 'none',
        margin: '3em auto 5em',
        border: 'solid 5px tomato'
    },
    centerWrapper: {
        position: 'absolute',
        margin: '0 auto',
        top: '16vw',
        left: '50vw',
        marginLeft: '-2.5vw',
        minWidth: '5vw'
    }
};

export default class Board extends Component {
    componentWillMount() {
        this.playerStyles = this.buildPlayerStyles();
    }

    componentWillUpdate(nextProps) {
        if (this.props.players.length !== nextProps.players.length || this.props.game.centerCount !== nextProps.game.centerCount) {
            this.playerStyles = this.buildPlayerStyles();
        }
    }

    render() {
        return (
            <div style={styles.container}>
                <div style={styles.board}>
                    {this.props.players.map((player, i) => {
                        const isSelf = this.props.me.id === player.id;
                        return <Player
                            key={i}
                            onClick={() => this.props.onClickCard(player.id)}
                            name={isSelf ? 'You' : player.name}
                            role={player.role ? player.role : isSelf ? player._private.role : this.props.me._private.peeked[player.id]}
                            known={this.props.me._private.knows.includes(player.id)}
                            shield={player.shield}
                            artifact={isSelf ? player._private.artifact : player.artifact}
                            style={this.playerStyles[i]}
                        />;
                    })}
                </div>
                <div style={styles.centerWrapper}>
                    {times(this.props.game.centerCount, i => {
                        let name = i === 0 ? "Left" : i === 1 ? "Center" : i === 2 ? "Right" : "Alpha Wolf's";
                        return <Player
                            onClick={() => this.props.onClickCard(i)}
                            name={name}
                            role={this.props.me._private.peeked[i]}
                            style={{ marginBottom: 10 }}
                        />;
                    })}
                </div>
            </div>
        );
    }

    buildPlayerStyles() {
        const itemSize = 80,
              angle = 360 / this.props.players.length;

        return times(this.props.players.length, i => ({
            display: 'block',
            position: 'absolute',
            top:  '50%',
            left: '50%',
            width:  itemSize,
            height: itemSize,
            margin: -(itemSize / 2) - 6,
            transform: `rotate(${angle * i}deg) translate(${circleSize / 2}${unit}) rotate(-${angle * i}deg)`
        }));
    }
}