"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var ssh2_1 = __importDefault(require("ssh2"));
function copy(obj) {
    return Object.assign({}, obj);
}
function connectOpts(opts) {
    return Object.keys(opts).filter(function (key) { return key !== 'host'; }).reduce(function (a, c) { return a[c] = opts[c]; }, {});
}
function omit(obj, keys) {
    return Object.entries(obj).filter(function (entry) { return entry[0] !== 'host'; }).reduce(function (a, _a) {
        var key = _a[0], value = _a[1];
        return a[key] = value;
    }, {});
}
var Connection = /** @class */ (function (_super) {
    __extends(Connection, _super);
    function Connection(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this.options = options;
        // default state is closed
        _this._state = "closed";
        _this.proxyOpts = options.proxy ? copy(options.proxy) : undefined;
        if (_this.proxyOpts && !_this.proxyOpts.privateKey && options.privateKey) {
            _this.proxyOpts.privateKey = options.privateKey;
            if (options.passphrase) {
                _this.proxyOpts.passphrase = options.passphrase;
            }
        }
        _this.on('ready', function () {
            _this._state = "authenticated";
        });
        _this.connect();
        return _this;
    }
    /**
     * Connects using the constructed configuration, takes into acount the proxying
     */
    Connection.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connection, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.createTunnelConnection()];
                    case 1:
                        connection = _a.tunnel = _c.sent();
                        if (!(this.proxyOpts && this.proxyOpts.host && this.proxyOpts.port)) return [3 /*break*/, 3];
                        _b = this;
                        return [4 /*yield*/, this.createProxyConnection()];
                    case 2:
                        // now we listen for connection and then netcat, then reassign connection to the new ssh session, then profit
                        connection = _b.proxiedSession = _c.sent();
                        _c.label = 3;
                    case 3:
                        this.emit('ready', connection);
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    Object.defineProperty(Connection.prototype, "connection", {
        /**
         * Returns the target connection
         */
        get: function () {
            return this.proxiedSession || this.tunnel;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Creates a proxied SSH session using netcat
     */
    Connection.prototype.createProxyConnection = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.proxyOpts)
                return reject(new Error("Cannot create proxy without proxyOpts"));
            var _a = _this.proxyOpts, host = _a.host, port = _a.port;
            if (!host || !port)
                return reject(new Error("Cannot create proxy without host and port"));
            var proxiedSession = new ssh2_1.default.Client();
            // run netcat to get an ssh stream over stdio
            _this.tunnel.exec("nc " + host + " " + port, function (err, stream) {
                if (err) {
                    reject(err);
                    return _this.tunnel.end();
                }
                // we have the stream, pass it on to ssh2 and resolve it!
                _this.proxyOpts.sock = stream;
                proxiedSession.on('error', reject);
                proxiedSession.once('ready', function () {
                    proxiedSession.removeListener('error', reject);
                    proxiedSession.on('error', _this.emit.bind(_this, 'error'));
                    resolve(proxiedSession);
                });
                proxiedSession.connect(omit(_this.proxyOpts, ["host", "proxy"]));
            });
        });
    };
    /**
     * Creates a standard SSH session using ssh
     */
    Connection.prototype.createTunnelConnection = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var tunnel = new ssh2_1.default.Client();
            tunnel.on('error', reject);
            tunnel.once('ready', function () {
                tunnel.removeListener('error', reject);
                tunnel.on('error', _this.emit.bind(_this, 'error'));
                resolve(tunnel);
            });
            tunnel.connect(_this.options);
        });
    };
    return Connection;
}(events_1.EventEmitter));
exports.Connection = Connection;
