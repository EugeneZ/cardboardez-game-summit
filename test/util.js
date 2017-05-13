module.exports.playerStub = function (id, role, other) {
    return {
        id,
        _hidden: {
            role,
        },
        _private: {
            peeked: {},
        },
        ...other,
    };
};