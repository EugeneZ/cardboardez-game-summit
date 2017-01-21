import React, { Component } from 'react';

const styles = {
    container: {
        backgroundColor: 'white',
        border: '1px solid #333',
        borderRadius: 5,
        padding: 5
    },

    name: {

    },

    role: {

    },

    known: {

    },

    shield: {

    },

    artifact: {

    }
};

export default class Player extends Component {
    render() {
        const clickable = !this.props.shield;
        return (
            <div style={{...styles.container, ...this.props.style}} onClick={clickable ? this.props.onClick : ()=>{}}>
                <strong style={styles.name}>{this.props.name}</strong>
                {this.props.role && <div style={styles.role}>{this.props.role}</div>}
                {this.props.known && <div style={styles.known}>known to you</div>}
                {this.props.shield && <div style={styles.shield}>shielded</div>}
                {this.props.artifact && <div style={styles.artifact}>{typeof this.props.artifact === 'string' ? this.props.artifact : 'artifact'}</div>}
            </div>
        );
    }
}