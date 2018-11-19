const got = require('got');
const GA_TRACKING_ID = 'UA-128984916-1';

module.exports = function (category, action, label, value) {
    return (req, res, next) => {
        trackEvent(category, action, label, value)
            .then(result => console.log('Event tracked, result : ', result))
            .catch(error => console.log('TRACKING ERROR : ', error));
        next();
    }
}

function trackEvent(category, action, label, value) {
    const data = {
        // API Version.
        v: '1',
        // Tracking ID / Property ID.
        tid: GA_TRACKING_ID,
        // Anonymous Client Identifier. Ideally, this should be a UUID that
        // is associated with particular user, device, or browser instance.
        cid: '555',
        // Event hit type.
        t: 'event',
        // Event category.
        ec: category,
        // Event action.
        ea: action,
        // Event label.
        el: label,
        // Event value.
        ev: value
    };

    return got.post('http://www.google-analytics.com/collect', {
        form: data
    });
}