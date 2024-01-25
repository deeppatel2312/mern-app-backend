const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Admin = db.admin;

verifyToken = (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }

    token = token.replace("Bearer ", "");

    jwt.verify(token,
        config.secret,
        async (err, decoded) => {
            if (err) {
                return res.status(401).send({
                    message: "Unauthorized! Token expired.",
                });
            }

            req.personId = decoded.id;

            // NOTE: here personType refers to admin or user/provider, not to be confused with user or provider.
            let user, personType = 'user';
            user = await User.findById(decoded.id);

            if (!user) {
                user = await Admin.findById(decoded.id);

                if (user) {
                    personType = 'admin';
                }
            }

            if (personType == 'user' && (user.token != token || !user.token)) {
                return res.status(401).send({
                    status: false,
                    message: "Log in on One Device Only.",
                });
            }

            if (personType == 'user' && (user && !user.isActive)) {
                return res.status(400).send({
                    message: "Account is blocked",
                });
            }
            next();
        });
};

const authJwt = {
    verifyToken
};
module.exports = authJwt;
