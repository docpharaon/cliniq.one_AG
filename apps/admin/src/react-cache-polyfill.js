// Patch React.cache before anything else loads
// This runs via NODE_OPTIONS=--require before the Next.js build
const React = require('react');
if (typeof React.cache !== 'function') {
    React.cache = function cache(fn) {
        return fn;
    };
}
