module.exports = Server;

var util = require("../util/minimal");

// Extends EventEmitter
(Server.prototype = Object.create(util.EventEmitter.prototype)).constructor = Server;

function Server(rpcServerImpl) {

    if (typeof rpcServerImpl !== "object")
        throw TypeError("rpcServerImpl must be an object");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {?RPCImpl}
     */
    this.rpcServerImpl = rpcServerImpl;
}

/**
 * Calls a server method through {@link rpc.Server#rpcServerImpl|rpcServerImpl}.
 * @param {rpc.ServerMethod} static method
 * @param {function} requestCtor Request constructor
 * @param {function} responseCtor Response constructor
 * @param {Message|Object} request Request message or plain object
 * @param {rpc.ServerMethodCallback} callback server callback
 * @returns {undefined}
 */
Server.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if(!self.rpcServerImpl[method] || typeof self.rpcServerImpl[method] !== "function"){
      return callback("Method " + method + " not implemented");
    }

    try {
        request = requestCtor.decode(request);
        request = requestCtor.toObject(request, {longs: Number, enums: String, bytes: Array, defaults: true});
        self.rpcServerImpl[method](request, function rpcCallback(err, response){

          if (err) {
              self.emit("error", err, method);
              return callback(err);
          }

          if (response === null) {
              return undefined;
          }

          var notVerified = responseCtor.verify(response);
          if (notVerified) {
            return callback("InvalidResponse: " + notVerified);
          }

          try {
              response = responseCtor.encode(response).finish();
          } catch (err) {
              self.emit("error", err, method);
              return callback(err);
          }

          self.emit("data", response, method);
          return callback(null, response);
        }, responseCtor.verify);
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};
