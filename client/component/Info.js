import React, { Component } from 'react';
import { Paper } from 'material-ui';
import { Subheader } from 'material-ui';
import { Divider } from 'material-ui';

const styles = {
    container: {
        display: 'flex'
    },
    roleContainer: {
        margin: 10,
        width: '70%'
    },
    orderContainer: {
        margin: 10,
        width: '20%'
    },
    lineItem: {
        margin: 10
    }
};

export default class Info extends Component {
    render() {
        return (
            <div style={styles.container}>
                <Paper style={styles.roleContainer}>
                    <Subheader>Available Roles</Subheader>
                    {this.props.roles.map(
                        role => <div>
                            <div style={styles.lineItem}><strong>{role.label}</strong><br/>{role.description}</div>
                            <Divider/></div>
                    )}
                </Paper>
                <Paper style={styles.orderContainer}>
                    <Subheader>Night Order</Subheader>
                    {this.props.order.map(
                        order => <div>
                            <div style={styles.lineItem}>{order}</div>
                            <Divider/></div>
                    )}
                </Paper>
            </div>
        );
    }
}