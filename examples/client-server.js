var protos = null;
try {
  protos = require('./protos');
}catch(err){
  console.warn("Error requiring protos, did you run \"npm run example:gen\"?");
  process.exit();
}
var UsersServer = protos.satchel.UsersServer;
var UsersClient = protos.satchel.UsersClient;

var handlers = UsersServer.create({
  GetUsers: function(ctx, req, cb){
    console.log("Server GetUsers Handler CTX:", ctx);
    console.log("Server GetUsers Handler Req:", req);
    var resp = {users: [{Name:"Satchy"}]};
    console.log("Server GetUsers Handler Resp:", resp);
    cb(null, resp);
  }
});

function server(name, req){
  var ctx = {User: "mock"};
  console.log("Server Router CTX:", ctx);
  console.log("Server Router Method:", name);
  console.log("Server Router Req:", req);
  return handlers[name](ctx, req);
}

var client = UsersClient.create(function(name, req, cb){
  console.log("Client RPC Handler Method:", name)
  console.log("Client RPC Handler Buffer:", req);

  server(name, req)
  .then(function(resp){
    console.log("Client RPC Handler Response Buffer:", resp);
    cb(null, resp);
  })
  .catch(function(err){
    console.log("Client RPC Handler Response Error:", err);
    cb(err);
  });

})

var creq = {Max: 15};
console.log("Client request", creq);
client.getUsers(creq)
.then(function(res){
  console.log("Client response:", res);
})
.catch(function(err){
  console.error("Client error:", err);
});
