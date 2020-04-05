const firebase = require('firebase');

exports.createNewUser = function (userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).set({
      username: name,
      email: email,
      profile_picture : imageUrl
  }).then (function (value) {
      return true
  },function (error){
    return false
  })
}; 

exports.createNewOrder = async function ( restaurantId, tableId, userId ) {
  var path = "orders/" + restaurantId + "/" + tableId + "/orders";
  var orderId = getPushKey(path)
  var order = {
    id : orderId,
    owner : userId,
    restaurant : restaurantId,
    table : tableId,
    activeUsers :  { },
    suborders : { }
  }
  order.activeUsers[userId] = "active"
  order.suborders[userId] = { status : "open" }
  var updates = {}
  updates["orders/" + restaurantId + "/" + tableId + "/activeOrder"] = orderId;
  updates[path + "/" + orderId] = order;
  var v = await update(updates);
  if (v == true )
  {
    return order;
  }

  return v;
}

exports.createJoinTableRequest = async function (restaurantId, tableId, userId, orderId) {
  var requestId = getPushKey("requests/joinTable/" + restaurantId + "/" + tableId )
  var ownerId = await read ("orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/owner");
  var request = {
    id : requestId,
    type : "joinTable",
    requirer : userId,
    aprover : ownerId,
    order : orderId
  }
  var updates = {}
  updates["requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId] = request;
  updates["orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/joinRequests/" + requestId ] = true;
  var v = await update(updates);
  if(v == true) 
  {
    return request;
  }
  return v;
}

exports.checkTableIfFree = async function(restaurantId, tableId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/activeOrder";
  var active = await read(path);
  if(active == null)
    return true
  else
    return active
}

exports.readTest = async function () {
  var json = await read("users/Niko")
  console.log(json)

  if(json == null)
    console.log("null")
  else
    console.log(json)
    console.log(json.email, json.profile_picture)
}

function read (path) {
   return firebase.database().ref(path).once('value').then(function (snapshot) {
    var data = snapshot.val() || null; 
    return data;
  }, function (error){
    console.log("Couldnt read data on path :" + path);
    return null;
  });
}

function update (updates) {
  return firebase.database().ref().update(updates, function(a) {
    console.log(updates)
  }).catch(function(error){
    console.log("error");
    return false;
  }).then(function (value){
    console.log(value)
    return true;
  }, function (error){
    console.log(error);
    return false
  });
}

function getPushKey (path) {
  var newPostKey = firebase.database().ref().child('posts').push().key;
  return newPostKey;
}