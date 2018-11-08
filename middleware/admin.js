
module.exports = function (req, res, next) {

    if (req.user.isAdmin === true) {
        next();
        return;
    }
    res.status(403).send("Permission denied");
}