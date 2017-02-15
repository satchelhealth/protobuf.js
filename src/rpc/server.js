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
Server.prototype.rpcCall = function rpcCall(meta, requestCtor, responseCtor, request, callback) {
    var self = this;

    var lcMethod = meta.method.substring(0, 1).toLowerCase() + meta.method.substring(1);
    var impl = self.rpcServerImpl[meta.method] || self.rpcServerImpl[lcMethod];

    if (!request)
        throw TypeError("request must be specified");

    if (!callback)
        return util.asPromise(rpcCall, self, meta, requestCtor, responseCtor, request);

    if(!impl || typeof impl !== "function"){
      return callback("Method " + meta.method + " not implemented");
    }

    try {
        request = requestCtor.decode(request);
        request = requestCtor.toObject(request, {longs: Number, bytes: Array, defaults: true});

        // enable Promise implementations of impl
        if (impl.length == 2) {
          impl = function(ctx, req, cb) {
            impl(ctx, req)
              .then((response) => {
                cb(null, response);
              })
              .catch((error) => {
                cb(error);
              })
          }
        }

        return impl(meta.ctx, request, function rpcCallback(err, response){

          if (err) {
              self.emit("error", err, meta.method);
              return callback(err);
          }

          if (response === null) {
              return undefined;
          }

          try {
              response = responseCtor.encode(response).finish();
          } catch (err) {
              self.emit("error", err, meta.method);
              return callback(err);
          }

          self.emit("data", response, meta.method);
          return callback(null, response);
        });
    } catch (err) {
        self.emit("error", err, meta.method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};
