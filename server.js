#!/bin/env node
//  Tech-radar
require('console-stamp')(console, '[ddd mmm dd HH:MM:ss]]');

var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var users = require('./dao/users');

var bodyParser = require('body-parser');

var cache = require('./dao/cache.js');

var passport = require('passport');
var Strategy = require('passport-local').Strategy;

var routes = require('./routes.js');
var apiroutes = require('./api-routes.js');


passport.use(new Strategy(
    function (username, password, cb) {
        users.findByUsername(username, function (err, user) {
            if (err) {
                return cb(err);
            }
            if (!user) {
                return cb(null, false);
            }
            if (user.password != password) {
                return cb(null, false);
            }
            return cb(null, user);
        });
    }));

passport.serializeUser(function (user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
    users.findById(id, function (err, user) {
        if (err) {
            return cb(err);
        }
        cb(null, user);
    });
});


/**
 *  Define the application.
 */
var TechRadar = function () {

    //  Scope.
    var self = this;
    
    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function () {
        //  Set the environment variables we need.
        self.port = process.env.PORT || 8090;
    };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
            process.on(element, function () {
                self.terminator(element);
            });
        });
    };



    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initialize = function () {
        self.setupVariables();
        self.setupTerminationHandlers();

        self.app = express();

        self.app.set('view engine', 'ejs');

        self.app.use(cookieParser());
        // self.app.use(bodyParser );
        self.app.use(bodyParser.json());
        self.app.use(bodyParser.urlencoded({
            extended: true
        }));


        self.app.use(session({secret: 'myothersecretkeyforthiscookie'}));


        // Browser Cache
        var oneDay = 86400000;
        self.app.use('/', express.static('public', {maxAge: oneDay}));

        // Initialize Passport and restore authentication state, if any, from the
        // session.
        self.app.use(passport.initialize());
        self.app.use(passport.session());

        // update the cache
        cache.refresh(self.app);


        // Create all the routes and refresh the cache
        routes.createRoutes(self);
        apiroutes.createRoutes(self);


    };

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function () {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, function () {
            console.log('%s: Node server started on %s:%d ...',
                Date(Date.now()), self.port);
        });
    };

};




/**
 *  main():  Main code.
 */
var radarApp = new TechRadar();
radarApp.initialize();
radarApp.start();